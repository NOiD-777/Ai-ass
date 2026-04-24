import logging
from collections.abc import Callable
from typing import Any

import httpx
from tenacity import RetryCallState, retry, retry_if_exception_type, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)


RETRIABLE_STATUS_CODES = {408, 429, 500, 502, 503, 504}


class ApiRequestError(Exception):
    pass


def _on_retry(state: RetryCallState) -> None:
    if state.outcome and state.outcome.failed:
        logger.warning("Retrying after error: %s", state.outcome.exception())


def _raise_if_failed(response: httpx.Response) -> None:
    if response.status_code in RETRIABLE_STATUS_CODES:
        raise ApiRequestError(f"Retriable status code {response.status_code}: {response.text[:500]}")
    response.raise_for_status()


def with_retries(func: Callable[..., Any]) -> Callable[..., Any]:
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type((httpx.RequestError, httpx.TimeoutException, ApiRequestError)),
        reraise=True,
        after=_on_retry,
    )
    async def wrapper(*args: Any, **kwargs: Any) -> Any:
        return await func(*args, **kwargs)

    return wrapper


def ensure_success(response: httpx.Response) -> httpx.Response:
    _raise_if_failed(response)
    return response
