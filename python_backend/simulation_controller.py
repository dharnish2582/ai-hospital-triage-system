import asyncio
import json

from agents.supervisor_agent import (
    get_waiting_patients,
    mark_patient_processing,
    log_to_db,
    revert_patient_waiting
)

from agents.monitoring_agent import run_monitoring_agent
from agents.severity_agent import run_severity_agent
from agents.department_agent import run_department_agent
from agents.resource_agent import run_resource_agent
from agents.appointment_agent import run_appointment_agent
from agents.digital_twin_agent import simulate_future_state


class SimulationState:
    running = False


def stop_simulation():
    SimulationState.running = False


def is_simulation_running():
    return SimulationState.running


def format_sse(event_type: str, data: dict) -> str:
    payload = {"type": event_type, **data}
    return f"data: {json.dumps(payload)}\n\n"


async def run_simulation_generator():

    SimulationState.running = True

    try:

        # ---------------- SUPERVISOR AGENT ----------------

        supervisor_log = "[Supervisor] Simulation started — Scanning patient queue..."
        log_to_db(supervisor_log)

        yield format_sse("agentUpdate", {
            "agent": "supervisor",
            "statusText": "Supervisor Agent active — Reading patient queue...",
            "log": supervisor_log
        })

        await asyncio.sleep(0.8)

        waiting_patients = get_waiting_patients()

        if not waiting_patients:

            no_patient_log = "[Supervisor] No waiting patients found in queue."
            log_to_db(no_patient_log)

            yield format_sse("agentUpdate", {
                "agent": "supervisor",
                "statusText": "No waiting patients — processing appointments...",
                "log": no_patient_log
            })

        else:

            yield format_sse("agentUpdate", {
                "agent": "supervisor",
                "statusText": f"Supervisor Agent active — Found {len(waiting_patients)} patient(s). Starting triage pipeline...",
                "log": f"[Supervisor] {len(waiting_patients)} patient(s) in queue. Activating agents..."
            })

        processed_count = 0

        # ---------------- PROCESS EACH PATIENT ----------------

        for patient in waiting_patients:

            if not SimulationState.running:
                break

            patient_id = patient["id"]
            patient_name = patient["name"]

            mark_patient_processing(patient_id)

            yield format_sse("patientStatus", {
                "patientId": patient_id,
                "status": "processing"
            })

            # ---------------- MONITORING AGENT ----------------

            await asyncio.sleep(1.0)

            mon_log = f"[Monitoring] Reading vitals for {patient_name}..."
            log_to_db(mon_log)

            yield format_sse("agentUpdate", {
                "agent": "monitoring",
                "statusText": f"Monitoring Agent — Analyzing vitals for {patient_name}",
                "log": mon_log
            })

            try:

                vitals = run_monitoring_agent(patient_id)

            except Exception as e:

                err_log = f"[Monitoring] Error reading vitals for patient {patient_id}: {e}"
                log_to_db(err_log)

                yield format_sse("agentUpdate", {
                    "agent": "monitoring",
                    "statusText": "Monitoring Agent — Error reading vitals",
                    "log": err_log
                })

                continue

            anomalies = vitals.get("anomalies", [])

            anomaly_text = (
                f"Anomalies detected: {'; '.join(anomalies)}"
                if anomalies else "All vitals stable"
            )

            vitals_log = f"[Monitoring] {patient_name} — {anomaly_text}"
            log_to_db(vitals_log)

            yield format_sse("agentUpdate", {
                "agent": "monitoring",
                "statusText": anomaly_text,
                "log": vitals_log
            })

            # ---------------- SEVERITY AGENT ----------------

            await asyncio.sleep(1.0)

            triage_init_log = f"[Severity] Classifying severity for {patient_name}..."
            log_to_db(triage_init_log)

            yield format_sse("agentUpdate", {
                "agent": "triage",
                "statusText": f"Severity Agent — Evaluating {patient_name}",
                "log": triage_init_log
            })

            try:

                severity_res = run_severity_agent(patient_id)

                severity = severity_res.get("severity", "Moderate")
                reason = severity_res.get("reason", "")

            except Exception as e:

                severity = "Moderate"
                reason = f"Severity agent error: {str(e)}"

            triage_log = f"[Severity] {patient_name} → Severity: {severity}. {reason}"
            log_to_db(triage_log)

            yield format_sse("agentUpdate", {
                "agent": "triage",
                "statusText": f"{patient_name} classified as {severity}",
                "log": triage_log
            })

            # ---------------- DEPARTMENT AGENT ----------------

            dept_res = run_department_agent(patient_id)

            department = dept_res.get("department", "General Medicine")

            dept_log = f"[Department] {patient_name} routed to {department}"
            log_to_db(dept_log)

            yield format_sse("agentUpdate", {
                "agent": "department",
                "statusText": dept_log,
                "log": dept_log
            })

            # ---------------- DIGITAL TWIN AGENT ----------------

            future = simulate_future_state()

            dt_log = (
                f"[DigitalTwin] FutureQueue={future['future_queue']} "
                f"AvgWorkload={future['avg_workload']} "
                f"CongestionScore={future['congestion_score']}"
            )

            log_to_db(dt_log)

            yield format_sse("agentUpdate", {
                "agent": "digitalTwin",
                "statusText": "Digital Twin AI — Predicting hospital load",
                "log": dt_log
            })

            await asyncio.sleep(0.8)

            # ---------------- RESOURCE AGENT ----------------

            res_init_log = f"[Resource] Allocating resources for {patient_name} ({severity})..."
            log_to_db(res_init_log)

            yield format_sse("agentUpdate", {
                "agent": "resource",
                "statusText": res_init_log,
                "log": res_init_log
            })

            resource_result = run_resource_agent(
                patient_id,
                severity,
                department
            )

            assignment = resource_result.get("assignment")
            alerts = resource_result.get("alerts", [])

            for alert in alerts:

                log_to_db(f"[Alert] {alert['type']}: {alert['message']}")

                yield format_sse("alert", {
                    "alertType": alert["type"],
                    "message": alert["message"],
                    "color": alert["color"]
                })

                await asyncio.sleep(0.3)

            if assignment:

                processed_count += 1

                rl_log = f"[Doctor RL] Reward: {assignment['rl_reward']} (Thompson Sampling)"
                log_to_db(rl_log)

                assign_log1 = f"[Resource] Doctor {assignment['doctorName']} assigned to {patient_name}"
                assign_log2 = f"[Resource] Room {assignment['roomName']} reserved → Department: {assignment['department']}"

                log_to_db(assign_log1)
                log_to_db(assign_log2)

                yield format_sse("agentUpdate", {
                    "agent": "resource",
                    "statusText": assign_log1,
                    "log": assign_log1
                })

                yield format_sse("agentUpdate", {
                    "agent": "resource",
                    "statusText": assign_log2,
                    "log": assign_log2
                })

            else:

                fail_log = f"[Resource] No resources available for {patient_name} — returned to queue"
                log_to_db(fail_log)

                yield format_sse("agentUpdate", {
                    "agent": "resource",
                    "statusText": fail_log,
                    "log": fail_log
                })

                revert_patient_waiting(patient_id)

            await asyncio.sleep(0.5)

            yield format_sse("dataRefresh", {})

        # ---------------- APPOINTMENT AGENT ----------------

        if SimulationState.running:

            await asyncio.sleep(0.8)

            appt_init_log = "[Appointment] Processing pending appointment requests..."
            log_to_db(appt_init_log)

            yield format_sse("agentUpdate", {
                "agent": "appointment",
                "statusText": "Scheduling appointments...",
                "log": appt_init_log
            })

            appt_res = run_appointment_agent()

            for res in appt_res.get("results", []):

                appt_log = (
                    f"[Appointment] {res['patientName']} → "
                    f"{res['doctorName']} at {res['appointmentTime']}"
                )

                log_to_db(appt_log)

                yield format_sse("agentUpdate", {
                    "agent": "appointment",
                    "statusText": appt_log,
                    "log": appt_log
                })

                await asyncio.sleep(0.4)

        # ---------------- COMPLETION ----------------

        if SimulationState.running:

            complete_log = f"[Supervisor] Simulation complete — {processed_count} patient(s) processed."
            log_to_db(complete_log)

            yield format_sse("complete", {
                "statusText": complete_log,
                "processedCount": processed_count
            })

    except Exception as e:

        import traceback
        traceback.print_exc()

        yield format_sse("error", {
            "message": str(e)
        })

    finally:

        SimulationState.running = False