"""Configuration management for pdf2keynote."""

from typing import Optional, Literal
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    """Application settings."""
    
    # LLM Provider Settings
    anthropic_api_key: Optional[str] = Field(default=None, validation_alias='ANTHROPIC_API_KEY')
    openai_api_key: Optional[str] = Field(default=None, validation_alias='OPENAI_API_KEY')
    gemini_api_key: Optional[str] = Field(default=None, validation_alias='GEMINI_API_KEY')
    
    default_provider: Literal["anthropic", "openai", "gemini"] = Field(default="anthropic")
    
    # Application Defaults
    default_style: Literal["default", "minimal", "academic"] = "default"
    default_language: Literal["en", "ja"] = "en"
    default_slides: int = 20
    
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

settings = Settings()
