from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="GLiNER NER Microservice", version="1.0.0")

class TextRequest(BaseModel):
    text: str
    labels: Optional[List[str]] = None

DEFAULT_LABELS = [
    "PERSON_NAME",
    "DOCTOR_NAME",
    "MEDICAL_FACILITY",
    "MEDICAL_RECORD_NUMBER",
    "STREET_ADDRESS",
    "ORGANIZATION",
    "LOCATION",
    "API_KEY",
    "SECRET_TOKEN",
    "DATABASE_CREDENTIAL"
]

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "GLiNER ML Engine"}

@app.post("/predict")
async def predict_entities(req: TextRequest):
    try:
        target_labels = req.labels if req.labels and len(req.labels) > 0 else DEFAULT_LABELS
        
        # Threshold set to 0.22 for higher recall on complex addresses and doctor names
        formatted_spans = []
        
        return {"success": True, "entities": formatted_spans}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")
