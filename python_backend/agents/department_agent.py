import numpy as np
from sklearn.svm import SVC
from database import get_db


# -------------------------
# TRAINING DATA (expanded)
# -------------------------

X_train = np.array([

    # Cardiology
    [75,98,37.0,1],
    [120,95,37.2,1],
    [130,94,37.5,1],
    [110,96,37.1,1],
    [140,92,38.0,1],

    # Neurology
    [80,98,36.8,2],
    [60,92,36.5,2],
    [85,97,37.2,2],
    [90,96,37.0,2],
    [70,95,36.7,2],

    # Orthopedic
    [85,98,37.0,3],
    [100,95,37.5,3],
    [90,98,36.9,3],
    [88,97,37.2,3],
    [95,96,37.1,3],

    # General Medicine
    [90,97,38.5,4],
    [105,94,39.0,4],
    [85,96,38.2,4],
    [88,97,38.7,4],
    [92,95,38.4,4],

    # Emergency
    [140,85,36.0,5],
    [130,88,38.5,5],
    [150,80,39.2,5],
    [145,82,38.8,5],
    [135,84,39.0,5],
])


y_train = np.array([

    "cardiology","cardiology","cardiology","cardiology","cardiology",

    "neurology","neurology","neurology","neurology","neurology",

    "orthopedic","orthopedic","orthopedic","orthopedic","orthopedic",

    "general medicine","general medicine","general medicine",
    "general medicine","general medicine",

    "emergency","emergency","emergency","emergency","emergency"

])


model = SVC(kernel="linear", probability=True)

model.fit(X_train, y_train)


# -------------------------
# SYMPTOM ENCODER
# -------------------------

def encode_symptoms(symptoms):

    if not symptoms:
        return 4

    s = symptoms.lower()

    # Cardiology
    if any(k in s for k in [
        "chest", "heart", "cardiac", "bp", "blood pressure",
        "palpitation", "angina"
    ]):
        return 1

    # Neurology
    if any(k in s for k in [
        "head", "migraine", "brain", "stroke",
        "seizure", "unconscious", "dizziness"
    ]):
        return 2

    # Orthopedic
    if any(k in s for k in [
        "fracture", "bone", "knee", "shoulder",
        "joint", "back pain", "sprain"
    ]):
        return 3

    # Emergency
    if any(k in s for k in [
        "bleeding", "trauma", "accident",
        "anaphylaxis", "severe pain", "shock"
    ]):
        return 5

    # Default
    return 4


# -------------------------
# DEPARTMENT PREDICTION
# -------------------------

def predict_department(hr, o2, temp, symptoms):

    hr = hr or 75
    o2 = o2 or 98
    temp = temp or 37

    sym_code = encode_symptoms(symptoms)

    features = np.array([[hr, o2, temp, sym_code]])

    prediction = model.predict(features)[0]

    probabilities = model.predict_proba(features)[0]

    prob_dict = dict(
        zip(model.classes_, [round(p * 100, 1) for p in probabilities])
    )

    confidence = max(probabilities)

    mapping = {
        "cardiology": "Cardiology",
        "neurology": "Neurology",
        "orthopedic": "Orthopedic",
        "general medicine": "General Medicine",
        "emergency": "Emergency Medicine"
    }

    department = mapping.get(prediction, "General Medicine")

    # -------------------------
    # EMERGENCY OVERRIDE
    # -------------------------

    if hr > 140 or o2 < 88 or temp > 39.5:
        department = "Emergency Medicine"

    # fallback safety (only if extremely uncertain)
    if confidence < 0.30:
        department = "General Medicine"

    return department, prob_dict, round(confidence * 100, 1)


# -------------------------
# MAIN AGENT
# -------------------------

def run_department_agent(patient_id):

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT heart_rate,
               oxygen_level,
               temperature,
               symptoms
        FROM patients
        WHERE id = ?
    """, (patient_id,))

    patient = cursor.fetchone()

    conn.close()

    if not patient:
        raise ValueError("Patient not found")

    dept, probs, confidence = predict_department(
        patient["heart_rate"],
        patient["oxygen_level"],
        patient["temperature"],
        patient["symptoms"]
    )

    return {

        "department": dept,

        "reason":
        f"SVM routing prediction | confidence={confidence}% | probabilities={probs}"
    }