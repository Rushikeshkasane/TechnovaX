from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging

logger = logging.getLogger("civic.exceptions")

class AppException(Exception):
    def __init__(self, message: str, status_code: int = 400, details: any = None):
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(message)

async def app_exception_handler(request: Request, exc: AppException):
    """Handle custom application exceptions."""
    logger.warning(f"AppException: {exc.message} on {request.url.path}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.status_code,
                "type": "APPLICATION_ERROR",
                "message": exc.message,
                "details": exc.details
            }
        }
    )

async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle standard FastAPI/Starlette HTTPExceptions with structured JSON and detail field."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "detail": exc.detail,
            "error": {
                "code": exc.status_code,
                "type": "HTTP_ERROR",
                "message": exc.detail,
                "details": None
            }
        }
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic input validation failures with formatted error list."""
    errors = []
    for err in exc.errors():
        field = " -> ".join([str(loc) for loc in err.get("loc", [])])
        errors.append({
            "field": field,
            "issue": err.get("msg"),
            "type": err.get("type")
        })
    
    logger.warning(f"Validation failed on {request.url.path}: {len(errors)} field errors")
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": {
                "code": 422,
                "type": "VALIDATION_ERROR",
                "message": "Request payload failed schema validation",
                "details": errors
            }
        }
    )

async def generic_exception_handler(request: Request, exc: Exception):
    """Catch-all handler for unhandled internal server errors."""
    logger.error(f"Unhandled server error on {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": 500,
                "type": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected server error occurred. Please contact support.",
                "details": None
            }
        }
    )
