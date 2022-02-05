# Calisthenics Progression

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/9e4e621046f445dc802959bba24c67a4)](https://app.codacy.com/app/richi-sixt/calisthenics_progression?utm_source=github.com&utm_medium=referral&utm_content=richi-sixt/calisthenics_progression&utm_campaign=Badge_Grade_Dashboard) [![Python 3.6](https://img.shields.io/badge/python-3.6.7-blue.svg)](https://www.python.org/downloads/release/python-367/)

A Flask Application in work for learning purposes.

---

## Install environment

### Python3 Virtualenv Setup

#### Requirements

- Python 3.6.7
- Pip 3

```bash
# Mac
$ brew install python3
```

Windows
[Python 3.6.7](https://www.python.org/downloads/release/python-367/)

Pip3 is installed with Python3

##### Installation

To install virtualenv via pip run:

```bash
$ pip3 install virtualenv
pip list
```

##### Usage

Creation a virtualenv in the ~/path (project folder):

```bash
$ virtualenv -p python3 <name>
~/path
```

Activate the virtualenv:

```bash
$ source <name>/bin/activate
(<name>) ~/path
```

Deactivate the virtualenv:

```bash
$ deactivate
~/path
```

[About Virtualenv](https://virtualenv.pypa.io/en/stable/)

## Install Requirements

With active virtualenv

```bash
$ pip instell -r requirements.txt
pip list
```

# Run local

export FLASK_APP=calisthenics_progression.py
export FLASK_ENV=development
