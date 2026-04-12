# Calisthenics Progression

A full-stack calisthenics workout tracker — built for learning purposes.\
Handcrafted in 2019 with inspiration from [Flask Mega Tutorial](https://github.com/miguelgrinberg/microblog-2018), now enhanced with the assistance of AI.

Log your training sessions, define custom exercises with progression levels and workout templates, and connect with other athletes.\
Originally a Flask/Jinja2 monolith, the project has evolved into a **Flask REST API + Next.js frontend** architecture with Supabase Auth.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.14, Flask 3.1, SQLAlchemy 2.0, Flask-Migrate (Alembic) |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript |
| **Auth** | Supabase Auth (ES256 JWTs, JWKS verification) |
| **State Management** | TanStack Query (React Query) 5 |
| **Forms** | react-hook-form 7 |
| **Styling** | Tailwind CSS 4 |
| **Database** | SQLite (dev) / PostgreSQL via Supabase (prod) |
| **Production** | Gunicorn + Next.js, nginx reverse proxy, systemd |
| **Testing** | pytest + pytest-cov (400 tests) |
| **Code Quality** | mypy, black, flake8, isort, pre-commit |

---

## Features

### Workout tracking

- Log workouts with multiple exercises, sets, and rep counts or duration values
- Create and use workout templates — start a workout pre-filled from a template
- Smart workout form: exercise picker with category filters, progression level dropdowns, counting-type-aware inputs (reps vs mm:ss duration)
- Edit and delete workouts, toggle done/pendent status

### Exercise library

- Create and manage custom exercise definitions with ordered progression levels (e.g. Tuck Planche → Straddle Planche → Full Planche)
- Categorize exercises and filter by category
- Browse and copy exercises from other athletes
- Counting type per exercise: reps or duration

### Templates

- Create workout templates as reusable blueprints
- Define exercises and empty set placeholders
- Start a workout directly from a template

### Social

- Explore workouts from other athletes
- Follow / unfollow other users
- View user profiles with workout history
- Private messaging between users
- Notification badge for unread messages

### Account

- Registration with Supabase email confirmation
- Password reset via Supabase
- Edit profile (username, about me)
- Sign out

---

## Setup

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL (optional — SQLite works for local dev)

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
cd backend
pip install -r requirements.txt
```

Create `backend/.env`:

```env
SECRET_KEY="a-hard-to-guess-secret-key"
SECURITY_PASSWORD_SALT="a-unique-salt-string"
FLASK_ENV="development"

# Supabase Auth
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_JWT_SECRET="your-supabase-jwt-secret"

# Database — SQLite is used automatically if DATABASE_URL is not set
# DATABASE_URL="postgresql://localhost/calisthenics_dev"

# Email (optional — for notifications)
# MAIL_SERVER="smtp.yourmailprovider.com"
# MAIL_PORT="587"
# MAIL_USE_TLS="1"
# MAIL_USERNAME="your-username"
# MAIL_PASSWORD="your-password"
# MAIL_DEFAULT_SENDER="noreply@yourdomain.com"
```

Initialize the database and run:

```bash
flask db upgrade
flask run --port 5001
```

### Frontend

```bash
cd web
npm install
```

Create `web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5001/api/v1
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Run the dev server:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## Running Tests

Tests are configured in `pytest.ini` and run with coverage by default.

```bash
cd backend
source .venv/bin/activate

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

## Deployment

The app runs on a Hetzner VPS (Ubuntu 24.04) behind nginx:

- **Flask API** — Gunicorn, systemd service, port 8000
- **Next.js Frontend** — `next start`, systemd service, port 3002
- **nginx** — reverse proxy, SSL via Let's Encrypt
- **Database** — Supabase PostgreSQL

---

## Motivation

I started this project in 2019 to learn how to build a real-world Python application from the ground up and to scratch my own itch as a calisthenics enthusiast. Over time, it turned into a playground for experimenting with better architecture, testing practices, and deployment setups. In its latest iteration, it also became a way to explore how modern AI assistants and autonomous coding agents can support day-to-day development work — from shaping features to keeping the codebase clean.

## What I Learned

This project was built to gain hands-on experience with key patterns and tools found in real-world full-stack applications:

- Applied the **application factory pattern** to instantiate the app with separate configurations for development, testing, and production
- Organized features using **Flask Blueprints** for `auth`, `main`, `api`, and `errors` modules
- Modeled a non-trivial schema with **SQLAlchemy ORM**, including many-to-many relationships (followers, exercise categories), cascading deletes, and relationship loading
- Managed schema migrations across environments using **Flask-Migrate / Alembic** without data loss
- Implemented **Supabase Auth integration** — ES256 JWT verification via JWKS, auto-provisioning Flask users from Supabase UUIDs
- Built a **Next.js 16 App Router** frontend with server/client component architecture
- Managed server state with **TanStack Query** — cache invalidation, optimistic updates, parameterized queries
- Built complex dynamic forms with **react-hook-form** — `useFieldArray` for nested arrays, `useWatch` for reactive field observation, `setValue` for programmatic updates
- Deployed a **two-process production setup** behind nginx with systemd, SSL, and PostgreSQL
- Tested the application using **pytest-flask** with 400 tests covering unit and integration scenarios
- Enforced code quality with **type annotations**, **pre-commit hooks**, and tools like `black`, `flake8`, and `isort`
- Leveraged **AI assistance (Claude and autonomous agents)** to guide feature design, streamline development, and maintain high code quality
