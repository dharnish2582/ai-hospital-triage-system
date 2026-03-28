import numpy as np
from collections import defaultdict

# Beta distribution stats
doctor_stats = defaultdict(lambda: {"success": 1, "failure": 1})

learning_curve = [0]
cumulative_reward = 0
steps = 0


def severity_weight(severity):

    if not severity:
        return 1

    s = severity.lower()

    if s == "critical":
        return 3
    if s == "serious":
        return 2
    if s == "moderate":
        return 1

    return 1


def calculate_reward(workload, min_workload, severity):

    reward = 0

    # Strong reward for least workload doctor
    if workload == min_workload:
        reward += 15
    else:
        reward += max(0, 8 - workload * 2)

    # Overload penalty
    if workload >= 6:
        reward -= 15

    # Severity importance
    reward += severity_weight(severity) * 3

    return reward


def choose_doctor(doctors):

    samples = []

    workloads = [d["workload"] for d in doctors]
    min_workload = min(workloads)

    for d in doctors:

        stats = doctor_stats[d["id"]]

        beta_sample = np.random.beta(
            stats["success"],
            stats["failure"]
        )

        # workload balancing penalty
        workload_penalty = d["workload"] * 0.15

        score = beta_sample - workload_penalty

        samples.append(score)

    best_index = int(np.argmax(samples))

    chosen = doctors[best_index]

    # HARD fallback to least workload if imbalance too large
    least_loaded = min(doctors, key=lambda x: x["workload"])

    if chosen["workload"] - least_loaded["workload"] > 2:
        chosen = least_loaded

    return chosen


def assign_doctor(severity, doctors):

    global cumulative_reward, steps

    if not doctors:
        return None, 0, 0

    chosen = choose_doctor(doctors)

    workloads = [d["workload"] for d in doctors]
    min_workload = min(workloads)

    reward = calculate_reward(
        chosen["workload"],
        min_workload,
        severity
    )

    stats = doctor_stats[chosen["id"]]

    # Update Beta distribution
    if reward > 0:
        stats["success"] += 1
    else:
        stats["failure"] += 1

    cumulative_reward += reward
    steps += 1

    avg_reward = cumulative_reward / steps

    learning_curve.append(round(avg_reward, 2))

    return chosen, reward, avg_reward


def get_learning_curve():

    return learning_curve[-50:]