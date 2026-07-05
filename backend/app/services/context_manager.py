from __future__ import annotations

from typing import Dict, List, Tuple

from app.models import Message

try:
    import tiktoken

    _ENCODING = tiktoken.get_encoding("cl100k_base")
except Exception:
    _ENCODING = None


def estimate_tokens(text: str) -> int:
    if not text:
        return 0
    if _ENCODING:
        return len(_ENCODING.encode(text))
    return max(1, len(text) // 4)


def estimate_message_tokens(role: str, content: str) -> int:
    return estimate_tokens(content) + 4


def build_messages_for_llm(
    system_prompt: str,
    messages: List[Message],
    max_context_tokens: int,
    enable_summary: bool = False,
) -> Tuple[List[Dict[str, str]], int, int]:
    """Build OpenAI-format messages with sliding window. Returns (messages, total_tokens, truncated_count)."""
    system_msg = {"role": "system", "content": system_prompt}
    system_cost = estimate_message_tokens("system", system_prompt)
    usable = max_context_tokens - system_cost

    chat_messages = [m for m in messages if m.role in ("user", "assistant")]
    total_history = len(chat_messages)

    selected: List[Message] = []
    for msg in reversed(chat_messages):
        cost = estimate_message_tokens(msg.role, msg.content)
        if cost > usable:
            break
        selected.insert(0, msg)
        usable -= cost

    truncated_count = total_history - len(selected)
    result: List[Dict[str, str]] = [system_msg]

    if truncated_count > 0 and enable_summary:
        dropped = chat_messages[:truncated_count]
        summary_lines = []
        for m in dropped:
            prefix = "用户" if m.role == "user" else "助手"
            summary_lines.append(f"{prefix}: {m.content[:200]}")
        summary_text = "[历史摘要]\n" + "\n".join(summary_lines)
        summary_cost = estimate_message_tokens("system", summary_text)
        if summary_cost <= usable:
            result.append({"role": "system", "content": summary_text})
            usable -= summary_cost

    for msg in selected:
        result.append({"role": msg.role, "content": msg.content})

    total_tokens = sum(estimate_message_tokens(m["role"], m["content"]) for m in result)
    return result, total_tokens, truncated_count


def preview_context(
    system_prompt: str,
    messages: List[Message],
    max_context_tokens: int,
    enable_summary: bool,
) -> dict:
    built, total_tokens, truncated_count = build_messages_for_llm(
        system_prompt, messages, max_context_tokens, enable_summary
    )
    return {
        "messages": [
            {
                "role": m["role"],
                "content": m["content"],
                "token_count": estimate_message_tokens(m["role"], m["content"]),
            }
            for m in built
        ],
        "total_tokens": total_tokens,
        "max_context_tokens": max_context_tokens,
        "truncated_count": truncated_count,
    }
