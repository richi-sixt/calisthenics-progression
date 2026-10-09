# Calisthenics Progression

A full-stack calisthenics workout tracker — built for learning purposes.
Handcrafted in 2019 with inspiration
from [Flask Mega Tutorial](https://github.com/miguelgrinberg/microblog-2018),
now enhanced with the assistance of AI.

Log your training sessions, define custom exercises with progression
levels and workout templates,
follow your progress in charts, and connect with other athletes.
Originally a Flask/Jinja2 monolith, the project is now
a **Flask REST API + Next.js web + Expo (React Native) mobile**
architecture with Supabase Auth.
The iOS app has been submitted to the App Store - the review is pending.

> The story of how it got here is told in the
> [Calisthenics Progression Journal](https://playground.sixt.services/apps/calisthenics-progression/)
> files, from the first API integration to the App Store submission.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.14, Flask 3.1, SQLAlchemy 2.0, Flask-Migrate (Alembic) |
| **Web frontend** | Next.js 16 (App Router), React 19, TypeScript |
| **Mobile frontend** | Expo (React Native) SDK 57, Expo Router, TypeScript |
| **Auth** | Supabase Auth (ES256 JWTs, JWKS verification), custom SMTP |
| **State Management** | TanStack Query (React Query) 5 |
| **Forms** | react-hook-form 7 |
| **Styling** | Tailwind CSS 4 (web), NativeWind 4 (mobile) |
| **Database** | SQLite (dev) / PostgreSQL via Supabase (prod) |
| **Production** | Gunicorn + Next.js, nginx reverse proxy, systemd (Hetzner VPS) |
| **Mobile builds** | EAS Build / EAS Submit (TestFlight, App Store) |
| **Testing** | pytest + pytest-cov (backend, ~300 tests), Jest + React Native Testing Library (mobile) |
| **Code Quality** | mypy, black, flake8, isort, pre-commit |

---

## Features

### Workout tracking

- Log workouts with multiple exercises, sets, and rep counts or duration values
- Plan workouts on a calendar, mark them done, re-plan them
- Create and use workout templates — start a workout pre-filled from a template
- Smart workout form: searchable exercise picker with category filters, progression-level chips, counting-type-aware inputs (reps vs mm:ss duration)

### Exercise library

- Create and manage custom exercise definitions with ordered progression levels (e.g. Tuck Planche → Straddle Planche → Full Planche)
- Markdown descriptions with images
- Categorize exercises and filter by category
- Browse and copy exercises from other athletes
- Visibility per exercise and workout: public, followers only, or private

### Statistics

- Exercise progression over time (best set or total), by week or month
- Training frequency and volume by category

### Social

- Explore workouts from other athletes, follow / unfollow (with follow requests)
- View user profiles with workout history
- Private messaging between users

### Safety and moderation

- Terms of use accepted at registration
- Report users, workouts, exercises and messages (reports are stored and emailed to admins; review with `flask reports list`)
- Block users — blocks hide both sides from each other everywhere and remove follows
- Account deletion in the app and on the web removes all of a user's data

### Account

- Registration with Supabase email confirmation, password reset
- Edit profile (username, about me, profile picture)
- English and German, light and dark mode

---

## Setup

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL (optional — SQLite works for local dev)

### Backend (API)

```bash
python3 -m venv .venv
source .venv/bin/activate
cd backend
pip install -r requirements.txt
```

Create `backend/.env.local`:

```env
SECRET_KEY="a-hard-to-guess-secret-key"
SECURITY_PASSWORD_SALT="a-unique-salt-string"
FLASK_ENV="development"

# Supabase Auth
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_JWT_SECRET="your-supabase-jwt-secret"

# Database — SQLite is used automatically if DATABASE_URL is not set
# DATABASE_URL="postgresql://localhost/calisthenics_dev"

# Email (optional — new-user and report notifications to admins)
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

Reports from users are stored in the database. To review them:

```bash
flask reports list          # open reports
flask reports resolve <id>  # mark a report as resolved
```

Mark at least one user as admin (`User.admin = True`) to receive report and new-user emails.

### Web frontend

```bash
cd web
npm install
```

Create `web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5001/api/v1
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_CONTACT_USERNAME=your-app-username
```

Run the dev server:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`. The public pages `/privacy`, `/support` and `/terms` are the URLs the App Store needs.

### Mobile frontend

Requires Xcode (iOS Simulator) and/or Android Studio (Android emulator).

```bash
cd mobile
npm install
```

Create `mobile/.env.local`:

```env
EXPO_PUBLIC_API_URL=http://localhost:5001/api/v1
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
EXPO_PUBLIC_CONTACT_USERNAME=your-app-username
# Optional: where the in-app legal links point (defaults to the production web app)
# EXPO_PUBLIC_WEB_URL=http://localhost:3000
```

The app uses native modules not supported by Expo Go, so it needs a
development build rather than `expo start` alone:

```bash
npx expo run:ios      # or: npx expo run:android
```

Once the dev client is installed, day-to-day iteration can go back to
`npx expo start --dev-client` with fast refresh. Native-dependency or config
changes (`app.json`, icons, new native packages) need a fresh native project:

```bash
npx expo prebuild -p ios --no-install   # regenerates ios/ (icons, permissions)
npx expo run:ios
```

Expo Router's typed routes are regenerated while Metro runs; if TypeScript
doesn't know a new route, start `npx expo start` once.

---

## Running Tests

### Backend

Tests are configured in `pytest.ini` and run with coverage by default.

```bash
cd backend
source ../.venv/bin/activate

pytest                    # all tests with coverage
pytest tests/unit/        # only unit tests
pytest tests/integration/ # only integration tests
```

### Mobile

```bash
cd mobile
npm test
```

Jest (`jest-expo` preset) + React Native Testing Library.

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

The web app runs on a Hetzner VPS (Ubuntu 24.04) behind nginx:

- **Flask API** — Gunicorn, systemd service, port 8000
- **Next.js Frontend** — `next start`, systemd service, port 3002
- **nginx** — reverse proxy, SSL via Let's Encrypt
- **Database** — Supabase PostgreSQL
- **Auth emails** — Supabase custom SMTP (Proton)

After pulling a release, run the database migrations (`flask db upgrade`) before restarting the API.

### iOS release

```bash
cd mobile
eas build -p ios --profile production   # build number is incremented by EAS
eas submit -p ios --latest              # needs submit.production.ios.ascAppId
```

- The **version** comes from `expo.version` in `mobile/app.json` (bump it per store release); the **build number** is managed by EAS.
- Store texts, URLs and the App Review answers live in `store-assets/listing.md`; the checklist is `store-assets/APP-STORE-CHECKLIST.md`.
- Demo data for screenshots: `python backend/scripts/seed_demo.py --email <user> [--reset]` (local SQLite only).

---

## Privacy

The app stores account data (email, username), training data, profile and exercise images, and messages. There is no advertising and no tracking. The policy (Swiss DSG, with a section for EU/EEA users under the GDPR) is served at `/privacy`. Users can delete their account and all data in the app.

---

## Motivation

I started this project in 2019 to learn how to build a real-world Python application from the ground up and to scratch my own itch as a calisthenics enthusiast. Over time, it turned into a playground for experimenting with better architecture, testing practices, and deployment setups. In its latest iteration, it also became a way to explore how modern AI assistants and autonomous coding agents can support day-to-day development work — from shaping features to keeping the codebase clean.

## What I Learned

This project was built to gain hands-on experience with key patterns and tools found in real-world full-stack applications:

- Applied the **application factory pattern** to instantiate the app with separate configurations for development, testing, and production
- Organized the REST API using **Flask Blueprints** (the legacy server-rendered `auth`/`main` blueprints were retired once the Next.js/Expo frontends reached feature parity)
- Modeled a non-trivial schema with **SQLAlchemy ORM**, including many-to-many relationships (followers, exercise categories), cascading deletes, and relationship loading
- Managed schema migrations across environments using **Flask-Migrate / Alembic**, and tested a migration against a real PostgreSQL instance instead of trusting SQLite
- Implemented **Supabase Auth integration** — ES256 JWT verification via JWKS, auto-provisioning Flask users from Supabase UUIDs, and custom SMTP for auth emails
- Built a **Next.js 16 App Router** frontend with server/client component architecture
- Managed server state with **TanStack Query** — cache invalidation, optimistic updates, parameterized queries
- Built complex dynamic forms with **react-hook-form** — `useFieldArray` for nested arrays, `useWatch` for reactive field observation
- Deployed a **two-process production setup** behind nginx with systemd, SSL, and PostgreSQL
- Tested the application using **pytest-flask** with unit and integration tests, including both directions of every access rule
- Enforced code quality with **type annotations**, **pre-commit hooks**, and tools like `black`, `flake8`, and `isort`
- Built an **Expo Router / React Native** app sharing the same Flask API and Supabase Auth as the web frontend — secure token storage, deep-linked auth flows, native-vs-web styling parity via NativeWind
- Set up **Jest + React Native Testing Library** for the mobile app, including regression tests for shipped bugs
- Took an app through **App Store release**: icon pipelines, EAS builds and submit, privacy labels, legal pages under Swiss data protection law, and App Review
- Designed **user-safety features** (terms, reporting, blocking) and enforced them at every endpoint that returns another user's data
- Learned that sensitive fields should be **opt-in in serializers** after catching an email-address leak in a profile endpoint
- Leveraged **AI assistance (Claude and autonomous agents)** to guide feature design, streamline development, and maintain high code quality
