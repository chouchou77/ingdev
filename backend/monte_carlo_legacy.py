from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, field_validator
import pandas as pd
import numpy as np
from catboost import CatBoostRegressor
import uvicorn
import os
import difflib
import logging
from typing import Dict, Tuple

# ====================== LOGGING ======================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ====================== APP ======================
app = FastAPI(
    title="CATNAT Algeria v5.0 - AI + Monte Carlo + RPA",
    description="نظام تقييم مخاطر الزلازل المتكامل (Modular & Production-Ready)",
    version="5.0.0"
)

# ====================== LOAD MODEL ======================
MODEL_PATH = "./../data/catboost_risk_index_model.cbm"
model = CatBoostRegressor()
if os.path.exists(MODEL_PATH):
    model.load_model(MODEL_PATH)
    logger.info("✅ CatBoost model loaded successfully")
else:
    logger.warning("⚠️ Model file not found! Predictions will fail.")

# ====================== VALIDATION DATA (Fuzzy Matching) ======================
# TODO: املأ هذه القوائم كاملة من بيانات التدريب الخاصة بالموديل (أو load من JSON)
VALID_WILAYAS = {
    "ALGIERS", "JIJEL", "ORAN", "CONSTANTINE", "ANNABA", "SETIF", "BATNA",
    "DJELFA", "BLIDA", "TIARET", "BEJAIA", "SKIKDA", # ... أكمل الـ58 ولاية
}

VALID_COMMUNES = {
    "TAHER", "ALGIERS", "ORAN", "CONSTANTINE", # ... أكمل من بيانات التدريب
}

def fuzzy_match(value: str, valid_set: set, field_name: str) -> str:
    """Fuzzy matching + exact match للولايات والبلديات"""
    upper = value.strip().upper()
    if upper in valid_set:
        return upper
    
    # Fuzzy search
    matches = difflib.get_close_matches(upper, list(valid_set), n=1, cutoff=0.65)
    if matches:
        matched = matches[0]
        logger.warning(f"🔄 Fuzzy matched {field_name}: '{value}' → '{matched}'")
        return matched
    
    raise ValueError(f"❌ {field_name} غير صالح: {value}. أقرب تطابق غير كافٍ.")

# ====================== SERVICES (Modular Architecture) ======================

def rpa_validation_service(risk_level: float, nb_floors: int, height_m: float) -> Tuple[bool, int, int]:
    """Service منفصل للتحقق من قواعد RPA الجزائرية"""
    if risk_level >= 0.30:      # Zone III
        max_n, max_h = 3, 11
    elif risk_level >= 0.20:    # Zone II
        max_n, max_h = 4, 14
    else:                       # Zone I
        max_n, max_h = 5, 17
    
    compliant = (nb_floors <= max_n) and (height_m <= max_h)
    return compliant, max_n, max_h


def ai_prediction_service(
    model, wilaya: str, commune: str, risk_type: str,
    capital: float, risk_level: float, v_factor: float, pml_base: float, is_compliant: bool
) -> float:
    """Service منفصل للتنبؤ بـ CatBoost"""
    input_dict = [{
        'WILAYA': wilaya,
        'COMMUNE': commune,
        'TYPE': risk_type,
        'CAPITAL_ASSURE': capital,
        'RISK_LEVEL': risk_level,
        'V_FACTOR': v_factor,
        'PML': pml_base
    }]
    
    # NumPy optimization: DataFrame صغير جداً (single row) → لا مشكلة في الأداء
    input_df = pd.DataFrame(input_dict)
    raw_pred = model.predict(input_df)[0]
    risk_index = raw_pred * (229 / 80)
    
    if not is_compliant:
        risk_index *= 1.5  # عقوبة المخالفة
    
    return risk_index


