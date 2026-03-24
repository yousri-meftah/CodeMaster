from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent.parent
ENV_DIR = BASE_DIR / "envs"


class BaseConfig(BaseSettings):
    """
    Base configuration class which loads environment variables from .env files.
    """

    model_config = SettingsConfigDict(
        env_file=(
            str(ENV_DIR / "backend.env"),
            str(ENV_DIR / "pg.env"),
        ),
    )


class PostgresConfig(BaseConfig):
    POSTGRES_URL: str
    POSTGRES_DB: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_HOST: str




class JwtConfig(BaseConfig):
    SECRET_KEY: str
    JWT_ALGORITHM: str
    JWT_EXPIRATION_MINUETS: int
    CODE_EXPIRATION_MINUTES : int


class MailConfig(BaseConfig):
    MAIL_USERNAME: str
    MAIL_PASSWORD: str
    MAIL_FROM: str
    MAIL_PORT: str
    MAIL_SERVER: str
    MAIL_FROM_NAME: str

class RedisConfig(BaseConfig):
    REDIS_URL : str


class PistonConfig(BaseConfig):
    PISTON_URL: str = "https://piston.yousri-meftah.com/api/v2"
    PISTON_TIMEOUT_SECONDS: int = 15
    EXECUTION_MAX_WORKERS: int = 10


class AlgoConfig(BaseConfig):
    ALGO_COMPILER_JAR: str = r"C:\Program Files\algo-compiler\algo-compiler-1.6.0.jar"
    JAVA_BIN: str = "java"


class Settings(
    PostgresConfig,
    JwtConfig,
    MailConfig,
    RedisConfig,
    PistonConfig,
    AlgoConfig,
):
    pass


settings: Settings = Settings()
