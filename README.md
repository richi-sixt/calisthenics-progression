# Calisthenics Progression

A Flask web application for tracking calisthenics workouts — built for learning purposes.\
Handcrafted in 2019 with inspiration from [Flask Mega Tutorial](https://github.com/miguelgrinberg/microblog-2018), now enhanced with the assistance of AI.

Log your training sessions, define custom exercises with progression levels and workout templates, and connect with other athletes.
This project demonstrates the full stack of a production-ready Flask app: authentication, ORM relationships, email flows, automated testing, and deployment.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | Python 3.14 |
| Framework | Flask 3.1 |
| ORM / Migrations | SQLAlchemy + Flask-Migrate (Alembic) |
| Auth / Forms | Flask-Login + Flask-WTF |
| Frontend | Bootstrap 5 + Jinja2 |
| Email | Flask-Mail |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Production server | Gunicorn + passenger_wsgi.py |
| Type checking | mypy |
| Code quality | black, flake8, isort, pre-commit |
| Testing | pytest + pytest-cov |

---

## Features

### Workout tracking

- Log workouts with multiple exercises, sets, and rep counts or duration values
- Create and use workout templates
- Select custom exercises with ordered progression levels (e.g. Tuck Planche → Straddle Planche → Full Planche)
- Browse and copy exercises from other athletes
- Select a progression level from a dropdown when logging a set
- Edit and delete workouts

### Exercise library

- Create and manage your own exercise definitions with progression levels

### Social

- Explore workouts from other athletes
- Follow / unfollow other users
- Private messaging between users
- Notification badge for unread messages

### Account

- Account registration with email confirmation
- Password reset via secure token link
- Profile picture upload
- Edit profile and change password
- Delete account

---

## Setup

### Prerequisites

- Python 3.14
- A virtual environment tool (venv, virtualenv, etc.)
- PostgreSQL, MySQL (optional — SQLite works out of the box for local dev)

### 1. Clone and install dependencies

```bash
git clone https://github.com/your-username/calisthenics-progression.git
cd calisthenics-progression
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-dev.txt   # dev tools + test dependencies
```

### 2. Create a `.env` file in the project root

```env
SECRET_KEY="a-hard-to-guess-secret-key"
WTF_CSRF_SECRET_KEY="another-secret-key"
SECURITY_PASSWORD_SALT="a-unique-salt-string"
FLASK_ENV="development"

# Database — SQLite is used automatically if DATABASE_URL is not set
DATABASE_URL="postgresql://localhost/calisthenics_dev"

# Email — required for registration confirmation and password reset
MAIL_SERVER="smtp.yourmailprovider.com"
MAIL_PORT="587"
MAIL_USE_TLS="1"
MAIL_USERNAME="your-username"
MAIL_PASSWORD="your-password"
MAIL_DEFAULT_SENDER="noreply@yourdomain.com"
```

> If `DATABASE_URL` is not set, the app falls back to `app.db` (SQLite) automatically via `config.py`.

### 3. Set Flask environment variables

```bash
export FLASK_APP=calisthenics_progression.py
export FLASK_ENV=development
```

### 4. Initialize the database

```bash
flask db init
flask db migrate -m "initial migration"
flask db upgrade
```

### 5. Run the development server

```bash
flask run
```

The app will be available at `http://127.0.0.1:5000`.

---

## Running Tests

Tests are configured in `pytest.ini` and run with coverage by default.

```bash
# Run all tests with coverage report
pytest

# Run only unit tests
pytest tests/unit/

# Run only integration tests
pytest tests/integration/
```

---

## Code Quality

Pre-commit hooks enforce consistent style before each commit.

```bash
pre-commit install          # install hooks
pre-commit run --all-files  # run manually

mypy project/               # type check
black project/ tests/       # format
isort project/ tests/       # sort imports
flake8 project/ tests/      # lint
```

---

## Motivation

I started this project in 2019 to learn how to build a real-world Python application from the ground up and to scratch my own itch as a calisthenics enthusiast. Over time, it turned into a playground for experimenting with better architecture, testing practices, and deployment setups. In its latest iteration, it also became a way to explore how modern AI assistants and autonomous coding agents can support day-to-day development work — from shaping features to keeping the codebase clean.

## What I Learned


This project was built to gain hands-on experience with key patterns and tools found in real-world Flask applications:

- Applied the **application factory pattern** to instantiate the app with separate configurations for development, testing, and production
- Organized features using **Flask Blueprints** for `auth`, `main`, and `errors` modules
- Modeled a non-trivial schema with **SQLAlchemy ORM**, including many-to-many relationships (followers), cascading deletes, and relationship loading
- Managed schema migrations across environments using **Flask-Migrate / Alembic** without data loss
- Implemented **token-based email flows** for secure account confirmation and password resets with `itsdangerous`
- Handled authentication and session management with **Flask-Login**, including custom decorators like `@check_confirmed`
- Tested the application using **pytest-flask** with an in-memory database for full request/response testing
- Enforced code quality and consistent style with **type annotations**, **pre-commit hooks**, and tools like `black`, `flake8`, and `isort`
- Deployed the application on shared hosting using **passenger_wsgi.py**, structured logging
- Leveraged **AI assistance (Claude and autonomous agents)** to guide feature design, streamline development, and maintain high code quality

