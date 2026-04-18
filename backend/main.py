from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, field_validator
import pandas as pd
import numpy as np
from catboost import CatBoostRegressor
import uvicorn
import os
import difflib
import logging
from typing import Dict, Tuple, Optional

# ====================== LOGGING ======================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("api_server.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

from fastapi.middleware.cors import CORSMiddleware

# ====================== APP INITIALIZATION ======================
app = FastAPI(
    title="نظام تقييم مخاطر الزلازل المتكامل (CATNAT)",
    description="API احترافي يجمع بين الذكاء الاصطناعي ومحاكاة مونت كارلو وقواعد RPA الجزائرية",
    version="6.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# ====================== LOAD MODEL ======================
# Try multiple possible paths for the model
MODEL_PATHS = [
    "./../data/catboost_risk_index_model.cbm",
    "./../../data/catboost_risk_index_model.cbm",
    "/home/chouchou77/extra/telegram/catboost_risk_index_model.cbm",
    "catboost_risk_index_model.cbm"
]

model = CatBoostRegressor()
model_loaded = False

for path in MODEL_PATHS:
    if os.path.exists(path):
        try:
            model.load_model(path)
            logger.info(f"✅ CatBoost model loaded successfully from: {path}")
            model_loaded = True
            break
        except Exception as e:
            logger.error(f"❌ Failed to load model from {path}: {str(e)}")

if not model_loaded:
    logger.warning("⚠️ Warning: Model file not found in any expected location! Predictions will fail.")

# ====================== DATA & VALIDATION ======================
VALID_WILAYAS = {
    "ALGIERS", "JIJEL", "ORAN", "CONSTANTINE", "ANNABA", "SETIF", "BATNA",
    "DJELFA", "BLIDA", "TIARET", "BEJAIA", "SKIKDA", "M'SILA", "CHLEF", 
    "BORDJ BOU ARRERIDJ", "BOUMERDES", "TIPAZA", "AIN TEMOUCHENT", "MILA",
    # Add more as needed
}

VALID_COMMUNES = {
    "TAHER", "ALGIERS", "ORAN", "CONSTANTINE", "JIJEL", "EL EUUMA", "SETIF",
    # Add more as needed
}

def fuzzy_match(value: str, valid_set: set, field_name: str) -> str:
    """Fuzzy matching for wilayas and communes"""
    if not value: return value
    upper = value.strip().upper()
    if upper in valid_set or not valid_set:
        return upper
    
    matches = difflib.get_close_matches(upper, list(valid_set), n=1, cutoff=0.65)
    if matches:
        matched = matches[0]
        logger.warning(f"🔄 Fuzzy matched {field_name}: '{value}' → '{matched}'")
        return matched
    
    return upper # Return original if no close match, or could raise error

def calculate_v_factor(risk_type: str) -> float:
    """Unified logic for vulnerability factor"""
    t = risk_type.lower()
    if any(word in t for word in ["bien", "immobilier", "سكن", "habitation"]):
        return 1.0
    elif any(word in t for word in ["ind", "comm", "industriel", "commercial", "installation"]):
        return 1.5
    else:
        return 1.2

# ====================== SERVICES ======================

def rpa_validation_service(risk_level: float, nb_floors: int, height_m: float) -> Tuple[bool, int, int]:
    """Algerian RPA rules validation"""
    if risk_level >= 0.30:      # Zone III
        max_n, max_h = 3, 11
    elif risk_level >= 0.20:    # Zone II
        max_n, max_h = 4, 14
    else:                       # Zone I
        max_n, max_h = 5, 17
    
    compliant = (nb_floors <= max_n) and (height_m <= max_h)
    return compliant, max_n, max_h

def ai_prediction_service(wilaya: str, commune: str, risk_type: str, 
                         capital: float, risk_level: float, v_factor: float, 
                         pml_base: float, is_compliant: bool = True) -> float:
    """CatBoost AI risk prediction"""
    if not model_loaded:
        return 0.0

    input_df = pd.DataFrame([{
        'WILAYA': wilaya.upper(),
        'COMMUNE': commune.upper(),
        'TYPE': risk_type,
        'CAPITAL_ASSURE': capital,
        'RISK_LEVEL': risk_level,
        'V_FACTOR': v_factor,
        'PML': pml_base
    }])
    
    raw_pred = model.predict(input_df)[0]
    risk_index = raw_pred * (229 / 80)
    
    if not is_compliant:
        risk_index *= 1.5  # Non-compliance penalty
    
    return risk_index

def monte_carlo_service(capital: float, risk_level: float, v_factor: float, iterations: int = 5000) -> Dict:
    """Monte Carlo simulation using Lognormal distribution"""
    mu = np.log(0.15)
    sigma = 1.0
    
    simulated_severity = np.random.lognormal(mu, sigma, size=iterations)
    simulated_damage_ratio = np.clip(simulated_severity, 0.0, 1.0)
    
    simulated_losses = capital * risk_level * v_factor * simulated_damage_ratio
    return {
        "expected_loss_avg": round(float(np.mean(simulated_losses)), 2),
        "worst_case_95": round(float(np.percentile(simulated_losses, 95)), 2),
        "max_potential_loss": round(float(np.max(simulated_losses)), 2)
    }

def get_recommendation(risk_index: float, is_compliant: bool = True):
    """Unified recommendation logic"""
    if risk_index > 420 or not is_compliant:
        return {
            "class": "Red", 
            "color": "#FF0000", 
            "decision": "Refused (🔴)",
            "advice": "❌ رفض العقد: الخطر يتجاوز القدرة الاستيعابية أو غير مطابق لمعايير RPA."
        }
    elif risk_index > 340:
        return {
            "class": "Orange", 
            "color": "#FFA500", 
            "decision": "Conditional (🟠)",
            "advice": "⚠️ قبول مشروط: تحويل 70% من الخطر إلى إعادة التأمين الدولي."
        }
    elif risk_index > 260:
        return {
            "class": "Yellow", 
            "color": "#FFFF00", 
            "decision": "Caution (🟡)",
            "advice": "⚠️ قبول حذر: العقد مقبول مع تطبيق قسط إضافي للتحوط."
        }
    else:
        return {
            "class": "Green", 
            "color": "#008000", 
            "decision": "Accepted (🟢)",
            "advice": "✅ قبول تام: خطر آمن وضمن المعايير القياسية."
        }

# ====================== INPUT MODELS ======================

class BasicContractInput(BaseModel):
    wilaya: str = Field(..., example="JIJEL")
    commune: str = Field(..., example="TAHER")
    risk_type: str = Field(..., example="Installation Industrielle")
    capital_assure: float = Field(..., gt=0, example=150000000)
    risk_level: float = Field(0.20, description="معامل المنطقة الزلزالية A")

class AdvancedContractInput(BasicContractInput):
    nb_floors: int = Field(..., gt=0, example=4)
    height_m: float = Field(..., gt=0, example=14.0)

    @field_validator('wilaya')
    @classmethod
    def validate_wilaya(cls, v: str) -> str:
        return fuzzy_match(v, VALID_WILAYAS, "الولاية")

    @field_validator('commune')
    @classmethod
    def validate_commune(cls, v: str) -> str:
        return fuzzy_match(v, VALID_COMMUNES, "البلدية")

# ====================== ENDPOINTS ======================

@app.get("/", include_in_schema=False)
def index():
    return {
        "message": "CATNAT Unified Risk API is Running.",
        "version": "6.0.0",
        "endpoints": ["/predict (Basic)", "/analyze_risk (Advanced)"]
    }

@app.post("/predict", summary="تحليل عقد أساسي")
async def predict_basic(contract: BasicContractInput):
    try:
        v_factor = calculate_v_factor(contract.risk_type)
        pml = contract.capital_assure * contract.risk_level * v_factor
        
        risk_index = ai_prediction_service(
            contract.wilaya, contract.commune, contract.risk_type,
            contract.capital_assure, contract.risk_level, v_factor, pml
        )
        
        rec = get_recommendation(risk_index)
        
        return {
            "status": "success",
            "analysis": {
                "v_factor": v_factor,
                "pml": round(pml, 2),
                "risk_index": round(risk_index, 2),
                "category": rec["class"],
                "color_code": rec["color"]
            },
            "recommendation": rec["advice"]
        }
    except Exception as e:
        logger.error(f"Basic Prediction Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error")

@app.post("/analyze_risk", summary="تحليل مخاطر متقدم")
async def analyze_advanced(data: AdvancedContractInput):
    try:
        # 1. RPA Validation
        is_compliant, max_n, max_h = rpa_validation_service(
            data.risk_level, data.nb_floors, data.height_m
        )

        # 2. Factors
        v_factor = calculate_v_factor(data.risk_type)
        pml_base = data.capital_assure * data.risk_level * v_factor

        # 3. Monte Carlo
        mc_results = monte_carlo_service(data.capital_assure, data.risk_level, v_factor)

        # 4. AI Prediction
        risk_index = ai_prediction_service(
            data.wilaya, data.commune, data.risk_type,
            data.capital_assure, data.risk_level, v_factor, pml_base, is_compliant
        )

        # 5. Recommendation
        rec = get_recommendation(risk_index, is_compliant)

        return {
            "status": "success",
            "rpa_validation": {
                "compliant": is_compliant,
                "zone_limit_floors": max_n,
                "zone_limit_height": max_h
            },
            "ai_prediction": {
                "risk_index": round(risk_index, 2),
                "decision": rec["decision"],
                "color": rec["color"]
            },
            "monte_carlo_simulation": {
                "average_simulated_loss": mc_results["expected_loss_avg"],
                "extreme_scenario_95": mc_results["worst_case_95"],
                "max_potential_loss": mc_results["max_potential_loss"],
                "note": "5000 سيناريو بتوزيع Lognormal"
            },
            "final_recommendation": rec["advice"]
        }
    except Exception as e:
        logger.error(f"Advanced Analysis Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error")

if __name__ == "__main__":
    # Check for port availability or use default
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
