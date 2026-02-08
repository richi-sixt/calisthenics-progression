# Code Review: Calisthenics Progression

A detailed analysis of areas to improve regarding **best practices**, **typing**, and **testing**.

---

## 1. Best Practices

### 1.1 Deprecated API Usage: `datetime.utcnow()`

**Severity: High** | Files: `project/auth/routes.py:125`, `project/main/routes.py:35`, `project/main/routes.py:83`, `project/main/routes.py:365`

`datetime.utcnow()` is deprecated since Python 3.12 and returns a naive datetime (no timezone info). The codebase already uses `datetime.now(timezone.utc)` in models.py defaults and in conftest.py, but the routes still use the old form.

```python
# Current (deprecated)
user.confirmed_on = datetime.utcnow()            # auth/routes.py:125
current_user.last_seen = datetime.utcnow()        # main/routes.py:35
workout = Workout(timestamp=datetime.utcnow(), …) # main/routes.py:83
current_user.last_message_read_time = datetime.utcnow()  # main/routes.py:365

# Recommended
user.confirmed_on = datetime.now(timezone.utc)
current_user.last_seen = datetime.now(timezone.utc)
```

This inconsistency can cause subtle bugs when comparing timezone-aware and naive datetimes.

---

### 1.2 Confusing Model Naming: `Exercises` vs `Exercise`

**Severity: High** | File: `project/models.py:203-259`

The class `Exercises` (plural) represents a single exercise *definition/template*, while `Exercise` (singular) represents an exercise *instance* in a workout. This naming is inverted from standard conventions where class names are singular nouns.

- `Exercises` should be something like `ExerciseDefinition` or `ExerciseTemplate`
- `Exercise` is fine but could be `ExerciseInstance` for clarity
- The foreign key `exercise2exercises_id` (`models.py:244`) is hard to read. A name like `exercise_definition_id` would be clearer.

---

### 1.3 Typo in Backref Name: `athlet`

**Severity: Medium** | File: `project/models.py:65,69,77`

The backref `athlet` appears to be a typo for `athlete`. This backref is used throughout the codebase (`main/routes.py:147,148,173,194,237,259,394`) so renaming it requires a migration or coordinated change, but should be planned.

---

### 1.4 Follow/Unfollow Routes Use GET for State Changes

**Severity: High** | File: `project/main/routes.py:327-358`

The `/follow/<username>` and `/unfollow/<username>` routes use GET requests to modify server state. This violates REST conventions and is vulnerable to CSRF via simple link injection (e.g., `<img src="/follow/attacker">`). These should be POST-only routes with CSRF tokens.

```python
# Current
@bp.route("/follow/<username>")

# Recommended
@bp.route("/follow/<username>", methods=["POST"])
```

---

### 1.5 Missing Input Validation in `add_workout`

**Severity: High** | File: `project/main/routes.py:76-123`

The `add_workout` route reads raw `request.form` data without WTForms validation:

- `request.form["exercise_count"]` is cast directly with `int()` -- a non-numeric value causes an unhandled `ValueError`
- `request.form["exercise" + str(exercise_num)]` has no existence check
- No CSRF protection since no WTForm is used for this POST
- No server-side validation that the exercise IDs actually exist or belong to the user

---

### 1.6 `forgot()` Route Crashes on Non-Existent Email

**Severity: High** | File: `project/auth/routes.py:154-174`

When a user submits a password reset for an email that doesn't exist in the database, `User.query.filter_by(email=form.email.data).first()` returns `None`, and the next line `token = generate_confirmation_token(user.email)` raises `AttributeError: 'NoneType' object has no attribute 'email'`.

```python
# Current (crashes if user is None)
user = User.query.filter_by(email=form.email.data).first()
token = generate_confirmation_token(user.email)

# Recommended
user = User.query.filter_by(email=form.email.data).first()
if user is None:
    flash("Falls ein Konto mit dieser E-Mail existiert, wurde eine E-Mail gesendet.", "info")
    return redirect(url_for("main.index"))
```

Note: For security, the response should be identical whether the email exists or not, to prevent email enumeration.

---

