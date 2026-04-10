from functools import wraps
from typing import Callable, ParamSpec, TypeVar

from flask import flash, redirect, url_for
from flask.typing import ResponseReturnValue
from flask_login import current_user

P = ParamSpec("P")
R = TypeVar("R")


def check_confirmed(func: Callable[P, R]) -> Callable[P, R | ResponseReturnValue]:
    @wraps(func)
    def decorated_function(
        *args: P.args, **kwargs: P.kwargs
    ) -> R | ResponseReturnValue:
        if current_user.confirmed is False:
            flash("Bitte bestätige dein Konto", "warning")
            return redirect(url_for("auth.unconfirmed"))
        return func(*args, **kwargs)

    return decorated_function
