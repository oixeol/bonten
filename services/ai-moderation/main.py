"""
BONTEN AI Moderation Service (FastAPI)

Avalia denuncias e devolve: categoria sugerida, gravidade, nivel de confianca,
resumo curto e justificativa. A IA recomenda; o NestJS executa.

Roda em http://localhost:8000 por padrao.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
import re
import os

app = FastAPI(title="BONTEN AI Moderation", version="1.0.0")

# --------------------------------------------------------------------------- #
# Modelos
# --------------------------------------------------------------------------- #


class ReportInput(BaseModel):
    report_id: str
    target_type: str = Field(..., description="user | community | message | voice_room")
    category: str = Field(..., description="harassment | hate_speech | spam | scam | sexual | threat | other")
    reason: str = Field(..., min_length=1, max_length=500)
    evidence: Optional[str] = Field(None, description="Texto/evidencia enviado pelo denunciante")
    context: Optional[str] = Field(None, description="Contexto estritamente necessario (sem E2EE)")
    reporter_history: Optional[dict] = Field(None, description="Historico resumido do denunciante")
    target_history: Optional[dict] = Field(None, description="Historico resumido do denunciado (reincidencia)")


class Assessment(BaseModel):
    report_id: str
    suggested_category: str
    severity: int = Field(..., ge=1, le=5, description="1=baixa, 5=critica")
    confidence: float = Field(..., ge=0.0, le=1.0)
    summary: str
    justification: str
    recommended_action: str = Field(..., description="auto_hide | queue | priority_alert | none")
    requires_human: bool
    patterns: List[str] = []


# --------------------------------------------------------------------------- #
# Heuristicas (placeholder para modelo real)
# --------------------------------------------------------------------------- #

HIGH_SEVERITY_KEYWORDS = {
    "threat": ["matar", "kill", "morrer", "death threat", "ameaça", "ameaca"],
    "sexual": ["menor", "child", "underage", "nude", "nudes"],
    "self_harm": ["suicid", "self-harm", "autolesao", "me matar"],
    "hate_speech": ["racista", "racist", "nazi", "genocidio", "homofobico"],
}

SPAM_PATTERNS = [r"http[s]?://", r"bit\.ly", r"discord\.gg", r"free nitro", r"gift"]


def assess(report: ReportInput) -> Assessment:
    text = f"{report.reason} {report.evidence or ''} {report.context or ''}".lower()

    # Categoria sugerida: usa a do denunciante como base, pode reclassificar
    suggested = report.category

    # Gravidade base
    severity = 2
    confidence = 0.6
    patterns: List[str] = []

    # Palavras de alta gravidade
    for cat, words in HIGH_SEVERITY_KEYWORDS.items():
        if any(w in text for w in words):
            severity = max(severity, 5)
            confidence = max(confidence, 0.85)
            suggested = cat if cat in ("threat", "sexual", "self_harm", "hate_speech") else suggested
            patterns.append(f"high_severity:{cat}")

    # Spam
    if any(re.search(p, text) for p in SPAM_PATTERNS):
        severity = max(severity, 2)
        confidence = max(confidence, 0.75)
        if suggested == "other":
            suggested = "spam"
        patterns.append("spam_pattern")

    # Reincidencia aumenta gravidade
    target_hist = report.target_history or {}
    prior_reports = target_hist.get("report_count", 0)
    if prior_reports >= 3:
        severity = min(5, severity + 1)
        patterns.append("repeat_offender")
        confidence = max(confidence, 0.7)

    # Denunciante com historico de denuncias falsas
    reporter_hist = report.reporter_history or {}
    false_reports = reporter_hist.get("false_reports", 0)
    if false_reports >= 3:
        confidence = max(0.3, confidence - 0.3)
        patterns.append("reporter_low_trust")

    # Ataques coordenados: muitas denuncias em curto periodo
    if target_hist.get("reports_last_hour", 0) >= 5:
        patterns.append("coordinated_attack")
        confidence = max(0.4, confidence - 0.2)

    # Decisao recomendada
    if severity >= 4:
        recommended = "priority_alert"
        requires_human = True
    elif severity == 3 or (0.4 <= confidence < 0.75):
        recommended = "queue"
        requires_human = True
    elif severity <= 2 and confidence >= 0.75:
        recommended = "auto_hide"
        requires_human = False
    else:
        recommended = "queue"
        requires_human = True

    # Banimentos/remocao sempre exigem humano
    if recommended == "auto_hide" and severity >= 3:
        requires_human = True

    summary = (
        f"Denuncia {report.report_id}: categoria sugerida '{suggested}', "
        f"gravidade {severity}/5, confianca {confidence:.2f}."
    )
    justification = (
        f"Analise baseada em palavras-chave e historico. "
        f"Padroes detectados: {', '.join(patterns) if patterns else 'nenhum'}."
    )

    return Assessment(
        report_id=report.report_id,
        suggested_category=suggested,
        severity=severity,
        confidence=round(confidence, 2),
        summary=summary,
        justification=justification,
        recommended_action=recommended,
        requires_human=requires_human,
        patterns=patterns,
    )


# --------------------------------------------------------------------------- #
# Rotas
# --------------------------------------------------------------------------- #


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-moderation"}


@app.post("/assess", response_model=Assessment)
def assess_report(report: ReportInput):
    try:
        return assess(report)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/assess/batch", response_model=List[Assessment])
def assess_batch(reports: List[ReportInput]):
    return [assess(r) for r in reports]


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
