from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, field_validator
import pandas as pd
import numpy as np
from catboost import CatBoostRegressor
import uvicorn
import os
import difflib
import logging
from typing import Dict, Tuple, List, Optional
from fastapi.middleware.cors import CORSMiddleware

# ====================== LOGGING & CONFIG ======================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("api_server.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="CATNAT Algérie v6.0 - RPA 99/2003 + Cahier des Charges",
    description="Version de production intégrale avec conformité RPA 99/2003 Maçonnerie Chaînée",
    version="6.0.0"
)

# Add CORS middleware for frontend compatibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ====================== LOAD MODEL ======================
MODEL_PATHS = [
    "catboost_risk_index_model.cbm",
    "/home/chouchou77/extra/telegram/catboost_risk_index_model.cbm",
    "backend/catboost_risk_index_model.cbm",
    "./../data/catboost_risk_index_model.cbm"
]

model = CatBoostRegressor()
model_loaded = False

for path in MODEL_PATHS:
    if os.path.exists(path):
        try:
            model.load_model(path)
            logger.info(f"✅ Modèle CatBoost chargé avec succès depuis: {path}")
            model_loaded = True
            break
        except Exception as e:
            logger.error(f"❌ Échec du chargement du modèle depuis {path}: {str(e)}")

if not model_loaded:
    logger.warning("⚠️ Fichier modèle non trouvé! Prédictions utilisant la logique de secours.")

# ====================== DATA & DB ======================
VALID_WILAYAS = {
    "ADRAR", "CHLEF", "LAGHOUAT", "OUM EL BOUAGHI", "BATNA", "BEJAIA", "BISKRA", 
    "BECHAR", "BLIDA", "BOUIRA", "TAMANRASSET", "TEBESSA", "TLEMCEN", "TIARET", 
    "TIZI OUZOU", "ALGER", "DJELFA", "JIJEL", "SETIF", "SAIDA", "SKIKDA", 
    "SIDI BEL ABBES", "ANNABA", "GUELMA", "CONSTANTINE", "MEDEA", "MOSTAGANEM", 
    "M'SILA", "MASCARA", "OUARGLA", "ORAN", "EL BAYADH", "ILLIZI", 
    "BORDJ BOU ARRERIDJ", "BOUMERDES", "EL TARF", "TINDOUF", "TISSEMSILT", 
    "EL OUED", "KHENCHELA", "SOUK AHRAS", "TIPAZA", "MILA", "AIN DEFLA", "NAAMA", 
    "AIN TEMOUCHENT", "GHARDAIA", "RELIZANE", "EL M'GHAIR", "EL MENIA", 
    "OULED DJELLAL", "BORDJ BADJI MOKHTAR", "BENI ABBES", "TIMIMOUN", "TOUGOURT", 
    "DJANET", "IN SALAH", "IN GUEZZAM"
}

portfolio_db = {
    "BLIDA": {"total_capital": 4500000000, "threshold": 5000000000},
    "JIJEL": {"total_capital": 1200000000, "threshold": 2000000000},
    "ALGER": {"total_capital": 8000000000, "threshold": 10000000000},
    "ORAN": {"total_capital": 6000000000, "threshold": 8000000000},
}

def fuzzy_match(value: str, valid_set: set, field_name: str) -> str:
    if not value: return value
    upper = value.strip().upper()
    if upper in valid_set:
        return upper
    matches = difflib.get_close_matches(upper, list(valid_set), n=1, cutoff=0.65)
    if matches:
        logger.warning(f"🔄 Correspondance floue {field_name}: '{value}' → '{matches[0]}'")
        return matches[0]
    return upper

# ====================== SERVICES ======================

