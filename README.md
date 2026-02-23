# Calisthenics Progression

A Flask web application for tracking calisthenics workouts — built for learning purposes.

Log your training sessions, define custom exercises with progression levels, and connect with other athletes. This project covers the full stack of a production-ready Flask app: authentication, ORM relationships, email flows, testing, and deployment.

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

- Log workouts with multiple exercises, sets, and rep or duration counts
- Select custom exercises with ordered progression levels (e.g. Tuck Planche → Straddle Planche → Full Planche)
- Select or copy exercises from other athletes
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
- Registration with email confirmation
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

## What I Learned

This project was built deliberately to get hands-on experience with patterns that come up in real Flask applications:

- **Application factory pattern** — structuring the app so it can be instantiated with different configs (development, testing, production)
- **Blueprints** — splitting `auth`, `main`, and `errors` into self-contained modules
- **SQLAlchemy ORM** — modelling a non-trivial schema with many-to-many (followers), cascading deletes, and relationship loading
- **Flask-Migrate / Alembic** — managing schema changes across environments without losing data
- **Token-based email flows** — secure account confirmation and password reset using `itsdangerous`
- **Flask-Login** — session management, `@login_required`, and custom `@check_confirmed` decorators
- **Testing a Flask app** — using `pytest-flask` with an in-memory test database, writing unit and integration tests for full request/response cycles
- **Type annotations** — applying `mypy` to a dynamically typed Flask codebase
- **Pre-commit hooks** — automating code quality checks with `black`, `isort`, and `flake8`
- **Production deployment** — configuring `passenger_wsgi.py` for cPanel hosting with structured logging and email error alerts

Heavily inspired by [Flask Mega Tutorial](https://github.com/miguelgrinberg/microblog-2018)