### 1.7 Async Email Broken: Missing `_get_current_object()`

**Severity: High** | File: `project/email.py:34`

```python
app = current_app  # type: ignore[assignment]
Thread(target=send_async_email, args=(app, msg), daemon=True).start()
```

`current_app` is a context-local proxy. Passing it to a thread doesn't work because the proxy is not valid outside the request context. The correct pattern is:

```python
app = current_app._get_current_object()
```

Note: The auth blueprint's `project/auth/email.py` sends emails *synchronously* (no thread), so this module (`project/email.py`) is actually unused in production. This is confusing -- there are two separate `email.py` files with different `send_email` signatures.

---

### 1.8 Unused Import

**Severity: Low** | File: `project/main/routes.py:1,15`

```python
from flask import config, ...           # 'config' is imported but never used
from sqlalchemy.util.compat import FullArgSpec  # imported but never used
```

---

### 1.9 Deprecated `Query.get()` Usage

**Severity: Medium** | Files: `project/models.py:175`, `project/main/routes.py:130,164,172,204,236,258`

`User.query.get(int(id))` and `*.query.get_or_404(id)` use the legacy Query API. In SQLAlchemy 2.0, the recommended approach is `db.session.get(Model, id)`.

---

### 1.10 No Password Strength Validation

**Severity: Medium** | File: `project/auth/forms.py:56-65`

The `RegistrationForm` and `ResetPasswordForm` accept any non-empty password. There are no minimum length requirements, complexity rules, or checks against common passwords.

---

### 1.11 `TestConfig` Does Not Inherit from `Config`

**Severity: Medium** | File: `tests/test_config.py:4`

`TestConfig` is a standalone class that doesn't inherit from `Config`. If new config keys are added to `Config`, they won't be present in tests, which can cause subtle test-vs-production discrepancies.

```python
# Current
class TestConfig:
    ...

# Recommended
class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    ...
```

---

### 1.12 `flask-bootstrap` Dependency is Unmaintained

**Severity: Medium** | File: `requirements.txt`

`Flask-Bootstrap` (3.3.7.1) depends on the `visitor` package which fails to build on Python 3.11+. The package is effectively unmaintained. The modern replacement is `bootstrap-flask` (already installable). This is currently the cause of 31 test failures in template rendering.

---

## 2. Typing

### 2.1 No Type Annotations on Most Functions

**Severity: Medium** | Files: All route files, `models.py`

The vast majority of functions have no type hints. Only a few files (`project/__init__.py`, `project/email.py`, `project/auth/forms.py`) use annotations. Key areas missing annotations:

| File | Functions missing annotations |
|---|---|
| `project/models.py` | `set_password`, `check_password`, `follow`, `unfollow`, `is_following`, `followed_workouts`, `new_messages`, `add_notification`, `load_user`, all `__repr__` methods |
| `project/auth/routes.py` | All 10 route functions, `save_picture` |
| `project/main/routes.py` | All 18 route functions |
| `project/decorators.py` | `check_confirmed` |
| `project/token.py` | `generate_confirmation_token`, `confirm_token` |

Example improvement for `models.py`:

```python
def set_password(self, password: str) -> None:
    self.password_hash = generate_password_hash(password)

def check_password(self, password: str) -> bool:
    return check_password_hash(self.password_hash, password)

def is_following(self, user: "User") -> bool:
    return self.followed.filter(followers.c.followed_id == user.id).count() > 0

def follow(self, user: "User") -> None:
    if not self.is_following(user):
        self.followed.append(user)
```

---

### 2.2 No `py.typed` Marker or `mypy` Configuration

**Severity: Medium** | Project root

There is no `mypy.ini`, `pyproject.toml [tool.mypy]`, or `py.typed` marker. No static type checker is configured in the pre-commit hooks or dev dependencies. Adding mypy to the development workflow would catch bugs like the `None` dereference in the `forgot()` route (section 1.6).

Recommended addition to `requirements-dev.txt`:
```
mypy>=1.8.0
```

And a minimal config in `pyproject.toml` or `mypy.ini`:
```ini
[mypy]
python_version = 3.11
warn_return_any = True
warn_unused_configs = True
ignore_missing_imports = True
```

