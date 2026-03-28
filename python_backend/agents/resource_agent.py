from database import get_db
from agents.doctor_assignment_agent import assign_doctor
import numpy as np
from scipy.optimize import linear_sum_assignment


def get_room_type(severity):

    if not severity:
        return "room"

    s = severity.lower()

    if s == "critical":
        return "icu"

    if s == "serious":
        return "emergency"

    return "room"


def compute_cost_matrix(doctors):

    costs = []

    for d in doctors:

        workload = d["workload"]

        fatigue_penalty = workload ** 2

        cost = workload * 3 + fatigue_penalty

        costs.append(cost)

    return np.array(costs).reshape(len(doctors), 1)


def choose_best_doctor(doctors):

    cost_matrix = compute_cost_matrix(doctors)

    row_ind, col_ind = linear_sum_assignment(cost_matrix)

    return doctors[row_ind[0]]


def run_resource_agent(patient_id: int, severity: str, department: str):

    conn = get_db()
    cursor = conn.cursor()

    alerts = []

    cursor.execute("SELECT * FROM patients WHERE id=?", (patient_id,))
    patient = cursor.fetchone()

    if not patient:
        conn.close()
        return {"assignment": None, "alerts": alerts}

    cursor.execute(
        "SELECT * FROM doctors WHERE specialization=?",
        (department,)
    )

    doctors = [dict(r) for r in cursor.fetchall()]

    if not doctors:

        alerts.append({
            "type": "NO SPECIALIST",
            "color": "red",
            "message": f"No doctor available for {department}"
        })

        conn.close()
        return {"assignment": None, "alerts": alerts}

    # Hungarian optimization
    chosen_doctor = choose_best_doctor(doctors)

    # RL metrics
    rl_doc, reward, avg_reward = assign_doctor(severity, doctors)

    # Workload balancing fallback
    least_loaded = min(doctors, key=lambda d: d["workload"])

    if chosen_doctor["workload"] - least_loaded["workload"] > 2:
        chosen_doctor = least_loaded

    if chosen_doctor["workload"] >= 8:

        alerts.append({
            "type": "DOCTOR OVERLOAD",
            "color": "orange",
            "message": "All specialists overloaded"
        })

        conn.close()
        return {"assignment": None, "alerts": alerts}

    # Room selection
    pref_room = get_room_type(severity)

    cursor.execute("""
        SELECT *
        FROM rooms
        WHERE status='available'
        AND room_type=?
        LIMIT 1
    """, (pref_room,))

    room = cursor.fetchone()

    if not room:

        cursor.execute("""
            SELECT *
            FROM rooms
            WHERE status='available'
            LIMIT 1
        """)

        room = cursor.fetchone()

    if not room:

        alerts.append({
            "type": "HOSPITAL FULL",
            "color": "red",
            "message": "Hospital capacity reached"
        })

        conn.close()
        return {"assignment": None, "alerts": alerts}

    try:

        cursor.execute("BEGIN")

        cursor.execute(
            "UPDATE doctors SET workload=workload+1 WHERE id=?",
            (chosen_doctor["id"],)
        )

        cursor.execute(
            "UPDATE rooms SET status='occupied', assigned_patient=? WHERE id=?",
            (patient["name"], room["id"])
        )

        cursor.execute("""
            UPDATE patients
            SET status='assigned',
                assigned_doctor=?,
                assigned_room=?,
                severity=?
            WHERE id=?
        """, (
            chosen_doctor["name"],
            room["room_name"],
            severity,
            patient_id
        ))

        conn.commit()

    except Exception as e:

        conn.rollback()
        print("Transaction error:", e)

        conn.close()

        return {"assignment": None, "alerts": alerts}

    conn.close()

    return {

        "assignment": {
            "patientId": patient_id,
            "patientName": patient["name"],
            "doctorName": chosen_doctor["name"],
            "department": department,
            "roomName": room["room_name"],
            "roomType": room["room_type"],
            "rl_reward": reward,
            "rl_avg_reward": avg_reward
        },

        "alerts": alerts
    }