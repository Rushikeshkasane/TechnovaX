from fastapi import APIRouter
from app.models.schemas import AITriageRequest, AITriageResponse, ChatAssistantRequest, ChatAssistantResponse
from app.services.ai_service import classify_text_nlp, detect_hotspots_and_duplicates, analyze_image_damage, run_citizen_assistant
from typing import Dict, Any

router = APIRouter(prefix="/api/v1/ai", tags=["AI Core"])

@router.post("/triage", response_model=AITriageResponse)
def execute_ai_triage(payload: AITriageRequest):
    """
    Run multi-subengine AI pipeline:
    1. NLP classification (department, category, urgency, priority, SLA).
    2. Prediction (duplicate detection within spatial radius).
    3. Vision (damage inspection if image is supplied).
    """
    nlp = classify_text_nlp(payload.text)
    
    dup_res = {"is_duplicate": False, "duplicate_of_ticket": None}
    if payload.latitude and payload.longitude:
        dup_res = detect_hotspots_and_duplicates(payload.latitude, payload.longitude, nlp["category"])

    vision_issues = []
    if payload.image_url:
        vis = analyze_image_damage(payload.image_url, nlp["category"])
        vision_issues = vis["detected_issues"]

    return {
        "suggested_department_id": nlp["suggested_department_id"],
        "suggested_department_name": nlp["suggested_department_name"],
        "category": nlp["category"],
        "priority": nlp["priority"],
        "urgency_score": nlp["urgency_score"],
        "sentiment": nlp["sentiment"],
        "summary": nlp["summary"],
        "sla_hours": nlp["sla_hours"],
        "is_duplicate": dup_res["is_duplicate"],
        "duplicate_of_ticket": dup_res["duplicate_of_ticket"],
        "vision_detected_issues": vision_issues
    }

@router.post("/assistant/chat", response_model=ChatAssistantResponse)
def chat_with_assistant(payload: ChatAssistantRequest):
    """Conversational citizen RAG assistant."""
    res = run_citizen_assistant(payload.message)
    return res
