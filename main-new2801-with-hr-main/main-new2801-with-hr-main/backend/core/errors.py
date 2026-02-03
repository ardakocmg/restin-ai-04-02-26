"""API Error codes and exceptions"""

AUTH_CODES = {"TOKEN_EXPIRED", "TOKEN_INVALID_SIGNATURE", "TOKEN_MALFORMED", "TOKEN_MISSING", "TOKEN_REFRESH_FAILED"}

class ApiError(Exception):
    def __init__(self, code: str, message: str, status: int = 400, details: dict = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status
        self.details = details

def feature_disabled(module: str):
    return ApiError("FEATURE_DISABLED", f"Feature disabled: {module}", 403)

def forbidden(msg="Forbidden"):
    return ApiError("FORBIDDEN", msg, 403)

def not_found(msg="Not found"):
    return ApiError("NOT_FOUND", msg, 404)

def bad_request(msg="Bad request"):
    return ApiError("BAD_REQUEST", msg, 400)

def conflict(msg="Conflict"):
    return ApiError("CONFLICT", msg, 409)

def http_error(status: int, code: str, message: str, details: dict = None):
    return ApiError(code, message, status, details)
