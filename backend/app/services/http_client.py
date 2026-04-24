import httpx
import certifi
import ssl

from ..core.config import settings


def get_async_client(timeout: float = 30.0) -> httpx.AsyncClient:
    if not settings.http_verify_ssl:
        verify: bool | str | ssl.SSLContext = False
    elif settings.ca_bundle_path:
        verify = settings.ca_bundle_path
    elif settings.http_use_system_certs:
        verify = ssl.create_default_context()
    else:
        verify = certifi.where()

    return httpx.AsyncClient(
        timeout=timeout,
        verify=verify,
        follow_redirects=True,
        trust_env=settings.http_trust_env,
    )
