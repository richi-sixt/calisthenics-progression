"""Tests for `flask images cleanup-orphans`."""

import os
import time
from datetime import datetime, timedelta, timezone

import pytest

from project import db
from project.models import ExerciseDefinition, UploadedImage


def _name(n: int) -> str:
    return f"{n:032x}.webp"


@pytest.fixture(autouse=True)
def image_dir(app, tmp_path):
    app.config["EXERCISE_IMAGE_DIR"] = str(tmp_path)
    return tmp_path


def _add_image(app, image_dir, user_id, n, age_hours=48, write_file=True):
    """Create an UploadedImage row (and file) `age_hours` old."""
    filename = _name(n)
    if write_file:
        path = image_dir / filename
        path.write_bytes(b"webp")
        old = time.time() - age_hours * 3600
        os.utime(path, (old, old))
    with app.app_context():
        image = UploadedImage(filename=filename, user_id=user_id)
        image.created_at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(
            hours=age_hours
        )
        db.session.add(image)
        db.session.commit()
    return filename


def _add_exercise(app, user_id, description, title="Ex"):
    with app.app_context():
        db.session.add(
            ExerciseDefinition(title=title, description=description, user_id=user_id)
        )
        db.session.commit()


def _filenames(app):
    with app.app_context():
        return set(db.session.scalars(db.select(UploadedImage.filename)))


def _run(app, *args):
    return app.test_cli_runner().invoke(args=["images", "cleanup-orphans", *args])


class TestCleanupOrphans:
    def test_dry_run_reports_but_keeps_everything(self, app, user, image_dir):
        orphan = _add_image(app, image_dir, user.id, 1)

        result = _run(app)

        assert result.exit_code == 0, result.output
        assert "Unreferenced uploads: 1" in result.output
        assert orphan in result.output
        assert "Dry run" in result.output
        assert (image_dir / orphan).exists()
        assert _filenames(app) == {orphan}

    def test_delete_removes_unreferenced_keeps_referenced(self, app, user, image_dir):
        used = _add_image(app, image_dir, user.id, 1)
        orphan = _add_image(app, image_dir, user.id, 2)
        _add_exercise(app, user.id, f"# How\n\n![Bild](/static/exercise_images/{used})")

        result = _run(app, "--delete")

        assert result.exit_code == 0, result.output
        assert (image_dir / used).exists()
        assert not (image_dir / orphan).exists()
        assert _filenames(app) == {used}

    def test_reference_from_another_users_exercise_counts(
        self, app, user, second_user, image_dir
    ):
        # e.g. second_user copied an exercise that embeds user's image
        shared = _add_image(app, image_dir, user.id, 1)
        _add_exercise(
            app, second_user.id, f"![x](/static/exercise_images/{shared})", "Copy"
        )

        _run(app, "--delete")

        assert (image_dir / shared).exists()
        assert _filenames(app) == {shared}

    def test_recent_uploads_are_protected(self, app, user, image_dir):
        # Uploaded into a form that hasn't been saved yet.
        recent = _add_image(app, image_dir, user.id, 1, age_hours=1)

        result = _run(app, "--delete")

        assert "Nothing to clean up." in result.output
        assert (image_dir / recent).exists()

    def test_min_age_hours_option(self, app, user, image_dir):
        recent = _add_image(app, image_dir, user.id, 1, age_hours=1)

        _run(app, "--delete", "--min-age-hours", "0")

        assert not (image_dir / recent).exists()
        assert _filenames(app) == set()

    def test_stray_file_without_row_is_removed(self, app, image_dir):
        stray = image_dir / _name(9)
        stray.write_bytes(b"webp")
        old = time.time() - 48 * 3600
        os.utime(stray, (old, old))
        unrelated = image_dir / "keep-me.txt"
        unrelated.write_text("not an upload")

        result = _run(app, "--delete")

        assert "Files without DB row: 1" in result.output
        assert not stray.exists()
        assert unrelated.exists()

    def test_row_with_missing_file_is_removed(self, app, user, image_dir):
        gone = _add_image(app, image_dir, user.id, 1, write_file=False)

        result = _run(app, "--delete")

        assert "DB rows with missing file: 1" in result.output
        assert gone in result.output
        assert _filenames(app) == set()

    def test_nothing_to_do(self, app):
        result = _run(app)
        assert result.exit_code == 0
        assert "Nothing to clean up." in result.output
