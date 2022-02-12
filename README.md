# Calisthenics Progression

A Flask Application in work for learning purposes.

---

## run (local)

Python 3.9.10

Install requirements.txt in virtual environement

> `pip install -r requirements.txt`

create .env file in root directory (will be invoked in \config.py):

```python
WTF_CSRF_SECRET_KEY="your-secret-key"
SECRET_KEY="an-other-secret-key-which-is-hard-to-guess"
DB_URI="db-url-for-example-postgresql://localhost/db"
SECURITY_PASSWORD_SALT="another-salt-for-the-password"
FLASK_ENV="development"

MAIL_SERVER="smtp.yourmailprovider.com"
MAIL_PORT="587"
MAIL_USE_TLS="1"
MAIL_USERNAME="username"
MAIL_PASSWORD="password"
MAIL_DEFAULT_SENDER="email-for-the-sender"
```

export run settings in terminal:

> `export FLASK_APP=calisthenics_progression.py`<br> `export FLASK_ENV=development`

## Features
