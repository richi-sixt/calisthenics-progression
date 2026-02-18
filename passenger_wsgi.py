import os
import sys


BASE_DIR = os.path.dirname(__file__)
sys.path.insert(0, BASE_DIR)

from project import create_app

application = create_app()

