from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import Optional

from database import init_db, get_db
from simulation_controller import run_simulation_generator, stop_simulation, is_simulation_running
from agents.doctor_assignment_agent import get_learning_curve
from agents.hospital_load_agent import predict_load

app = FastAPI()


@app.on_event("startup")
def startup_event():
    init_db()


# -----------------------------
# Models
# -----------------------------

class PatientIn(BaseModel):
    name: str
    age: int
    heart_rate: Optional[int] = None
    blood_pressure: Optional[str] = None
    oxygen_level: Optional[int] = None
    temperature: Optional[float] = None
    symptoms: Optional[str] = None
    medical_history: Optional[str] = None
    severity: Optional[str] = ""


class AppointmentIn(BaseModel):
    patient_name: str
    age: int
    symptoms: Optional[str] = None
    requested_doctor: Optional[str] = None
    specialization: Optional[str] = None
    appointment_date: Optional[str] = None
    appointment_time: Optional[str] = None


# -----------------------------
# Database Read Endpoints
# -----------------------------

@app.get("/api/doctors")
def get_doctors():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM doctors")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/api/patients")
def get_patients():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM patients ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/api/appointments")
def get_appointments():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM appointments")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/api/rooms")
def get_rooms():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM rooms")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/api/logs")
def get_logs():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


# -----------------------------
# NEW LIVE METRICS ENDPOINT
# -----------------------------

@app.get("/api/live-metrics")
def get_live_metrics():

    conn = get_db()
    cursor = conn.cursor()

    # Patients processed
    cursor.execute("SELECT COUNT(*) as count FROM patients WHERE status='assigned'")
    processed = cursor.fetchone()["count"]

    # AI decisions made (logs)
    cursor.execute("SELECT COUNT(*) as count FROM logs")
    decisions = cursor.fetchone()["count"]

    # Doctor workload utilization
    cursor.execute("SELECT AVG(workload) as avg FROM doctors")
    avg_workload = cursor.fetchone()["avg"] or 0

    utilization = round((avg_workload / 4) * 100, 1)

    conn.close()

    return {
        "patients_processed_today": processed,
        "ai_decisions_made": decisions,
        "avg_triage_time": 2.4,
        "doctor_utilization": utilization
    }


# -----------------------------
# Database Write Endpoints
# -----------------------------

@app.post("/api/patients")
def create_patient(payload: PatientIn):

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO patients
        (name, age, heart_rate, blood_pressure, oxygen_level, temperature, symptoms, medical_history, severity)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        payload.name,
        payload.age,
        payload.heart_rate,
        payload.blood_pressure,
        payload.oxygen_level,
        payload.temperature,
        payload.symptoms,
        payload.medical_history,
        payload.severity
    ))

    conn.commit()
    patient_id = cursor.lastrowid
    conn.close()

    return {"id": patient_id, "status": "waiting"}


@app.post("/api/appointments")
def create_appointment(payload: AppointmentIn):

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO appointments
        (patient_name, age, symptoms, requested_doctor, specialization, appointment_date, appointment_time)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        payload.patient_name,
        payload.age,
        payload.symptoms,
        payload.requested_doctor,
        payload.specialization,
        payload.appointment_date,
        payload.appointment_time
    ))

    conn.commit()
    appt_id = cursor.lastrowid
    conn.close()

    return {"id": appt_id, "status": "pending"}


# -----------------------------
# ML Metrics
# -----------------------------

@app.get("/api/predict-load")
def get_load_prediction():
    load_metrics = predict_load()
    return load_metrics


@app.get("/api/rl-learning")
def get_rl_curve():
    return {"learning_curve": get_learning_curve()}

