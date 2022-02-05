import os
from dotenv import load_dotenv
load_dotenv()

basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, '.env'))

#main config
DEBUG = True
WTF_CSRF_SECRET_KEY = os.getenv('WTF_CSRF_SECRET_KEY')
SECRET_KEY = os.getenv('SECRET_KEY')
MYSQL_CURSORCLASS = 'DictCursor'
WORKOUTS_PER_PAGE = 10
# SQLALCHEMY_DATABASE_URI = os.getenv('DB_URI')
SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL") or \
        "sqlite:///" + os.path.join(basedir, "app.db")
SQLALCHEMY_POOL_RECYCLE = 299
SECURITY_PASSWORD_SALT = os.getenv('SECURITY_PASSWORD_SALT')
FLASK_ENV = os.getenv('FLASK_ENV')

SQLALCHEMY_TRACK_MODIFICATIONS = True

# mail settings
# MAIL_SERVER = 'b1.tophost.ch'
# MAIL_PORT = 465
# MAIL_USE_TLS = False
# MAIL_USE_SSL = True

#gmail authentification
MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')

# mail accounts
MAIL_SERVER="smtp.googlemail.com"
MAIL_PORT="587"
MAIL_USE_TLS="1"
MAIL_USERNAME="richi.sixt@gmail.com"
MAIL_PASSWORD="vrnohegaasrrultb"
MAIL_DEFAULT_SENDER="richi.sixt@gmail.com"
# MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER')