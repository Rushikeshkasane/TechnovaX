import logging
import time
import sys
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import DEBUG

# Configure root logger
LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s : %(message)s"
logging.basicConfig(
    level=logging.DEBUG if DEBUG else logging.INFO,
    format=LOG_FORMAT,
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger("civic.platform")

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all incoming HTTP requests and their processing duration."""
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        client_ip = request.client.host if request.client else "unknown"
        
        # Process request
        try:
            response = await call_next(request)
            process_time = (time.time() - start_time) * 1000.0
            
            # Skip noise from static asset requests in log unless warning
            if not request.url.path.startswith("/assets"):
                logger.info(
                    f"{request.method} {request.url.path} - Status: {response.status_code} ({process_time:.1f}ms) [IP: {client_ip}]"
                )
            return response
        except Exception as exc:
            process_time = (time.time() - start_time) * 1000.0
            logger.error(
                f"ERROR {request.method} {request.url.path} after {process_time:.1f}ms: {str(exc)}",
                exc_info=True
            )
            raise
