from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models import ChatSession, Message
from app.services.context_manager import build_messages_for_llm, estimate_message_tokens
from app.services.llm_client import LLMError, complete_chat, stream_chat
from app.services.settings_service import get_llm_settings


def get_session_or_404(db: Session, session_id: str) -> ChatSession:
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise ValueError("会话不存在")
    return session


def create_session(
    db: Session,
    title: Optional[str] = None,
    system_prompt: Optional[str] = None,
) -> ChatSession:
    session = ChatSession()
    if title:
        session.title = title
    if system_prompt:
        session.system_prompt = system_prompt
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def update_session(
    db: Session,
    session_id: str,
    title: Optional[str] = None,
    system_prompt: Optional[str] = None,
) -> ChatSession:
    session = get_session_or_404(db, session_id)
    if title is not None:
        session.title = title
    if system_prompt is not None:
        session.system_prompt = system_prompt
    session.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)
    return session


def delete_session(db: Session, session_id: str) -> None:
    session = get_session_or_404(db, session_id)
    db.delete(session)
    db.commit()


def export_session_markdown(db: Session, session_id: str) -> str:
    session = get_session_or_404(db, session_id)
    messages = (
        db.query(Message)
        .filter(Message.session_id == session_id, Message.role.in_(["user", "assistant"]))
        .order_by(Message.created_at)
        .all()
    )
    lines = [f"# {session.title}\n", f"> 人设: {session.system_prompt}\n"]
    for msg in messages:
        role_label = "用户" if msg.role == "user" else "助手"
        lines.append(f"## {role_label}\n\n{msg.content}\n")
    return "\n".join(lines)


async def stream_chat_response(db: Session, session_id: str, content: str):
    session = get_session_or_404(db, session_id)
    settings = get_llm_settings(db)

    if not settings.api_key and "localhost" not in settings.base_url and "127.0.0.1" not in settings.base_url:
        yield f"data: {json.dumps({'error': '请先在设置中配置 API Key'})}\n\n"
        return

    user_msg = Message(
        session_id=session_id,
        role="user",
        content=content,
        token_count=estimate_message_tokens("user", content),
    )
    db.add(user_msg)
    session.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user_msg)

    history = (
        db.query(Message)
        .filter(Message.session_id == session_id)
        .order_by(Message.created_at)
        .all()
    )

    llm_messages, _, _ = build_messages_for_llm(
        session.system_prompt,
        history,
        settings.max_context_tokens,
        settings.enable_summary,
    )

    full_response = ""
    try:
        async for chunk in stream_chat(llm_messages, settings):
            full_response += chunk
            yield f"data: {json.dumps({'content': chunk})}\n\n"
    except LLMError as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
        return

    assistant_msg = Message(
        session_id=session_id,
        role="assistant",
        content=full_response,
        token_count=estimate_message_tokens("assistant", full_response),
    )
    db.add(assistant_msg)
    session.updated_at = datetime.now(timezone.utc)

    user_count = (
        db.query(Message)
        .filter(Message.session_id == session_id, Message.role == "user")
        .count()
    )
    if user_count == 1 and session.title == "新对话":
        try:
            title = await complete_chat(
                [
                    {"role": "system", "content": "用不超过10个字概括用户话题，只输出标题，不要标点。"},
                    {"role": "user", "content": content},
                ],
                settings,
                max_tokens=30,
            )
            session.title = title.strip()[:50] or "新对话"
        except LLMError:
            session.title = content[:20] or "新对话"

    db.commit()
    db.refresh(assistant_msg)
    yield f"data: {json.dumps({'done': True, 'message_id': assistant_msg.id, 'title': session.title})}\n\n"
