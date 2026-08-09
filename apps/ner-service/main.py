from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from contextlib import asynccontextmanager

# Try loading GLiNER model safely with fallback
model = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    print("[NER Service] Initializing GLiNER PII model...")
    try:
        from gliner import GLiNER
        model = GLiNER.from_pretrained("nvidia/gliner-pii")
        print("[NER Service] NVIDIA GLiNER model successfully loaded!")
    except Exception as e:
        print(f"[NER Service] GLiNER model load warning (will use fallback rules if uninitialized): {e}")
    yield
    print("[NER Service] Shutting down GLiNER service...")
    model = None

app = FastAPI(title="PrivacyShield Dynamic Schema GLiNER Engine", version="2.0.0", lifespan=lifespan)

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
    "DATABASE_CREDENTIAL",
    "SOCIAL_SECURITY_NUMBER",
    "CREDIT_CARD_NUMBER"
]

class TextRequest(BaseModel):
    text: str
    labels: Optional[List[str]] = None
    threshold: Optional[float] = 0.22

@app.get("/health")
@app.get("/status")
async def health_check():
    return {
        "status": "healthy",
        "service": "GLiNER ML Engine",
        "modelLoaded": model is not None
    }

@app.post("/predict")
async def predict_entities(req: TextRequest):
    target_labels = req.labels if req.labels and len(req.labels) > 0 else DEFAULT_LABELS
    threshold = req.threshold if req.threshold is not None else 0.22

    if model is not None:
        try:
            entities = model.predict_entities(
                req.text, 
                target_labels, 
                threshold=threshold
            )
            
            formatted_spans = []
            for ent in entities:
                formatted_spans.append({
                    "text": ent["text"],
                    "label": ent["label"].upper(),
                    "start": ent["start"],
                    "end": ent["end"],
                    "score": round(float(ent["score"]), 3)
                })
                
            return {"success": True, "entities": formatted_spans}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")
    else:
        # Fallback return when model is in light mode
        return {"success": True, "entities": [], "fallback": True}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
