"""API routes for image uploads used in Markdown (exercise descriptions)."""

import os
import secrets
from typing import IO, Iterable

from flask import current_app, g, jsonify, request
from flask.typing import ResponseReturnValue
from PIL import Image, ImageOps, UnidentifiedImageError
from project import db
from project.api import bp
from project.api.auth_utils import api_check_confirmed, api_login_required
from project.models import UploadedImage

# What Pillow reports for the files we accept (MPO = multi-picture JPEG that
# some phone cameras produce).
ALLOWED_FORMATS = {"JPEG", "MPO", "PNG", "WEBP", "GIF"}
# Refuse to decode anything larger (checked from the header, before decoding)
# so a small, highly compressed file can't blow up server memory.
MAX_PIXELS = 40_000_000


def exercise_image_dir() -> str:
    """Directory where uploaded exercise images are stored."""
    configured = current_app.config.get("EXERCISE_IMAGE_DIR")
    return configured or os.path.join(
        current_app.root_path, "static", "exercise_images"
    )


def delete_image_files(filenames: Iterable[str]) -> None:
    """Remove stored image files; missing files are ignored."""
    directory = exercise_image_dir()
    for filename in filenames:
        try:
            os.remove(os.path.join(directory, os.path.basename(filename)))
        except FileNotFoundError:
            pass


def _process_image(stream: IO[bytes], path: str, max_side: int) -> str | None:
    """Normalize an uploaded image and save it as WebP at `path`.

    Applies the EXIF orientation, downsizes to `max_side`, and re-encodes
    without any metadata (EXIF, GPS, XMP). Returns an error message, or None.
    """
    try:
        with Image.open(stream) as original:
            if original.format not in ALLOWED_FORMATS:
                return "Unsupported image type. Use JPEG, PNG, WebP or GIF."
            if original.width * original.height > MAX_PIXELS:
                return "Image dimensions are too large."
            img = ImageOps.exif_transpose(original)
            has_alpha = img.mode in ("RGBA", "LA") or (
                img.mode == "P" and "transparency" in img.info
            )
            img = img.convert("RGBA" if has_alpha else "RGB")
            img.thumbnail((max_side, max_side))
            # Drop all metadata carried over from the source file.
            img.info = {}
            img.save(path, "WEBP", quality=82, method=4)
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, ValueError):
        return "Could not read the image file."
    return None


@bp.route("/uploads/images", methods=["POST"])
@api_login_required
@api_check_confirmed
def api_upload_image() -> ResponseReturnValue:
    """Upload an image for use in Markdown; returns its URL path."""
    file = request.files.get("image")
    if file is None or not file.filename:
        return jsonify({"error": "No image file provided."}), 400

    user = g.current_api_user
    max_per_user = current_app.config["EXERCISE_IMAGE_MAX_PER_USER"]
    count = db.session.scalar(
        db.select(db.func.count(UploadedImage.id)).where(
            UploadedImage.user_id == user.id
        )
    )
    if count is not None and count >= max_per_user:
        return jsonify({"error": f"Image limit of {max_per_user} reached."}), 400

    directory = exercise_image_dir()
    os.makedirs(directory, exist_ok=True)
    filename = f"{secrets.token_hex(16)}.webp"
    path = os.path.join(directory, filename)

    err = _process_image(
        file.stream, path, current_app.config["EXERCISE_IMAGE_MAX_SIDE"]
    )
    if err:
        delete_image_files([filename])
        return jsonify({"error": err}), 400

    image = UploadedImage(filename=filename, user_id=user.id)
    db.session.add(image)
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        delete_image_files([filename])
        raise
    return jsonify({"data": image.to_dict()}), 201
