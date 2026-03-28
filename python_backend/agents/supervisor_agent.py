from database import get_db
from agents.triage_priority_agent import get_priority_queue
import time


def log_to_db(message: str):

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        "INSERT INTO logs (message, timestamp) VALUES (?, datetime('now'))",
        (message,)
    )

    conn.commit()
    conn.close()


# ----------------------------------------
# SUPERVISOR INTELLIGENCE
# ----------------------------------------

def analyze_queue(patients):

    if not patients:
        return "Queue empty"

    critical = 0

    for p in patients:
        sev = p.get("severity")

        if sev and sev.lower() == "critical":
            critical += 1

    if critical > 2:
        return "High critical load detected"

    if len(patients) > 10:
        return "Hospital congestion increasing"

    return "Queue stable"


# ----------------------------------------
# GET WAITING PATIENTS
# ----------------------------------------

def get_waiting_patients():
    """
    Supervisor Agent

    Coordinates AI agents and manages patient queue.
    """

    patients = get_priority_queue()

    queue_state = analyze_queue(patients)

    log_to_db(f"[Supervisor] Queue analysis: {queue_state}")

    return patients


# ----------------------------------------
# MARK PATIENT PROCESSING
# ----------------------------------------

def mark_patient_processing(patient_id: int):

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE patients
        SET status='processing'
        WHERE id=?
    """, (patient_id,))

    conn.commit()
    conn.close()

    log_to_db(
        f"[Supervisor] Patient {patient_id} moved to processing pipeline"
    )


# ----------------------------------------
# RETURN PATIENT TO QUEUE
# ----------------------------------------

def revert_patient_waiting(patient_id: int):

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE patients
        SET status='waiting'
        WHERE id=?
    """, (patient_id,))

    conn.commit()
    conn.close()

    log_to_db(
        f"[Supervisor] Resource allocation failed → Patient {patient_id} returned to queue"
    )


# ----------------------------------------
# EMERGENCY ESCALATION
# ----------------------------------------

def escalate_critical(patient_id: int):

    log_to_db(
        f"[Supervisor] CRITICAL escalation triggered for patient {patient_id}"
    )


# ----------------------------------------
# SYSTEM HEARTBEAT
# ----------------------------------------

def system_health_check():

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as count FROM patients WHERE status='waiting'")
    waiting = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) as count FROM doctors WHERE workload < 4")
    available_doctors = cursor.fetchone()["count"]

    conn.close()

    status = "healthy"

    if waiting > 15:
        status = "overloaded"

    if available_doctors == 0:
        status = "critical"

    log_to_db(
        f"[Supervisor] System health check → queue={waiting}, available_doctors={available_doctors}, status={status}"
    )

    return {
        "waiting_patients": waiting,
        "available_doctors": available_doctors,
        "status": status,
        "timestamp": time.time()
    }