---

### 2.3 `confirm_token` Return Type is Ambiguous

**Severity: Medium** | File: `project/token.py:20-32`

```python
def confirm_token(token, expiration=3600):
```

This function returns either a `str` (the email) or `False` (a `bool`). This `str | bool` union is error-prone because callers need to remember to check for `False` instead of `None`. The standard Python pattern for "value or nothing" is to return `str | None`:

```python
def confirm_token(token: str, expiration: int = 3600) -> str | None:
    ...
    except (SignatureExpired, BadSignature):
        return None
    return email
```

---

### 2.4 SQLAlchemy Column Types Not Reflected in Python Types

**Severity: Low** | File: `project/models.py`

SQLAlchemy 2.0 supports `Mapped[]` annotations which provide proper IDE autocompletion and static analysis:

```python
# Current (no Python-level type information)
id = db.Column(db.Integer, primary_key=True)
username = db.Column(db.String(64), index=True, unique=True)

# SQLAlchemy 2.0 style with Mapped types
from sqlalchemy.orm import Mapped, mapped_column

id: Mapped[int] = mapped_column(primary_key=True)
username: Mapped[str] = mapped_column(db.String(64), index=True, unique=True)
```

This is a larger migration effort but aligns with SQLAlchemy's current best practices.

---

### 2.5 Form Field Type Annotations Are Misleading

**Severity: Low** | File: `project/auth/forms.py`

```python
username: StringField = StringField("Benutzername", validators=[DataRequired()])
```

While technically correct at the class level, WTForms uses metaclass descriptors, so at the instance level `self.username` is actually a `StringField` bound instance whose `.data` is `str | None`. The annotations aren't wrong but they provide a false sense of type safety. The `main/forms.py` file has no annotations at all -- inconsistency across forms.

---

## 3. Testing

### 3.1 Coverage Report (Current: 90%)

```
Name                             Stmts   Miss  Cover   Missing
--------------------------------------------------------------
project/__init__.py                 45     21    53%   86-131
project/auth/__init__.py             3      0   100%
project/auth/email.py               13      0   100%
project/auth/forms.py               43      0   100%
project/auth/routes.py              95      5    95%   125,159,169
project/config.py                   16      0   100%
project/decorators.py                8      0   100%
project/email.py                    14     14     0%   (entirely unused)
project/errors/__init__.py           3      0   100%
project/errors/handlers.py         12     12     0%   (no 500 test triggers it)
project/main/__init__.py             3      0   100%
project/main/forms.py              10      0   100%
project/main/routes.py            224     14    94%
project/models.py                 124      1    99%
project/token.py                   12      0   100%
--------------------------------------------------------------
TOTAL                             705     67    90%
```

### 3.2 Zero Coverage: `project/email.py` (0%)

**Severity: High** | File: `project/email.py`

This module has 0% test coverage. It contains the async email utility (`send_async_email` + `send_email`) but is only imported from `project/auth/email.py` for auth-related emails. The threading logic is untested and contains the bug described in section 1.7.

---

### 3.3 Zero Coverage: `project/errors/handlers.py` (0%)

**Severity: Medium** | File: `project/errors/handlers.py`

The error handlers file shows 0% coverage. Although tests in `test_error_handlers.py` do trigger 404 and 403 responses, the handlers are registered with `@bp.errorhandler()` which only works for errors raised within that blueprint. The handlers should use `@bp.app_errorhandler()` to work application-wide, or the coverage gap means the custom error templates are never actually used.

---

### 3.4 No Tests for `copy_exercise` Route

**Severity: Medium** | File: `project/main/routes.py:126-157`

The `copy_exercise` endpoint is a JSON API route that handles exercise copying between users. It has no tests. Cases to cover:

- Successful copy
- Copying own exercise (should return 400)
- Copying when duplicate title exists (should return 400)
- Unauthenticated access
- Non-existent exercise (404)

---

### 3.5 No Tests for `notifications` Route Edge Cases

**Severity: Low** | File: `project/main/routes.py:406-419`

