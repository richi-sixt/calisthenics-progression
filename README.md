# Calisthenics Progression

A Python Flask Application in work for learning purposes.

## Features

A simple calisthenics workout tracker

- Create exercises
- Create workouts with multiple exercises, sets, progressions and reps
- Explore workouts from other athletes
- follow and send private messages to other athletes

---

## run (local)

Python 3.14.2

### 1. Install requirements.txt in virtual environement

> `pip install -r requirements.txt`

### 2. create .env file in root directory (will be invoked in \config.py)

```python
WTF_CSRF_SECRET_KEY="your-secret-key"
SECRET_KEY="an-other-secret-key-which-is-hard-to-guess"
DATABASE_URL="db-url-for-example-postgresql://localhost/<your-db>"
SECURITY_PASSWORD_SALT="another-salt-for-the-password"
FLASK_ENV="development"

MAIL_SERVER="smtp.yourmailprovider.com"
MAIL_PORT="587"
MAIL_USE_TLS="1"
MAIL_USERNAME="username"
MAIL_PASSWORD="password"
MAIL_DEFAULT_SENDER="email-for-the-sender"
```

### 3. export local run settings in terminal

> `export FLASK_APP=calisthenics_progression.py`<br>`export FLASK_ENV=development`

### 4. create db

> For SQLite: Add config var in `project/config.py`.

```python
#...
SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL") or \
    "sqlite:///" + os.path.join(basedir, "app.db")
#...
```

> for Postgresql: Create DB in [PostgreSQL Client](https://www.postgresql.org/) and add config var in `project/config.py`.

```python
#...

   SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL").replace(
        "postgres://", "postgresql://", 1
#...
```

> `flask db init`<br>
> `flask db migrate -m "Migration messages"`<br>
> `flask db upgrade`

Run the app with `flask run`

---
