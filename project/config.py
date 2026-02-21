import os
from dotenv import load_dotenv

basedir = os.path.abspath(os.path.dirname(__file__))
# Load .env ONLY if no cPanel-ENV exists (Production fallback)
if not os.environ.get('SECRET_KEY'):
    load_dotenv(os.path.join(basedir, ".env"))

# main config
class Config(object):
    WTF_CSRF_ENABLED = True

    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-fallback-key'
    WTF_CSRF_SECRET_KEY = os.environ.get('WTF_CSRF_SECRET_KEY') or SECRET_KEY

    WORKOUTS_PER_PAGE = 10
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL"
    ) or "sqlite:///" + os.path.join(basedir, "app.db")
    SQLALCHEMY_POOL_RECYCLE = 299
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECURITY_PASSWORD_SALT = os.environ.get("SECURITY_PASSWORD_SALT")
    FLASK_ENV = os.environ.get("FLASK_ENV")
    LOG_TO_STDOUT = os.environ.get("LOG_TO_STDOUT")
    ADMINS = os.environ.get("ADMINS")

    # Mail authentification
    # APP_MAIL_SERVER in production -> hosted environements overwrites MAIL_SERVER
    MAIL_SERVER = os.environ.get("APP_MAIL_SERVER") or os.environ.get("MAIL_SERVER")
    MAIL_PORT = int(os.environ.get("MAIL_PORT", 25))
    MAIL_USE_TLS = os.environ.get("MAIL_USE_TLS")
    MAIL_USE_SSL = os.environ.get("MAIL_USE_SSL")
    MAIL_USERNAME = os.environ.get("MAIL_USERNAME")
    MAIL_PASSWORD = os.environ.get("MAIL_PASSWORD")
    MAIL_DEFAULT_SENDER = os.environ.get("MAIL_DEFAULT_SENDER")

