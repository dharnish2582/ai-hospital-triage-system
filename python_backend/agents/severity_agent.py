import numpy as np
from sklearn.linear_model import LogisticRegression
from database import get_db


# -----------------------------
# TRAINING DATA
# -----------------------------

X_train = np.array([
    [75, 120, 80, 98, 37.0],
    [80, 125, 82, 97, 36.8],
    [105, 140, 90, 95, 38.2],
    [115, 150, 95, 93, 38.5],
    [140, 180, 110, 88, 39.0],
    [50, 90, 60, 85, 35.5],
    [90, 130, 85, 96, 37.8],
    [130, 160, 100, 90, 38.8],
])

y_train = np.array([
    "Normal",
    "Normal",
    "Moderate",
    "Moderate",
    "Critical",
    "Critical",
    "Moderate",
    "Critical"
])

model = LogisticRegression(max_iter=1000)
model.fit(X_train, y_train)


# -----------------------------
# BP PARSER
# -----------------------------

def parse_bp(bp):

    try:
        if bp and "/" in bp:
            s, d = bp.split("/")
            return int(s), int(d)
    except:
        pass

    return 120, 80


# -----------------------------
# RISK SCORE (medical heuristic)
# -----------------------------

def compute_risk(hr, o2, temp):

    risk = 0

    if hr > 120:
        risk += 2

    if o2 < 92:
        risk += 3

    if temp > 38.5:
        risk += 2

    return risk


# -----------------------------
# SEVERITY PREDICTION
# -----------------------------

def predict_severity(heart_rate, blood_pressure, oxygen_level, temperature):

    sys_bp, dia_bp = parse_bp(blood_pressure)

    hr = heart_rate if heart_rate else 75
    o2 = oxygen_level if oxygen_level else 98
    temp = temperature if temperature else 37.0

    features = np.array([[hr, sys_bp, dia_bp, o2, temp]])

    prediction = model.predict(features)[0]
    probabilities = model.predict_proba(features)[0]

    prob_dict = {
        cls: round(p * 100, 1)
        for cls, p in zip(model.classes_, probabilities)
    }

    risk_score = compute_risk(hr, o2, temp)

    return prediction, prob_dict, risk_score


# -----------------------------
# MAIN AGENT
# -----------------------------

def run_severity_agent(patient_id: int):

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT heart_rate,
               blood_pressure,
               oxygen_level,
               temperature,
               severity
        FROM patients
        WHERE id = ?
    """, (patient_id,))

    patient = cursor.fetchone()

    if not patient:
        conn.close()
        raise ValueError("Patient not found")

    predicted, probabilities, risk = predict_severity(
        patient["heart_rate"],
        patient["blood_pressure"],
        patient["oxygen_level"],
        patient["temperature"]
    )

    final_severity = predicted

    reason = (
        f"Logistic Regression prediction: {probabilities} "
        f"| risk_score={risk}"
    )

    # Manual override
    if patient["severity"]:

        final_severity = patient["severity"]

        reason = f"Manual override severity: {final_severity}"

    else:

        cursor.execute(
            "UPDATE patients SET severity = ? WHERE id = ?",
            (predicted, patient_id)
        )

        conn.commit()

    conn.close()

    return {
        "patientId": patient_id,
        "severity": final_severity,
        "reason": reason
    }