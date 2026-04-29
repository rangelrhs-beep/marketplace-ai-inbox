from enum import Enum


class ConnectorErrorCode(str, Enum):
    missing_fields = "missing_fields"
    token_expired = "token_expired"
    rate_limited = "rate_limited"
    api_failure = "api_failure"


class ConnectorError(Exception):
    code = ConnectorErrorCode.api_failure

    def __init__(self, message: str, *, details: dict | None = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


class MissingFieldError(ConnectorError):
    code = ConnectorErrorCode.missing_fields


class TokenExpiredError(ConnectorError):
    code = ConnectorErrorCode.token_expired


class RateLimitError(ConnectorError):
    code = ConnectorErrorCode.rate_limited


class ApiFailureError(ConnectorError):
    code = ConnectorErrorCode.api_failure


def serialize_connector_error(error: ConnectorError) -> dict:
    return {
        "code": error.code,
        "message": error.message,
        "details": error.details,
    }
