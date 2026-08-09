from fastapi import FastAPI, HTTPException
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
app = FastAPI(title="PrivacyShield Dynamic Schema GLiNER Engine", lifespan=lifespan)

# Target entity categories defined in Nemotron-PII
DEFAULT_TARGET_LABELS = [
    "person_name", "email", "phone_number", 
    "social_security_number", "credit_card_number", 
    "medical_record_number", "address", "passport_number",
    "organization", "api_key", "secret_token", "database_credential"
]

class TextRequest(BaseModel):
    text: str
    labels: Optional[List[str]] = None
    threshold: float = 0.35

@app.post("/predict")
async def predict_entities(req: TextRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet.")

    try:
        # Use dynamic labels from Gateway request if provided, else default schema
        target_labels = req.labels if req.labels and len(req.labels) > 0 else DEFAULT_TARGET_LABELS
        threshold = req.threshold if req.threshold is not None else 0.35

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
