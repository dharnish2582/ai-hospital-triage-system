from database import get_db
import random


def simulate_future_state(minutes_ahead=5):

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT workload FROM doctors")
    doctors = cursor.fetchall()

    cursor.execute("""
        SELECT COUNT(*) as count
        FROM patients
        WHERE status='waiting'
    """)
    queue = cursor.fetchone()["count"]

    conn.close()

    workloads = [d["workload"] for d in doctors]

    # Simulate patient arrivals
    predicted_new_patients = random.randint(0, 3)

    future_queue = queue + predicted_new_patients

    # Simulate doctor progress
    future_workloads = []

    for w in workloads:

        if random.random() < 0.3:
            w = max(0, w - 1)

        future_workloads.append(w)

    avg_workload = sum(future_workloads) / len(future_workloads)

    congestion_score = future_queue + avg_workload

    return {

        "future_queue": future_queue,
        "avg_workload": round(avg_workload, 2),
        "congestion_score": round(congestion_score, 2),

        "explanation":
        f"Simulated {minutes_ahead} min ahead hospital state"
    }