from database import get_db
import time
import math
from collections import defaultdict

# bandit statistics
patient_stats = defaultdict(lambda: {"count": 0, "reward": 0})

total_steps = 0


def survival_probability(patient):

    hr = patient["heart_rate"] or 80
    o2 = patient["oxygen_level"] or 98

    score = 100

    if hr > 140:
        score -= 20

    if o2 < 90:
        score -= 30

    return score


def waiting_score(created):

    now = time.time()

    try:
        created = time.mktime(time.strptime(created, "%Y-%m-%d %H:%M:%S"))
    except:
        return 0

    wait = (now - created) / 60

    return min(wait, 30)


def severity_score(sev):

    if not sev:
        return 10

    s = sev.lower()

    if s == "critical":
        return 100

    if s == "serious":
        return 60

    if s == "moderate":
        return 30

    return 10


def base_priority(patient):

    sev = severity_score(patient["severity"])

    wait = waiting_score(patient["created_at"])

    survival = survival_probability(patient)

    return sev + wait + (100 - survival)


def compute_ucb(patient):

    global total_steps

    pid = patient["id"]

    stats = patient_stats[pid]

    base = base_priority(patient)

    if stats["count"] == 0:
        return base + 50

    avg_reward = stats["reward"] / stats["count"]

    exploration = math.sqrt(
        (2 * math.log(total_steps + 1)) / stats["count"]
    )

    return base + avg_reward + exploration * 20


def get_priority_queue():

    global total_steps

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM patients WHERE status='waiting'")

    rows = cursor.fetchall()

    conn.close()

    patients = [dict(r) for r in rows]

    total_steps += 1

    for p in patients:

        score = compute_ucb(p)

        p["priority_score"] = score

        stats = patient_stats[p["id"]]

        reward = base_priority(p)

        stats["count"] += 1
        stats["reward"] += reward

    patients.sort(
        key=lambda x: x["priority_score"],
        reverse=True
    )

    return patients