The notifications route has basic tests but doesn't test:
- Notifications with actual data present
- Filtering with a `since` timestamp that excludes some notifications
- JSON response structure validation

---

### 3.6 No Tests for `save_picture` Utility

**Severity: Medium** | File: `project/auth/routes.py:66-79`

The `save_picture` function handles file uploads with image resizing via Pillow. It is untested. Cases to cover:
- Valid image upload and resize
- Generated filename uniqueness
- File extension preservation

---

### 3.7 Missing Negative/Edge Case Tests

**Severity: Medium**

Several routes lack negative path testing:

| Missing Test | File |
|---|---|
| Registration with existing email via POST | `test_auth_routes.py` |
| Password reset with non-existent email | `test_auth_routes.py` |
| Sending message to self | `test_main_routes.py` |
| Adding workout with invalid/missing form data | `test_main_routes.py` |
| Pagination boundary tests (page 0, negative page, beyond last page) | All list routes |
| Accessing other user's workout detail (authorization check) | `test_main_routes.py` |
| Profile edit with duplicate username | `test_auth_routes.py` |

---

### 3.8 Test Isolation: `time.sleep()` in Token Tests

**Severity: Low** | File: `tests/unit/test_token.py:60`

```python
def test_confirm_expired_token(self, app):
    token = generate_confirmation_token("test@example.com")
    time.sleep(2)
    result = confirm_token(token, expiration=1)
```

Using `time.sleep(2)` makes the test slow and flaky. Consider using `freezegun` or `unittest.mock.patch` to mock time instead:

```python
from unittest.mock import patch
from time import time as real_time

def test_confirm_expired_token(self, app):
    with app.app_context():
        token = generate_confirmation_token("test@example.com")
        with patch("project.token.time", return_value=real_time() + 7200):
            result = confirm_token(token, expiration=3600)
            assert result is False
```

---

### 3.9 31 Integration Tests Fail Due to `flask-bootstrap` Incompatibility

**Severity: High** | Root cause: `requirements.txt`

All tests that render templates with Bootstrap imports fail because `flask-bootstrap==3.3.7.1` cannot be installed on Python 3.11+ (the `visitor` dependency fails to build). This blocks 31 out of 123 tests.

**Fix:** Migrate from `flask-bootstrap` to `bootstrap-flask` (maintained, Python 3.11+ compatible). This requires updating template imports:

```jinja2
{# Old (flask-bootstrap) #}
{% import "bootstrap/wtf.html" as wtf %}

{# New (bootstrap-flask) #}
{% from "bootstrap/form.html" import render_form %}
```

---

### 3.10 No `conftest.py` Coverage Configuration

**Severity: Low** | File: `pytest.ini`

The `pytest.ini` doesn't include `--cov` by default. Adding it would ensure coverage is always tracked:

```ini
addopts = -v --tb=short --cov=project --cov-report=term-missing
```

---

## Summary: Priority Matrix

| Priority | Issue | Category |
|----------|-------|----------|
| **Critical** | `flask-bootstrap` incompatibility (31 test failures) | Testing |
| **Critical** | `forgot()` crashes on non-existent email | Best Practices |
| **High** | `datetime.utcnow()` deprecated usage (4 locations) | Best Practices |
| **High** | Follow/Unfollow use GET for mutations | Best Practices |
| **High** | Missing validation in `add_workout` | Best Practices |
| **High** | Async email proxy bug (`current_app` in thread) | Best Practices |
| **High** | `project/email.py` at 0% coverage | Testing |
| **Medium** | No type annotations on routes/models | Typing |
| **Medium** | No mypy in dev toolchain | Typing |
| **Medium** | `confirm_token` returns `str | bool` | Typing |
| **Medium** | Confusing `Exercises` vs `Exercise` naming | Best Practices |
| **Medium** | `TestConfig` doesn't inherit `Config` | Testing |
| **Medium** | No tests for `copy_exercise`, `save_picture` | Testing |
| **Medium** | No password strength validation | Best Practices |
| **Low** | Unused imports | Best Practices |
| **Low** | `time.sleep` in token tests | Testing |
| **Low** | Inconsistent form annotations | Typing |
