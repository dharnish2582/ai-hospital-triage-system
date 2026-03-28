from database import get_db
import numpy as np
from sklearn.ensemble import IsolationForest

# -----------------------------------
# TRAIN SIMPLE ANOMALY DETECTOR
# -----------------------------------

training_data = np.array([
    [75, 98, 37.0],
    [80, 99, 36.8],
    [90, 97, 37.2],
    [70, 98, 36.7],
    [85, 96, 37.4],
    [120, 94, 38.5],
    [130, 92, 39.0],
    [60, 99, 36.5],
])

model = IsolationForest(
    contamination=0.15,
    random_state=42
)

model.fit(training_data)


# -----------------------------------
# PARSE BLOOD PRESSURE
# -----------------------------------

def parse_bp(bp):

    try:
        if bp and "/" in bp:
            s, d = bp.split("/")
            return int(s), int(d)
    except:
        pass

    return None, None


# -----------------------------------
# MONITORING AGENT
# -----------------------------------

def run_monitoring_agent(patient_id: int):

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT * FROM patients WHERE id=?",
        (patient_id,)
    )

    patient = cursor.fetchone()

    conn.close()

    if not patient:
        raise ValueError(f"Patient {patient_id} not found")

    anomalies = []

    hr = patient["heart_rate"] or 80
    o2 = patient["oxygen_level"] or 98
    temp = patient["temperature"] or 37
    bp = patient["blood_pressure"]

    sys_bp, dia_bp = parse_bp(bp)

    # ---------------------------
    # ML ANOMALY DETECTION
    # ---------------------------

    features = np.array([[hr, o2, temp]])

    anomaly_flag = model.predict(features)[0]

    anomaly_score = model.decision_function(features)[0]

    if anomaly_flag == -1:
        anomalies.append(
            f"AI anomaly detected (score {round(anomaly_score,2)})"
        )

    # ---------------------------
    # MEDICAL RULE CHECKS
    # ---------------------------

    if hr > 130:
        anomalies.append(f"Tachycardia ({hr} bpm)")

    if hr < 50:
        anomalies.append(f"Bradycardia ({hr} bpm)")

    if o2 < 92:
        anomalies.append(f"Low oxygen ({o2}%)")

    if temp > 38.5:
        anomalies.append(f"High fever ({temp}°C)")

    if temp < 35.5:
        anomalies.append(f"Hypothermia risk ({temp}°C)")

    if sys_bp:

        if sys_bp > 160 or dia_bp > 100:
            anomalies.append(f"Hypertension ({bp})")

        if sys_bp < 90:
            anomalies.append(f"Hypotension ({bp})")

    return {

        "patientId": patient["id"],

        "patientName": patient["name"],

        "vitals": {

            "heart_rate": hr,
            "oxygen_level": o2,
            "temperature": temp,
            "blood_pressure": bp
        },

        "anomalies": anomalies,

        "ai_score": round(anomaly_score, 3)
    }