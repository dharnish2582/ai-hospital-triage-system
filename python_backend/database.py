import sqlite3
import os

# Path to the existing SQLite database
# The Python backend runs in python_backend/, so the DB is one level up.
DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'hospital.db')

def get_db():
    """Returns a new database connection with dictionary row factory."""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    # Create tables
    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS doctors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            specialization TEXT NOT NULL,
            workload INTEGER DEFAULT 0,
            status TEXT DEFAULT 'available'
        );

        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            age INTEGER NOT NULL,
            heart_rate INTEGER,
            blood_pressure TEXT,
            oxygen_level INTEGER,
            temperature REAL,
            symptoms TEXT,
            medical_history TEXT,
            severity TEXT,
            status TEXT DEFAULT 'waiting',
            assigned_doctor TEXT,
            assigned_room TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_name TEXT NOT NULL,
            age INTEGER NOT NULL,
            symptoms TEXT,
            requested_doctor TEXT,
            specialization TEXT,
            appointment_date TEXT,
            appointment_time TEXT,
            assigned_doctor TEXT,
            status TEXT DEFAULT 'pending'
        );

        CREATE TABLE IF NOT EXISTS rooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_name TEXT NOT NULL,
            room_type TEXT NOT NULL,
            status TEXT DEFAULT 'available',
            assigned_patient TEXT
        );

        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()

    # Insert default doctors if empty (9 doctors, 6 departments)
    cursor.execute("SELECT COUNT(*) FROM doctors")
    if cursor.fetchone()[0] == 0:
        cursor.executemany(
            "INSERT INTO doctors (name, specialization) VALUES (?, ?)",
            [
                ('Dr Dharnish',     'Cardiology'),
                ('Dr Arundhathi',   'Cardiology'),
                ('Dr Aswini',       'Neurology'),
                ('Dr Divya',        'Neurology'),
                ('Dr Arjun',        'Orthopedic'),
                ('Dr Hari',         'Orthopedic'),
                ('Dr Amanraj',      'Emergency Medicine'),
                ('Dr Dharshiha',    'General Medicine'),
                ('Dr Sakthimeena',  'Psychology')
            ]
        )
        conn.commit()

    # Insert default rooms if empty (30 total: 10 general, 10 ICU, 10 emergency)
    cursor.execute("SELECT COUNT(*) FROM rooms")
    if cursor.fetchone()[0] == 0:
        rooms_data = []
        for i in range(1, 11):
            rooms_data.append((f'Room{i}', 'room'))
        for i in range(1, 11):
            rooms_data.append((f'ICU{i}', 'icu'))
        for i in range(1, 11):
            rooms_data.append((f'ER{i}', 'emergency'))
        cursor.executemany(
            "INSERT INTO rooms (room_name, room_type) VALUES (?, ?)",
            rooms_data
        )
        conn.commit()
    conn.close()

    print("DB PATH:", DB_PATH)

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
