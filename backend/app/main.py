from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI(
    title="NYC Urban Risk Intelligence API",
    description="Backend API for NYC infrastructure risk analytics, geospatial insights, and ML-powered predictions.",
    version="0.1.0",
)
#connect frontend tor backend with cors
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/")
def root():
    return {
        "message": "NYC Urban Risk Intelligence API is running",
        "version": "0.1.0",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "nyc-urban-risk-intelligence-api",
    }


@app.get("/risk/summary")
def get_risk_summary():
    return {
        "city": "New York City",
        "overall_risk_score": 72,
        "top_risk_categories": [
            "traffic crashes",
            "flood-prone infrastructure",
            "high-density 311 complaints",
        ],
        "boroughs": [
            {"name": "Brooklyn", "risk_score": 81},
            {"name": "Queens", "risk_score": 76},
            {"name": "Bronx", "risk_score": 74},
            {"name": "Manhattan", "risk_score": 69},
            {"name": "Staten Island", "risk_score": 58},
        ],
    }


@app.get("/ai/explain")
def explain_risk():
    return {
        "question": "Why is this area high risk?",
        "explanation": (
            "This area appears high risk because it combines historical crash clusters, "
            "dense 311 infrastructure complaints, and environmental exposure factors. "
            "Future versions will use ML predictions and LLM-generated explanations."
        ),
    }