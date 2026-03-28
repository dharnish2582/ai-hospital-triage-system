import numpy as np
from sklearn.linear_model import LinearRegression
from database import get_db


model = LinearRegression()

training_X = []
training_y = []

load_history = [0]


def compute_trend():

    if len(load_history) < 5:
        return "stable"

    recent = load_history[-5:]

    if recent[-1] > recent[0]:
        return "increasing"

    if recent[-1] < recent[0]:
        return "decreasing"

    return "stable"


def predict_load():

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT COUNT(*) as count
        FROM patients
        WHERE status='waiting'
    """)
    queue_depth = cursor.fetchone()["count"]

    cursor.execute("""
        SELECT COUNT(*) as count
        FROM doctors
        WHERE workload < 4
    """)
    active_doctors = cursor.fetchone()["count"]

    conn.close()

    features = [queue_depth, active_doctors]

    # -----------------------
    # TRAIN MODEL
    # -----------------------

    if len(training_X) > 10:
        model.fit(training_X, training_y)

        predicted_load = model.predict([features])[0]

    else:
        # fallback heuristic
        predicted_load = queue_depth * 0.6 + (5 - active_doctors) * 2

    predicted_load = max(1, int(predicted_load))

    if load_history:
        predicted_load = int((predicted_load + load_history[-1]) / 2)

    # -----------------------
    # UPDATE TRAINING DATA
    # -----------------------

    training_X.append(features)
    training_y.append(predicted_load)

    if len(training_X) > 100:
        training_X.pop(0)
        training_y.pop(0)

    # -----------------------
    # UPDATE HISTORY
    # -----------------------

    load_history.append(predicted_load)

    if len(load_history) > 50:
        load_history.pop(0)

    trend = compute_trend()

    return {

        "current_queue": queue_depth,

        "active_doctors": active_doctors,

        "predicted_load": predicted_load,

        "trend": trend,

        "explanation":
        f"ML prediction using queue={queue_depth}, active_doctors={active_doctors}",

        "load_history": load_history
    }