"""
BONTEN Competitive Integrity Service (FastAPI)

Monitora partidas, detecta win trading, boosting, smurfs, farming de Elo.
Gera alertas e propostas que passam pelo fluxo de validacao (NestJS executa).

Roda em http://localhost:8001 por padrao.
"""

from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional, List

app = FastAPI(title="BONTEN Competitive Integrity", version="1.0.0")


class HealthResponse(BaseModel):
    status: str
    service: str


@app.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(status="ok", service="competitive-integrity")


class MatchEvent(BaseModel):
    match_id: str
    game_slug: str
    mode: str
    players: List[str]
    result: dict
    duration_seconds: int


class IntegrityAlert(BaseModel):
    alert_id: str
    type: str  # win_trading, boosting, smurf, elo_farming, anomalous_performance
    severity: str  # low, moderate, high
    players: List[str]
    justification: str
    recommended_action: str  # alert, review, restrict_queue, suspend


@app.post("/analyze/match", response_model=List[IntegrityAlert])
def analyze_match(event: MatchEvent):
    # Placeholder: heurísticas básicas
    alerts = []
    # Exemplo: detectar partidas muito curtas (possível farming)
    if event.duration_seconds < 300:
        alerts.append(IntegrityAlert(
            alert_id=f"alert-{event.match_id}",
            type="elo_farming",
            severity="low",
            players=event.players,
            justification="Partida muito curta, possível farming de Elo.",
            recommended_action="alert",
        ))
    return alerts


@app.post("/analyze/rating-change")
def analyze_rating_change(data: dict):
    return {"status": "ok", "alerts": []}


if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", "8001"))
    uvicorn.run(app, host="0.0.0.0", port=port)
