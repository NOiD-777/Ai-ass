from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = Field(default="development", alias="APP_ENV")
    app_host: str = Field(default="0.0.0.0", alias="APP_HOST")
    app_port: int = Field(default=8000, alias="APP_PORT")

    groq_api_key: str = Field(default="", alias="GROQ_API_KEY")
    groq_model: str = Field(default="llama-3.1-70b-versatile", alias="GROQ_MODEL")

    huggingface_api_key: str = Field(default="", alias="HUGGINGFACE_API_KEY")
    huggingface_model: str = Field(
        default="mistralai/Mixtral-8x7B-Instruct-v0.1",
        alias="HUGGINGFACE_MODEL",
    )

    openrouter_api_key: str = Field(default="", alias="OPENROUTER_API_KEY")
    openrouter_model: str = Field(
        default="meta-llama/llama-3.1-70b-instruct",
        alias="OPENROUTER_MODEL",
    )

    embedding_provider: str = Field(default="huggingface", alias="EMBEDDING_PROVIDER")
    huggingface_embedding_model: str = Field(
        default="sentence-transformers/all-MiniLM-L6-v2",
        alias="HUGGINGFACE_EMBEDDING_MODEL",
    )
    openrouter_embedding_model: str = Field(
        default="text-embedding-3-large",
        alias="OPENROUTER_EMBEDDING_MODEL",
    )

    opentripmap_api_key: str = Field(default="", alias="OPENTRIPMAP_API_KEY")
    google_maps_api_key: str = Field(default="", alias="GOOGLE_MAPS_API_KEY")
    serpapi_api_key: str = Field(default="", alias="SERPAPI_API_KEY")

    chroma_tenant: str = Field(default="", alias="CHROMA_TENANT")
    chroma_database: str = Field(default="", alias="CHROMA_DATABASE")
    chroma_api_key: str = Field(default="", alias="CHROMA_API_KEY")
    chroma_host: str = Field(default="", alias="CHROMA_HOST")
    chroma_port: int = Field(default=443, alias="CHROMA_PORT")
    chroma_ssl: bool = Field(default=True, alias="CHROMA_SSL")
    chroma_collection: str = Field(default="travel_itinerary_docs", alias="CHROMA_COLLECTION")

    http_verify_ssl: bool = Field(default=True, alias="HTTP_VERIFY_SSL")
    http_use_system_certs: bool = Field(default=True, alias="HTTP_USE_SYSTEM_CERTS")
    ca_bundle_path: str = Field(default="", alias="CA_BUNDLE_PATH")
    http_trust_env: bool = Field(default=False, alias="HTTP_TRUST_ENV")


settings = Settings()
