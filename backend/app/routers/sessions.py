from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ChatSession, Message
from app.schemas.schemas import (
    ContextPreviewResponse,
    MessageResponse,
    SessionCreate,
    SessionResponse,
    SessionUpdate,
)
from app.services.chat_service import (
    create_session,
    delete_session,
    export_session_markdown,
    get_session_or_404,
    update_session,
)
from app.services.context_manager import preview_context
from app.services.settings_service import get_llm_settings

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.get("", response_model=list[SessionResponse])
def list_sessions(db: Session = Depends(get_db)):
    return (
        db.query(ChatSession)
        .order_by(ChatSession.updated_at.desc())
        .all()
    )


@router.post("", response_model=SessionResponse)
def create_new_session(body: SessionCreate, db: Session = Depends(get_db)):
    return create_session(db, body.title, body.system_prompt)


@router.patch("/{session_id}", response_model=SessionResponse)
def patch_session(session_id: str, body: SessionUpdate, db: Session = Depends(get_db)):
    try:
        return update_session(db, session_id, body.title, body.system_prompt)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{session_id}")
def remove_session(session_id: str, db: Session = Depends(get_db)):
    try:
        delete_session(db, session_id)
        return {"ok": True}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{session_id}/messages", response_model=list[MessageResponse])
def get_messages(session_id: str, db: Session = Depends(get_db)):
    try:
        get_session_or_404(db, session_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return (
        db.query(Message)
        .filter(Message.session_id == session_id, Message.role.in_(["user", "assistant"]))
        .order_by(Message.created_at)
        .all()
    )


@router.get("/{session_id}/context", response_model=ContextPreviewResponse)
def get_context_preview(session_id: str, db: Session = Depends(get_db)):
    try:
        session = get_session_or_404(db, session_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    settings = get_llm_settings(db)
    messages = (
        db.query(Message)
        .filter(Message.session_id == session_id)
        .order_by(Message.created_at)
        .all()
    )
    return preview_context(
        session.system_prompt,
        messages,
        settings.max_context_tokens,
        settings.enable_summary,
    )


@router.get("/{session_id}/export")
def export_session(session_id: str, db: Session = Depends(get_db)):
    try:
        content = export_session_markdown(db, session_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return PlainTextResponse(content, media_type="text/markdown; charset=utf-8")
