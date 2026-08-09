from fastapi import FastAPI
from pydantic import BaseModel
from gliner import GLiNER
from typing import List, Optional
from contextlib import asynccontextmanager

# Global variable to store model state
model: Optional[GLiNER] = None

# Modern FastAPI Lifespan Handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    print("Loading NVIDIA GLiNER model...")
    # Startup logic: Load the heavy ML model once into RAM
    model = GLiNER.from_pretrained("nvidia/gliner-pii")
    print("NVIDIA GLiNER model successfully loaded!")
    yield
    # Shutdown logic
    print("Shutting down GLiNER service...")
    model = None

# Initialize FastAPI app with lifespan parameter
app = FastAPI(title="PrivacyShield Nemotron-PII Engine", lifespan=lifespan)

# Target entity categories defined in Nemotron-PII
DEFAULT_TARGET_LABELS = [
    "person_name", "email", "phone_number", 
    "social_security_number", "credit_card_number", 
    "medical_record_number", "address", "passport_number"
]

class TextRequest(BaseModel):
    text: str
    labels: List[str] = DEFAULT_TARGET_LABELS
    threshold: float = 0.4

@app.post("/predict")
def predict_entities(req: TextRequest):
    if model is None:
        return {"success": False, "error": "Model not loaded yet."}

    entities = model.predict_entities(
        req.text, 
        req.labels, 
        threshold=req.threshold
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
