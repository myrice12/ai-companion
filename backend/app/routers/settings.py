from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.schemas import LLMSettingsResponse, LLMSettingsUpdate, TestConnectionResponse
from app.services.llm_client import test_connection
from app.services.settings_service import get_llm_settings, get_settings_response, update_settings

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=LLMSettingsResponse)
def read_settings(db: Session = Depends(get_db)):
    return get_settings_response(db)


@router.put("", response_model=LLMSettingsResponse)
def save_settings(body: LLMSettingsUpdate, db: Session = Depends(get_db)):
    update_settings(db, body.model_dump(exclude_unset=True))
    return get_settings_response(db)


@router.post("/test", response_model=TestConnectionResponse)
async def test_settings(db: Session = Depends(get_db)):
    settings = get_llm_settings(db)
    success, message = await test_connection(settings)
    return TestConnectionResponse(success=success, message=message)
