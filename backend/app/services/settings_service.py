from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional

from sqlalchemy.orm import Session

from app.models import Setting

DEFAULT_SETTINGS = {
    "api_key": "",
    "base_url": "https://api.openai.com/v1",
    "model": "gpt-4o-mini",
    "temperature": "0.7",
    "max_tokens": "2048",
    "max_context_tokens": "8000",
    "enable_summary": "true",
}


@dataclass
class LLMSettings:
    api_key: str
    base_url: str
    model: str
    temperature: float
    max_tokens: int
    max_context_tokens: int
    enable_summary: bool


def _mask_api_key(key: str) -> str:
    if not key:
        return ""
    if len(key) <= 8:
        return "****"
    return key[:4] + "****" + key[-4:]


def get_settings_dict(db: Session) -> Dict[str, str]:
    rows = db.query(Setting).all()
    result = dict(DEFAULT_SETTINGS)
    for row in rows:
        result[row.key] = row.value
    return result


def get_llm_settings(db: Session) -> LLMSettings:
    s = get_settings_dict(db)
    return LLMSettings(
        api_key=s["api_key"],
        base_url=s["base_url"].rstrip("/"),
        model=s["model"],
        temperature=float(s["temperature"]),
        max_tokens=int(s["max_tokens"]),
        max_context_tokens=int(s["max_context_tokens"]),
        enable_summary=s["enable_summary"].lower() == "true",
    )


def get_settings_response(db: Session) -> dict:
    s = get_settings_dict(db)
    api_key = s["api_key"]
    return {
        "api_key": _mask_api_key(api_key),
        "api_key_set": bool(api_key),
        "base_url": s["base_url"],
        "model": s["model"],
        "temperature": float(s["temperature"]),
        "max_tokens": int(s["max_tokens"]),
        "max_context_tokens": int(s["max_context_tokens"]),
        "enable_summary": s["enable_summary"].lower() == "true",
    }


def update_settings(db: Session, updates: dict) -> None:
    current = get_settings_dict(db)
    for key, value in updates.items():
        if value is None:
            continue
        if key == "api_key" and value == _mask_api_key(current.get("api_key", "")):
            continue
        str_value = str(value).lower() if isinstance(value, bool) else str(value)
        row = db.query(Setting).filter(Setting.key == key).first()
        if row:
            row.value = str_value
        else:
            db.add(Setting(key=key, value=str_value))
    db.commit()