def monte_carlo_service(capital: float, risk_level: float, v_factor: float, iterations: int = 5000) -> Dict:
    """محاكاة Monte Carlo محسنة رياضياً (Lognormal بدلاً من Beta)"""
    # === التحسين الرياضي المهم ===
    # Beta(a=2, b=8) كان يعطي توزيعاً محافظاً جداً.
    # Lognormal أفضل للزلازل لأنه:
    # 1. يعطي skewness إيجابي (heavy right tail)
    # 2. شائع جداً في Actuarial Science و Catastrophe Modeling
    # 3. يسمح بتمثيل "خسائر نادرة لكن مدمرة"
    
    mu = np.log(0.15)      # calibrated ليكون average damage ratio ≈ 0.2
    sigma = 1.0            # قيمة عالية = fat tails (أكثر واقعية)
    
    simulated_severity = np.random.lognormal(mu, sigma, size=iterations)
    simulated_damage_ratio = np.clip(simulated_severity, 0.0, 1.0)
    
    simulated_losses = capital * risk_level * v_factor * simulated_damage_ratio
    return {
        "expected_loss_avg": round(float(np.mean(simulated_losses)), 2),
        "worst_case_95": round(float(np.percentile(simulated_losses, 95)), 2),
        "max_potential_loss": round(float(np.max(simulated_losses)), 2)
    }
# ====================== INPUT MODEL (Pydantic Advanced) ======================
class ContractInput(BaseModel):
    wilaya: str = Field(..., example="JIJEL")
    commune: str = Field(..., example="TAHER")
    risk_type: str = Field(..., example="Bien immobilier")
    capital_assure: float = Field(..., gt=0, example=186000000)
    risk_level: float = Field(..., ge=0, le=1, example=0.20)
    nb_floors: int = Field(..., gt=0, example=6)
    height_m: float = Field(..., gt=0, example=18.0)

    @field_validator('wilaya')
    @classmethod
    def validate_wilaya(cls, v: str) -> str:
        return fuzzy_match(v, VALID_WILAYAS, "الولاية")

    @field_validator('commune')
    @classmethod
    def validate_commune(cls, v: str) -> str:
        return fuzzy_match(v, VALID_COMMUNES, "البلدية")

    @field_validator('risk_type')
    @classmethod
    def validate_risk_type(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("risk_type لا يمكن أن يكون فارغاً")
        return v.strip()


# ====================== ENDPOINT ======================
@app.post("/analyze_risk")
async def analyze_risk(data: ContractInput):
    try:
        # 1. RPA Service
        is_compliant, max_n, max_h = rpa_validation_service(
            data.risk_level, data.nb_floors, data.height_m
        )

        # 2. حساب العوامل الأساسية
        v_factor = 1.5 if "ind" in data.risk_type.lower() else 1.0
        pml_base = data.capital_assure * data.risk_level * v_factor

        # 3. Monte Carlo Service (محسن)
        mc_results = monte_carlo_service(data.capital_assure, data.risk_level, v_factor)

        # 4. AI Prediction Service
        risk_index = ai_prediction_service(
            model, data.wilaya, data.commune, data.risk_type,
            data.capital_assure, data.risk_level, v_factor, pml_base, is_compliant
        )

        # 5. القرار النهائي
        if risk_index > 420 or not is_compliant:
            decision, color = "Refused (🔴)", "#FF0000"
            note = "العقد مرفوض لعدم مطابقة معايير RPA أو ارتفاع مؤشر الخطر."
        elif risk_index > 260:
            decision, color = "Conditional (🟡)", "#FFFF00"
            note = "قبول مشروط بتحويل جزء من الخطر لإعادة التأمين."
        else:
            decision, color = "Accepted (🟢)", "#008000"
            note = "العقد مقبول ضمن المعايير العادية."

        return {
            "rpa_validation": {
                "compliant": is_compliant,
                "zone_limit_floors": max_n,
                "zone_limit_height": max_h
            },
            "ai_prediction": {
                "risk_index": round(risk_index, 2),
                "decision": decision,
                "color": color
            },
            "monte_carlo_simulation": {
                "average_simulated_loss": mc_results["expected_loss_avg"],
                "extreme_scenario_95": mc_results["worst_case_95"],
                "max_potential_loss": mc_results["max_potential_loss"],
                "simulation_note": "5000 سيناريو بتوزيع Lognormal (أدق للخسائر الكارثية)"
            },
            "final_recommendation": note
        }

    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        logger.error(f"خطأ في تحليل المخاطر: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)