from __future__ import annotations

import json
from typing import AsyncIterator, Dict, List, Optional

import httpx

from app.services.settings_service import LLMSettings


class LLMError(Exception):
    pass


def _headers(api_key: str) -> Dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    return headers


async def test_connection(settings: LLMSettings) -> tuple:
    if not settings.api_key and "localhost" not in settings.base_url and "127.0.0.1" not in settings.base_url:
        return False, "请先填写 API Key"

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{settings.base_url}/chat/completions",
                headers=_headers(settings.api_key),
                json={
                    "model": settings.model,
                    "messages": [{"role": "user", "content": "Hi"}],
                    "max_tokens": 5,
                },
            )
            if resp.status_code >= 400:
                detail = resp.text[:300]
                return False, f"API 错误 ({resp.status_code}): {detail}"
            return True, "连接成功"
    except httpx.HTTPError as e:
        return False, f"网络错误: {e}"


async def stream_chat(
    messages: List[Dict[str, str]],
    settings: LLMSettings,
) -> AsyncIterator[str]:
    payload = {
        "model": settings.model,
        "messages": messages,
        "stream": True,
        "temperature": settings.temperature,
        "max_tokens": settings.max_tokens,
    }

    async with httpx.AsyncClient(timeout=120) as client:
        async with client.stream(
            "POST",
            f"{settings.base_url}/chat/completions",
            headers=_headers(settings.api_key),
            json=payload,
        ) as resp:
            if resp.status_code >= 400:
                body = await resp.aread()
                raise LLMError(f"API 错误 ({resp.status_code}): {body.decode()[:500]}")

            async for line in resp.aiter_lines():
                if not line or not line.startswith("data: "):
                    continue
                data = line[6:]
                if data.strip() == "[DONE]":
                    break
                try:
                    chunk = json.loads(data)
                    delta = chunk.get("choices", [{}])[0].get("delta", {})
                    content = delta.get("content")
                    if content:
                        yield content
                except json.JSONDecodeError:
                    continue


async def complete_chat(
    messages: List[Dict[str, str]],
    settings: LLMSettings,
    max_tokens: Optional[int] = None,
) -> str:
    payload = {
        "model": settings.model,
        "messages": messages,
        "stream": False,
        "temperature": settings.temperature,
        "max_tokens": max_tokens or settings.max_tokens,
    }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{settings.base_url}/chat/completions",
            headers=_headers(settings.api_key),
            json=payload,
        )
        if resp.status_code >= 400:
            raise LLMError(f"API 错误 ({resp.status_code}): {resp.text[:500]}")
        data = resp.json()
        return data["choices"][0]["message"]["content"]
