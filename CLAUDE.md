# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Python Flask web application for tracking calisthenics workouts. Users can create exercises, build workouts with sets/progressions/reps, follow other athletes, and send private messages.

**Stack:** Python 3.14.2, Flask 3.1.2, SQLAlchemy, SQLite/PostgreSQL, Bootstrap 3

## Common Commands

```bash
# Setup
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Run development server
export FLASK_APP=calisthenics_progression.py
export FLASK_ENV=development
flask run

# Database migrations
flask db migrate -m "Description"
flask db upgrade
flask db downgrade
```

## Architecture

### Application Factory Pattern
- Entry point: `calisthenics_progression.py`
- Factory function: `project/__init__.py` → `create_app()`
- Configuration: `project/config.py` (loads from `.env`)

### Blueprints
- `auth` (`/auth`) - Login, registration, password reset, email confirmation, profile editing
- `main` (no prefix) - Workouts, exercises, user profiles, messaging
- `errors` - Global 404/403/500 handlers

### Data Models (`project/models.py`)
- **User** - Authentication, profile, follow relationships
- **Workout** → **Exercise** → **Set** - Nested workout structure
- **Exercises** - User-created exercise definitions (separate from workout exercises)
- **Message** - User-to-user messaging
- **Notification** - User notifications with JSON payload
- `followers` association table for many-to-many user follows

### Key Utilities
- `project/token.py` - Token generation/validation using `itsdangerous` (1hr expiration)
- `project/decorators.py` - `@check_confirmed` decorator for email verification
- `project/email.py` - Async email sending with Flask-Mail

### Static Files
- CSS/JS: `project/static/css/`, `project/static/js/`
- Profile pictures: `project/static/profile_pics/` (auto-resized to 125x125px)
- Templates: `project/templates/` with `auth/`, `errors/`, `email/`, `partials/` subdirs

## Configuration

Required `.env` variables:
- `SECRET_KEY`, `WTF_CSRF_SECRET_KEY`, `SECURITY_PASSWORD_SALT`
- `DATABASE_URL` (SQLite or PostgreSQL)
- `MAIL_SERVER`, `MAIL_PORT`, `MAIL_USE_TLS`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_DEFAULT_SENDER`
- `FLASK_ENV` (development/production)

## Notes

- UI labels are in German
- No test suite or linting configuration exists
- Pagination: 10 items per page (configured in `config.py`)
