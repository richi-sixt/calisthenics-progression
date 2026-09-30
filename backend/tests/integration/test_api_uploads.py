"""Integration tests for the image upload endpoint."""

import io
import os

import pytest
from PIL import Image
from project import db
from project.models import UploadedImage

URL = "/api/v1/uploads/images"


@pytest.fixture(autouse=True)
def image_dir(app, tmp_path):
    """Store uploads in a temp dir instead of project/static."""
    app.config["EXERCISE_IMAGE_DIR"] = str(tmp_path)
    return tmp_path


@pytest.fixture
def upload_headers(api_headers):
    """Auth headers without the JSON Content-Type (the client sets multipart)."""
    return {"Authorization": api_headers["Authorization"]}


def _image_bytes(fmt="JPEG", size=(800, 600), mode="RGB", color="red", **save_kwargs):
    buf = io.BytesIO()
    Image.new(mode, size, color).save(buf, fmt, **save_kwargs)
    buf.seek(0)
    return buf


def _upload(client, headers, data, filename="photo.jpg"):
    return client.post(
        URL,
        headers=headers,
        data={"image": (data, filename)},
        content_type="multipart/form-data",
    )


class TestApiUploadImage:
    def test_upload_jpeg_returns_webp_url(
        self, client, upload_headers, image_dir, app, user
    ):
        resp = _upload(client, upload_headers, _image_bytes())
        assert resp.status_code == 201
        data = resp.get_json()["data"]
        assert data["url"] == f"/static/exercise_images/{data['filename']}"
        assert data["filename"].endswith(".webp")

        path = image_dir / data["filename"]
        with Image.open(path) as img:
            assert img.format == "WEBP"
            assert img.size == (800, 600)

        with app.app_context():
            row = db.session.get(UploadedImage, data["id"])
            assert row.user_id == user.id

    def test_large_image_is_downsized(self, client, upload_headers, image_dir):
        resp = _upload(client, upload_headers, _image_bytes(size=(4000, 3000)))
        assert resp.status_code == 201
        with Image.open(image_dir / resp.get_json()["data"]["filename"]) as img:
            assert max(img.size) == 1600
            assert img.size == (1600, 1200)

    def test_metadata_is_stripped_and_orientation_applied(
        self, client, upload_headers, image_dir
    ):
        exif = Image.Exif()
        exif[0x0112] = 6  # Orientation: rotate 90° clockwise to display
        exif[0x8825] = {2: (47.0, 22.0, 0.0)}  # GPSInfo: latitude
        resp = _upload(
            client, upload_headers, _image_bytes(size=(800, 600), exif=exif.tobytes())
        )
        assert resp.status_code == 201
        with Image.open(image_dir / resp.get_json()["data"]["filename"]) as img:
            # Orientation baked into the pixels, so width/height are swapped.
            assert img.size == (600, 800)
            assert not img.getexif()
            assert "exif" not in img.info
            assert "xmp" not in img.info

    def test_png_with_transparency_keeps_alpha(self, client, upload_headers, image_dir):
        resp = _upload(
            client,
            upload_headers,
            # Half-transparent: WebP drops the alpha channel if fully opaque.
            _image_bytes("PNG", mode="RGBA", color=(255, 0, 0, 128)),
            filename="a.png",
        )
        assert resp.status_code == 201
        with Image.open(image_dir / resp.get_json()["data"]["filename"]) as img:
            assert img.mode == "RGBA"

    def test_missing_file(self, client, upload_headers):
        resp = client.post(
            URL, headers=upload_headers, data={}, content_type="multipart/form-data"
        )
        assert resp.status_code == 400

    def test_non_image_rejected_and_nothing_stored(
        self, client, upload_headers, image_dir, app
    ):
        resp = _upload(
            client, upload_headers, io.BytesIO(b"not an image"), filename="x.jpg"
        )
        assert resp.status_code == 400
        assert os.listdir(image_dir) == []
        with app.app_context():
            assert db.session.scalar(db.select(db.func.count(UploadedImage.id))) == 0

    def test_unsupported_format_rejected(self, client, upload_headers, image_dir):
        resp = _upload(client, upload_headers, _image_bytes("BMP"), filename="x.bmp")
        assert resp.status_code == 400
        assert os.listdir(image_dir) == []

    def test_too_large_body_returns_413(self, client, upload_headers, app):
        app.config["MAX_CONTENT_LENGTH"] = 1024
        resp = _upload(client, upload_headers, _image_bytes())
        assert resp.status_code == 413
        assert resp.get_json()["error"] == "File too large."

    def test_per_user_limit(self, client, upload_headers, app):
        app.config["EXERCISE_IMAGE_MAX_PER_USER"] = 1
        assert _upload(client, upload_headers, _image_bytes()).status_code == 201
        resp = _upload(client, upload_headers, _image_bytes())
        assert resp.status_code == 400
        assert "limit" in resp.get_json()["error"]

    def test_requires_auth(self, client):
        resp = _upload(client, {}, _image_bytes())
        assert resp.status_code == 401

    def test_requires_confirmed(self, client, api_headers_unconfirmed):
        headers = {"Authorization": api_headers_unconfirmed["Authorization"]}
        resp = _upload(client, headers, _image_bytes())
        assert resp.status_code == 403

    def test_delete_account_removes_images(
        self, client, upload_headers, api_headers, image_dir, app
    ):
        filename = _upload(client, upload_headers, _image_bytes()).get_json()["data"][
            "filename"
        ]
        assert (image_dir / filename).exists()

        resp = client.delete("/api/v1/auth/account", headers=api_headers)
        assert resp.status_code == 200
        assert not (image_dir / filename).exists()
        with app.app_context():
            assert db.session.scalar(db.select(db.func.count(UploadedImage.id))) == 0