def rpa_validation_service(data) -> Tuple[bool, Dict]:
    violations: List[str] = []
    major_violations: List[str] = []

    zone = data.seismic_zone
    if not zone:
        if data.risk_level >= 0.35: zone = 3
        elif data.risk_level >= 0.20: zone = 2
        else: zone = 1

    max_floors = {1: 5, 2: 4, 3: 3}.get(zone, 4)
    max_height = {1: 17, 2: 14, 3: 11}.get(zone, 14)

    if data.nb_floors > max_floors:
        major_violations.append(f"Nombre d'étages ({data.nb_floors}) > {max_floors} en Zone {zone}")
    if data.height_m > max_height:
        major_violations.append(f"Hauteur ({data.height_m}m) > {max_height}m en Zone {zone}")

    if data.trumeau_area_m2 > 20:
        major_violations.append(f"Surface des trumeaux ({data.trumeau_area_m2}m²) > 20m²")
    
    if data.distance_between_columns_m > 5:
        major_violations.append(f"Distance entre colonnes ({data.distance_between_columns_m}m) > 5m")

    limit = 40 if data.brick_type == "solid" else 25
    if data.diagonal_wall_length > 0 and data.wall_thickness_cm > 0:
        if data.diagonal_wall_length > limit * (data.wall_thickness_cm / 100):
            major_violations.append(f"Élancement du mur dépasse la limite ({limit}× l'épaisseur)")

    if data.longitudinal_reinforcement_bars > 0:
        if data.longitudinal_reinforcement_bars < 4 or data.rebar_diameter_mm < 10:
            major_violations.append("Armature longitudinale insuffisante (Min 4 HA 10)")

    if 0 < data.wall_thickness_cm < 20:
        major_violations.append(f"Épaisseur du mur ({data.wall_thickness_cm}cm) < 20cm")
    
    if 0 < data.wall_density_ratio < 0.04:
        major_violations.append(f"Densité des murs < 4%")
    
    if data.openings_ratio > 0.5:
        violations.append(f"Ratio d'ouvertures > 50%")
    
    if zone == 3 and not data.has_rc_encadrement and data.openings_ratio > 0:
        major_violations.append("En Zone III, un encadrement en béton armé est obligatoire pour les ouvertures")

    is_compliant = len(major_violations) == 0

    report = {
        "compliant": is_compliant,
        "major_violations": major_violations,
        "minor_violations": violations,
        "a_factor": data.a_factor or data.risk_level,
        "max_floors_allowed": max_floors,
        "max_height_allowed": max_height
    }
    return is_compliant, report

def check_portfolio_concentration(wilaya: str, capital: float) -> Dict:
    w_upper = wilaya.upper()
    if w_upper not in portfolio_db:
        return {"warning": False, "note": "Dans les limites de risque du portefeuille"}
    
    current = portfolio_db[w_upper]["total_capital"] + capital
    threshold = portfolio_db[w_upper]["threshold"]
    
    if current > threshold * 0.9:
        return {
            "warning": True,
            "sur_concentration": True,
            "note": f"Forte concentration à {w_upper} - Dépassement {current/1e9:.1f} Milliards DZD"
        }
    return {"warning": False, "note": "Concentration du portefeuille saine"}

def monte_carlo_service(capital: float, risk_level: float, v_factor: float, seismic_zone: Optional[int] = None, iterations: int = 10000) -> Dict:
    if seismic_zone is None:
        if risk_level >= 0.35: seismic_zone = 3
        elif risk_level >= 0.20: seismic_zone = 2
        else: seismic_zone = 1

    # More realistic parameters for seismic damage distributions
    # Adjusting mu and sigma to avoid constant 1.0 clipping
    params = {
        1: (np.log(0.05), 0.6), 
        2: (np.log(0.12), 0.7), 
        3: (np.log(0.20), 0.8)
    }
    mu, sigma = params.get(seismic_zone, (np.log(0.1), 0.7))
    
    # Generate lognormal distribution for damage ratio (percentage of PML)
    damage_ratio = np.clip(np.random.lognormal(mu, sigma, iterations), 0.01, 1.0)
    
    # Loss = Exposure * Multiplier * Random Damage factor
    losses = capital * risk_level * v_factor * damage_ratio

    return {
        "Expected_Loss": round(float(np.mean(losses)), 2),
        "PML_95": round(float(np.percentile(losses, 95)), 2),
        "PML_99": round(float(np.percentile(losses, 99)), 2),
        "Max_Loss": round(float(np.max(losses)), 2),
        "Note": f"Méthodologie Monte Carlo ({iterations:,} scénarios) | Zone {seismic_zone}"
    }

def ai_prediction_service(model, data, is_compliant: bool) -> float:
    # 1. Normalize Risk Level (A-factor) to decimal (e.g., 0.4 for Zone III)
    a_val = data.risk_level if data.risk_level < 1 else data.risk_level * 0.1
    if data.a_factor and data.a_factor > 0:
        a_val = data.a_factor if data.a_factor < 1 else data.a_factor * 0.1
        
    v_val = 1.5 if any(x in data.risk_type.lower() for x in ["ind", "com", "industriel", "commercial"]) else 1.0
    
    # 2. Correct PML Calculation (Monetary Target)
    pml_val = data.capital_assure * a_val * v_val

    if not model_loaded:
        base_index = (a_val * 1000) * v_val
        if not is_compliant: base_index *= 1.3
        return min(max(base_index, 50), 550)

    # 3. Reconstruct Feature Set (Exact 7 features as per training)
    # WILAYA, COMMUNE, TYPE, CAPITAL_ASSURE, RISK_LEVEL, V_FACTOR, PML
    input_df = pd.DataFrame([{
        'WILAYA': data.wilaya.upper(),
        'COMMUNE': data.commune.upper(),
        'TYPE': data.risk_type,
        'CAPITAL_ASSURE': float(data.capital_assure),
        'RISK_LEVEL': float(a_val),
        'V_FACTOR': float(v_val),
        'PML': float(pml_val)
    }])
    
    try:
        # Prediction using model
        raw_pred = model.predict(input_df)[0]
        risk_index = raw_pred * (229 / 80)
    except Exception as e:
        logger.error(f"Erreur logique de prédiction: {e}")
        risk_index = 280.0 
        
    if not is_compliant:
        risk_index *= 1.5
    return risk_index