#-------------------------------
@app.get("/api/replay-timeline")
def get_replay_timeline():

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, message, timestamp
        FROM logs
        ORDER BY timestamp ASC
    """)

    rows = cursor.fetchall()
    conn.close()

    timeline = []

    for i, row in enumerate(rows):
        timeline.append({
            "step": i,
            "message": row["message"],
            "timestamp": row["timestamp"]
        })

    return {"timeline": timeline}
# -----------------------------
# Simulation
# -----------------------------

@app.get("/api/simulation-stream")
def simulation_stream():

    if is_simulation_running():
        return JSONResponse(
            status_code=409,
            content={"error": "Simulation already running"}
        )

    return StreamingResponse(
        run_simulation_generator(),
        media_type="text/event-stream"
    )


@app.post("/api/stop-simulation")
def stop_simulation_endpoint():
    stop_simulation()
    return {"message": "Stop signal sent"}


# -----------------------------
# DEMO DATA & RESET ENDPOINTS
# -----------------------------

@app.post("/api/demo-patients")
def demo_patients():
    conn = get_db()
    cursor = conn.cursor()
    demo_data = [
        # Cardiology
        ("John Cardio", 55, 110, "150/95", 96, 37.1, "Chest pain", "Hypertension", ""),
        ("Jane Heart", 62, 140, "170/100", 94, 37.5, "Cardiac arrest symptoms", "Heart disease", ""),
        ("Mike Beat", 48, 125, "130/85", 97, 36.9, "Irregular heartbeat", "None", ""),
        ("Sarah High", 59, 90, "160/110", 98, 37.0, "Hypertension", "Diabetes", ""),
        # Neurology
        ("Alice Brain", 35, 80, "120/80", 99, 36.8, "Migraine", "None", ""),
        ("Bob Unconscious", 42, 60, "100/60", 92, 36.5, "Unconscious", "None", "emergency"),
        ("Eve Stroke", 68, 100, "180/120", 90, 37.2, "Stroke symptoms", "Hypertension", "critical"),
        ("Tom Trauma", 29, 110, "110/70", 95, 36.7, "Head trauma", "None", "emergency"),
        # Orthopedic
        ("Rick Bone", 25, 85, "125/80", 98, 37.0, "Fracture", "None", ""),
        ("Morty Knee", 30, 75, "115/75", 99, 36.9, "Knee injury", "None", ""),
        ("Summer Back", 45, 82, "130/85", 98, 37.2, "Back pain", "None", ""),
        ("Beth Shoulder", 38, 78, "120/80", 99, 36.8, "Shoulder dislocation", "None", ""),
        # Emergency Medicine
        ("Leo Bleed", 33, 130, "90/60", 94, 36.5, "Severe bleeding", "None", "critical"),
        ("Mia Trauma", 40, 140, "85/50", 90, 36.2, "Multiple trauma", "None", "critical"),
        ("Noah Allergy", 22, 150, "100/65", 88, 37.5, "Anaphylaxis", "Asthma", "emergency"),
        ("Emma Crash", 28, 135, "95/60", 92, 36.8, "Car accident injuries", "None", "critical"),
        # General Medicine
        ("Oliver Fever", 18, 100, "120/80", 98, 39.5, "Fever", "None", ""),
        ("Ava Infection", 45, 95, "125/85", 97, 38.8, "Infection", "None", ""),
        ("Liam Flu", 30, 90, "120/80", 98, 38.5, "Flu symptoms", "None", ""),
        ("Sophia Dry", 70, 105, "110/70", 95, 37.8, "Dehydration", "Diabetes", "")
    ]
    cursor.executemany("""
        INSERT INTO patients
        (name, age, heart_rate, blood_pressure, oxygen_level, temperature, symptoms, medical_history, severity)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, demo_data)
    conn.commit()
    conn.close()
    return {"message": "20 demo patients successfully added to queue."}


@app.post("/api/demo-appointments")
def demo_appointments():
    conn = get_db()
    cursor = conn.cursor()
    demo_data = [
        ("Routine Patient",  40, "Routine checkup",         None, "General Medicine",  None, None),
        ("Migraine Patient", 35, "Migraine consultation",   None, "Neurology",          None, None),
        ("Knee Patient",     50, "Knee pain",               None, "Orthopedic",         None, None),
        ("Fever Patient",    25, "Fever consultation",      None, "General Medicine",  None, None),
        ("Back Patient",     45, "Back pain",               None, "Orthopedic",         None, None),
        ("Therapy Patient",  30, "Therapy session",         None, "Psychology",         None, None),
        ("BP Patient",       60, "Blood pressure review",   None, "Cardiology",         None, None),
        ("Ortho Patient",    55, "Orthopedic follow-up",    None, "Orthopedic",         None, None),
    ]
    cursor.executemany("""
        INSERT INTO appointments
        (patient_name, age, symptoms, requested_doctor, specialization, appointment_date, appointment_time)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, demo_data)
    conn.commit()
    conn.close()
    return {"message": "8 demo appointments successfully added."}


@app.post("/api/reset-db")
def reset_db():
    stop_simulation()
    import time
    time.sleep(0.5)
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM patients")
        cursor.execute("DELETE FROM appointments")
        cursor.execute("DELETE FROM logs")
        cursor.execute("UPDATE doctors SET workload = 0, status = 'available'")
        cursor.execute("UPDATE rooms SET status = 'available', assigned_patient = NULL")
        conn.commit()
        conn.close()
        return {"message": "Database reset complete. Simulation stopped."}
    except Exception as e:
        return {"error": str(e), "message": "Reset failed. Please try again in a moment."}


@app.post("/api/demo-emergency-surge")
def demo_emergency_surge():
    conn = get_db()
    cursor = conn.cursor()
    surge_patients = [
        ("SURGE - Cardiac Arrest", 61, 145, "180/110", 82, 39.5,
         "Cardiac arrest symptoms", "Heart disease", "critical"),
        ("SURGE - Stroke", 72, 160, "190/120", 80, 39.8,
         "Stroke symptoms", "Hypertension", "critical"),
        ("SURGE - Trauma", 34, 140, "80/50", 88, 36.2,
         "Multiple trauma", "None", "critical"),
        ("SURGE - Anaphylaxis", 28, 150, "95/60", 86, 37.5,
         "Anaphylaxis", "Asthma", "critical"),
        ("SURGE - Severe Bleed", 45, 135, "85/55", 90, 36.5,
         "Severe bleeding", "None", "critical"),
    ]
    cursor.executemany("""
        INSERT INTO patients
        (name, age, heart_rate, blood_pressure, oxygen_level, temperature, symptoms, medical_history, severity)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, surge_patients)
    conn.commit()
    conn.close()
    return {"message": "Emergency surge: 5 critical patients added."}