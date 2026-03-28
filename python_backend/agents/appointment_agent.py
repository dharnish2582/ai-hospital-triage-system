import datetime
from database import get_db


# ---------------------------------------
# APPOINTMENT TIME SLOT GENERATOR
# ---------------------------------------

def format_appointment_time(base_hour, doctor_workload):

    slot_minutes = doctor_workload * 30

    total_minutes = base_hour * 60 + slot_minutes

    hours = (total_minutes // 60) % 24
    minutes = total_minutes % 60

    period = "PM" if hours >= 12 else "AM"

    display_hour = hours - 12 if hours > 12 else (12 if hours == 0 else hours)

    return f"{display_hour:02d}:{minutes:02d} {period}"


# ---------------------------------------
# FIND BEST DOCTOR
# ---------------------------------------

def find_best_doctor(cursor, specialization):

    if specialization:

        cursor.execute("""
            SELECT *
            FROM doctors
            WHERE specialization=?
            ORDER BY workload ASC
        """, (specialization,))

        doctors = cursor.fetchall()

        if doctors:
            return doctors[0]

    cursor.execute("""
        SELECT *
        FROM doctors
        ORDER BY workload ASC
    """)

    doctors = cursor.fetchall()

    if doctors:
        return doctors[0]

    return None


# ---------------------------------------
# APPOINTMENT AGENT
# ---------------------------------------

def run_appointment_agent():

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT *
        FROM appointments
        WHERE status='pending'
    """)

    pending = cursor.fetchall()

    results = []
    alerts = []

    today = datetime.datetime.now().strftime("%Y-%m-%d")

    for appt in pending:

        doctor = None

        # ---------------------------------------
        # REQUESTED DOCTOR
        # ---------------------------------------

        if appt["requested_doctor"]:

            cursor.execute(
                "SELECT * FROM doctors WHERE name=?",
                (appt["requested_doctor"],)
            )

            doctor = cursor.fetchone()

        # ---------------------------------------
        # SPECIALIZATION MATCH
        # ---------------------------------------

        if not doctor:

            doctor = find_best_doctor(
                cursor,
                appt["specialization"]
            )

        if not doctor:
            continue

        # ---------------------------------------
        # DOCTOR OVERLOAD CHECK
        # ---------------------------------------

        if doctor["workload"] >= 6:

            alerts.append({
                "type": "DOCTOR OVERLOAD",
                "color": "orange",
                "message": f"{doctor['name']} schedule full"
            })

            continue

        # ---------------------------------------
        # TIME SLOT ASSIGNMENT
        # ---------------------------------------

        appointment_time = format_appointment_time(
            9,
            doctor["workload"]
        )

        try:

            cursor.execute("BEGIN")

            cursor.execute(
                "UPDATE doctors SET workload = workload + 1 WHERE id=?",
                (doctor["id"],)
            )

            cursor.execute("""
                UPDATE appointments
                SET status='scheduled',
                    assigned_doctor=?,
                    appointment_date=?,
                    appointment_time=?
                WHERE id=?
            """, (
                doctor["name"],
                today,
                appointment_time,
                appt["id"]
            ))

            conn.commit()

        except Exception as e:

            conn.rollback()
            print("Appointment scheduling failed:", e)

            alerts.append({
                "type": "SCHEDULING ERROR",
                "color": "red",
                "message": f"Failed scheduling appointment {appt['id']}"
            })

            continue

        results.append({
            "appointmentId": appt["id"],
            "patientName": appt["patient_name"],
            "doctorName": doctor["name"],
            "appointmentDate": today,
            "appointmentTime": appointment_time
        })

    conn.close()

    return {
        "results": results,
        "alerts": alerts
    }