# ====================== INPUT MODELS ======================

class ContractInput(BaseModel):
    wilaya: str = Field(..., json_schema_extra={"example": "ALGER"})
    commune: str = Field(..., json_schema_extra={"example": "EL BIAR"})
    risk_type: str = Field(..., json_schema_extra={"example": "Industrielle"})
    capital_assure: float = Field(..., gt=0)
    risk_level: float = Field(..., ge=0, le=5)
    nb_floors: int = Field(2, gt=0)
    height_m: float = Field(6.0, gt=0)
    seismic_zone: Optional[int] = Field(None)
    a_factor: Optional[float] = Field(None)
    trumeau_area_m2: Optional[float] = 0.0
    distance_between_columns_m: Optional[float] = 0.0
    diagonal_wall_length: Optional[float] = 0.0
    wall_thickness_cm: Optional[float] = 0.0
    wall_density_ratio: Optional[float] = 0.0
    openings_ratio: Optional[float] = 0.0
    has_rc_encadrement: Optional[bool] = False
    brick_type: Optional[str] = "hollow"
    longitudinal_reinforcement_bars: Optional[int] = 0
    rebar_diameter_mm: Optional[float] = 0.0
    mortar_strength_mpa: Optional[float] = 0.0
    concrete_strength_mpa: Optional[float] = 0.0

    @field_validator('wilaya')
    @classmethod
    def validate_wilaya(cls, v: str) -> str:
        return fuzzy_match(v, VALID_WILAYAS, "la wilaya")

# ====================== ENDPOINTS ======================

@app.get("/")
async def root():
    return {"message": "API Unifiée CATNAT Algérie", "status": "En ligne"}

@app.post("/analyze_risk")
async def analyze_risk(data: ContractInput):
    try:
        is_compliant, rpa_report = rpa_validation_service(data)
        v_factor = 1.5 if "ind" in data.risk_type.lower() else 1.0
        portfolio_check = check_portfolio_concentration(data.wilaya, data.capital_assure)
        mc_results = monte_carlo_service(data.capital_assure, data.risk_level if data.risk_level < 1 else data.risk_level * 0.1, v_factor, data.seismic_zone)
        risk_index = ai_prediction_service(model, data, is_compliant)

        if risk_index > 400 or not is_compliant:
            decision, color, note = "Refusé (🔴)", "#FF4D4D", "Violation des normes RPA ou risque trop élevé"
        elif risk_index > 250:
            decision, color, note = "Conditionnel (🟡)", "#FFD700", "Accord conditionnel avec réassurance obligatoire"
        else:
            decision, color, note = "Accepté (🟢)", "#4CAF50", "Conforme aux normes, contrat accepté"

        return {
            "rpa_validation": rpa_report,
            "portfolio_impact": portfolio_check,
            "ai_prediction": {
                "risk_index": round(risk_index, 2),
                "decision": decision,
                "color": color,
                "formula_r": 2.5
            },
            "monte_carlo": mc_results,
            "monte_carlo_simulation": {
                "average_simulated_loss": mc_results["Expected_Loss"],
                "extreme_scenario_95": mc_results["PML_95"],
                "max_potential_loss": mc_results["Max_Loss"],
                "note": mc_results["Note"]
            },
            "final_recommendation": note
        }

    except Exception as e:
        logger.error(f"Erreur d'exécution: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")

@app.post("/predict_ai")
async def predict_ai(data: ContractInput):
    is_compliant, _ = rpa_validation_service(data)
    risk_index = ai_prediction_service(model, data, is_compliant)
    return {"risk_index": round(risk_index, 2)}

@app.post("/simulate_monte_carlo")
async def simulate_monte_carlo(data: ContractInput):
    v_factor = 1.5 if "ind" in data.risk_type.lower() else 1.0
    mc_results = monte_carlo_service(data.capital_assure, data.risk_level if data.risk_level < 1 else data.risk_level * 0.1, v_factor, data.seismic_zone)
    return mc_results

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
