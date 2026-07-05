from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class LLMSettingsUpdate(BaseModel):
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = Field(default=None, ge=0, le=2)
    max_tokens: Optional[int] = Field(default=None, ge=1, le=128000)
    max_context_tokens: Optional[int] = Field(default=None, ge=1000, le=200000)
    enable_summary: Optional[bool] = None


class LLMSettingsResponse(BaseModel):
    api_key: str = ""
    api_key_set: bool = False
    base_url: str = "https://api.openai.com/v1"
    model: str = "gpt-4o-mini"
    temperature: float = 0.7
    max_tokens: int = 2048
    max_context_tokens: int = 8000
    enable_summary: bool = True


class SessionCreate(BaseModel):
    title: Optional[str] = None
    system_prompt: Optional[str] = None


class SessionUpdate(BaseModel):
    title: Optional[str] = None
    system_prompt: Optional[str] = None


class SessionResponse(BaseModel):
    id: str
    title: str
    system_prompt: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    id: str
    session_id: str
    role: Literal["system", "user", "assistant"]
    content: str
    token_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatRequest(BaseModel):
    session_id: str
    content: str


class ContextMessage(BaseModel):
    role: str
    content: str
    token_count: int


class ContextPreviewResponse(BaseModel):
    messages: List[ContextMessage]
    total_tokens: int
    max_context_tokens: int
    truncated_count: int


class TestConnectionResponse(BaseModel):
    success: bool
    message: str
