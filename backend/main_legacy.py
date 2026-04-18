from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import pandas as pd
from catboost import CatBoostRegressor
import uvicorn
import os
import logging # <--- 1. New Import

# 2. Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("api_debug.log"), # Saves errors to this file
        logging.StreamHandler()              # Also prints to console
    ]
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="نظام تقييم مخاطر الزلازل (CATNAT)",
    description="API احترافي لحساب الخسارة القصوى وتصنيف مخاطر العقود باستخدام الذكاء الاصطناعي",
    version="2.0.0"
)

# 3. Model Loading with Error Handling
MODEL_PATH = "./../../data/catboost_risk_index_model.cbm"
model = CatBoostRegressor()

if os.path.exists(MODEL_PATH):
    try:
        model.load_model(MODEL_PATH)
        logger.info("✅ CatBoost Model Loaded Successfully!")
    except Exception as e:
        logger.error(f"❌ Failed to load model: {str(e)}")
else:
    logger.warning(f"⚠️ Warning: {MODEL_PATH} not found. Prediction will fail.")

class ContractInput(BaseModel):
    wilaya: str = Field(..., example="JIJEL")
    commune: str = Field(..., example="TAHER")
    risk_type: str = Field(..., example="Installation Industrielle")
    capital_assure: float = Field(..., gt=0, example=150000000)
    risk_level: float = Field(0.20, description="معامل المنطقة الزلزالية A")

def get_risk_analysis(data: ContractInput):
    # Logic is inside a try block in the endpoint
    t = data.risk_type.lower()
    v_factor = 1.0 if any(word in t for word in ["bien", "immobilier", "سكن"]) else \
               1.5 if any(word in t for word in ["ind", "comm", "industriel", "commercial"]) else 1.2

    pml = data.capital_assure * data.risk_level * v_factor

    input_df = pd.DataFrame({
        'WILAYA': [data.wilaya.upper()],
        'COMMUNE': [data.commune.upper()],
        'TYPE': [data.risk_type],
        'CAPITAL_ASSURE': [data.capital_assure],
        'RISK_LEVEL': [data.risk_level],
        'V_FACTOR': [v_factor],
        'PML': [pml]
    })

    raw_pred = model.predict(input_df)[0]
    final_score = raw_pred * (229 / 80)

    if final_score > 420:
        res = {"class": "Red", "color": "#FF0000", "advice": "❌ رفض العقد: الخطر يتجاوز القدرة الاستيعابية للشركة."}
    elif final_score > 340:
        res = {"class": "Orange", "color": "#FFA500", "advice": "⚠️ قبول مشروط: تحويل 70% من الخطر إلى إعادة التأمين الدولي."}
    elif final_score > 260:
        res = {"class": "Yellow", "color": "#FFFF00", "advice": "⚠️ قبول حذر: العقد مقبول مع تطبيق قسط إضافي للتحوط."}
    else:
        res = {"class": "Green", "color": "#008000", "advice": "✅ قبول تام: خطر آمن وضمن المعايير القياسية."}

    return {
        "analysis": {
            "v_factor": v_factor,
            "pml": round(pml, 2),
            "risk_index": round(final_score, 2),
            "category": res["class"],
            "color_code": res["color"]
        },
        "recommendation": res["advice"]
    }

@app.post("/predict", summary="تحليل عقد جديد")
async def predict_risk(contract: ContractInput):
    try:
        # Log the incoming request for debugging
        result = get_risk_analysis(contract)
        logger.info(f"Processing request for: {contract.commune}, {contract.wilaya},")
        
        return {
            "status": "success",
            "input_summary": {
                "location": f"{contract.commune}, {contract.wilaya}",
                "insured_capital": f"{contract.capital_assure:,.2f} DZD"
            },
            "result": result
        }
    except Exception as e:
        # 4. Critical Error Logging
        logger.error(f"Prediction Error: {str(e)}", exc_info=True) 
        raise HTTPException(
            status_code=500, 
            detail=f"Internal Server Error: check logs for details."
        )

@app.get("/", include_in_schema=False)
def index():
    return {"message": "CATNAT Risk API is Running."}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)