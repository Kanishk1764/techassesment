from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    port: int = 4000
    database_url: str = "sqlite:///./dev.db"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    llm_provider: str = "openai"
    max_upload_mb: int = 5
    max_bulk_files: int = 20

    model_config = SettingsConfigDict(env_file=".env", extra="allow")

    @property
    def sqlalchemy_database_url(self) -> str:
        url = self.database_url
        if url.startswith("file:"):
            path = url[5:]
            if path.startswith("./") or path.startswith("/"):
                return f"sqlite:///{path}"
            return f"sqlite:///{path}"
        if not url.startswith("sqlite") and not url.startswith("postgresql"):
            return f"sqlite:///{url}"
        return url

settings = Settings()
