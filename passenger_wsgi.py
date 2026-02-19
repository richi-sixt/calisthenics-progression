import os
import sys

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

# Import and create app
from project import create_app
application = create_app()
