"""Flask CLI commands (run with `flask <group> <command>`)."""

import os
import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

import click
from flask import Flask
from flask.cli import AppGroup

from project import db
from project.api.upload_routes import delete_image_files, exercise_image_dir
from project.models import ExerciseDefinition, Report, UploadedImage, User

IMAGE_FILENAME = re.compile(r"[0-9a-f]{32}\.webp")
IMAGE_REFERENCE = re.compile(r"/static/exercise_images/([0-9a-f]{32}\.webp)")

images_cli = AppGroup("images", help="Manage uploaded exercise images.")
reports_cli = AppGroup("reports", help="Review user reports.")


@dataclass
class OrphanReport:
    """What `find_orphaned_images` found; nothing has been changed yet."""

    unreferenced: list[UploadedImage] = field(default_factory=list)
    missing_files: list[UploadedImage] = field(default_factory=list)
    stray_files: list[str] = field(default_factory=list)

    @property
    def is_empty(self) -> bool:
        return not (self.unreferenced or self.missing_files or self.stray_files)


def referenced_image_filenames() -> set[str]:
    """Filenames linked from any exercise description (all users, incl. archived).

    Copying an exercise copies its description, so an upload can be referenced
    from another user's exercise — never limit this to the uploader's own.
    """
    descriptions = db.session.scalars(
        db.select(ExerciseDefinition.description).where(
            ExerciseDefinition.description.contains("/static/exercise_images/")
        )
    )
    return {m for text in descriptions if text for m in IMAGE_REFERENCE.findall(text)}


def find_orphaned_images(min_age: timedelta) -> OrphanReport:
    """Collect uploads that are no longer needed and older than `min_age`.

    The age threshold protects images uploaded into a form that hasn't been
    saved yet (they aren't referenced by any description until the save).
    """
    # created_at is stored as naive UTC.
    cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - min_age
    referenced = referenced_image_filenames()
    directory = exercise_image_dir()
    report = OrphanReport()

    known: set[str] = set()
    for image in db.session.scalars(db.select(UploadedImage)):
        known.add(image.filename)
        if not os.path.exists(os.path.join(directory, image.filename)):
            report.missing_files.append(image)
        elif image.created_at < cutoff and image.filename not in referenced:
            report.unreferenced.append(image)

    if os.path.isdir(directory):
        cutoff_ts = cutoff.replace(tzinfo=timezone.utc).timestamp()
        for name in sorted(os.listdir(directory)):
            if not IMAGE_FILENAME.fullmatch(name) or name in known:
                continue
            if os.path.getmtime(os.path.join(directory, name)) < cutoff_ts:
                report.stray_files.append(name)
    return report


def delete_orphaned_images(report: OrphanReport) -> None:
    """Delete everything in the report: DB rows first, files after the commit."""
    rows = report.unreferenced + report.missing_files
    for image in rows:
        db.session.delete(image)
    db.session.commit()
    delete_image_files([image.filename for image in report.unreferenced])
    delete_image_files(report.stray_files)


@images_cli.command("cleanup-orphans")
@click.option(
    "--delete", "do_delete", is_flag=True, help="Actually delete (default: dry run)."
)
@click.option(
    "--min-age-hours",
    default=24,
    show_default=True,
    type=click.IntRange(min=0),
    help="Only touch uploads older than this (protects unsaved forms).",
)
def cleanup_orphans(do_delete: bool, min_age_hours: int) -> None:
    """Find (and with --delete remove) uploaded images no description uses."""
    report = find_orphaned_images(timedelta(hours=min_age_hours))

    click.echo(f"Unreferenced uploads: {len(report.unreferenced)}")
    for image in report.unreferenced:
        click.echo(
            f"  {image.filename}  user={image.user_id}  {image.created_at:%Y-%m-%d}"
        )
    click.echo(f"DB rows with missing file: {len(report.missing_files)}")
    for image in report.missing_files:
        click.echo(f"  {image.filename}  user={image.user_id}")
    click.echo(f"Files without DB row: {len(report.stray_files)}")
    for name in report.stray_files:
        click.echo(f"  {name}")

    if report.is_empty:
        click.echo("Nothing to clean up.")
    elif do_delete:
        delete_orphaned_images(report)
        click.echo("Deleted.")
    else:
        click.echo("Dry run - nothing deleted. Re-run with --delete to remove.")


@reports_cli.command("list")
@click.option("--all", "show_all", is_flag=True, help="Include resolved reports.")
def list_reports(show_all: bool) -> None:
    """List open reports (newest first)."""
    query = db.select(Report).order_by(Report.created_at.desc())
    if not show_all:
        query = query.filter_by(status="open")
    rows = db.session.scalars(query).all()
    for r in rows:
        reporter = db.session.get(User, r.reporter_id)
        reported = db.session.get(User, r.reported_user_id)
        click.echo(
            f"#{r.id} [{r.status}] {r.created_at:%Y-%m-%d %H:%M} "
            f"{r.target_type}:{r.target_id} reason={r.reason} "
            f"reporter={reporter.username if reporter else '?'} "
            f"reported={reported.username if reported else '?'}"
        )
        if r.details:
            click.echo(f"    {r.details}")
    if not rows:
        click.echo("No reports.")


@reports_cli.command("resolve")
@click.argument("report_id", type=int)
def resolve_report(report_id: int) -> None:
    """Mark a report as resolved."""
    report = db.session.get(Report, report_id)
    if report is None:
        raise click.ClickException(f"No report with id {report_id}.")
    report.status = "resolved"
    db.session.commit()
    click.echo(f"Report #{report_id} resolved.")


def register_commands(app: Flask) -> None:
    """Attach all CLI command groups to the app."""
    app.cli.add_command(images_cli)
    app.cli.add_command(reports_cli)
