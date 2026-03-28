import Database from 'better-sqlite3';

const db = new Database('hospital.db');

export function initDb() {
  // Create tables
  db.exec(`
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
  `);

  // Insert default doctors if empty
  const doctorCount = db.prepare('SELECT COUNT(*) as count FROM doctors').get() as { count: number };
  if (doctorCount.count === 0) {
    const insertDoctor = db.prepare('INSERT INTO doctors (name, specialization) VALUES (?, ?)');
    insertDoctor.run('Dr Dharnish', 'Cardiology');
    insertDoctor.run('Dr Aswini', 'Neurology');
    insertDoctor.run('Dr Aman', 'General Medicine');
    insertDoctor.run('Dr Arjun', 'Orthopedic');
    insertDoctor.run('Dr Hari', 'Emergency Medicine');
  }

  // Insert default rooms if empty
  const roomCount = db.prepare('SELECT COUNT(*) as count FROM rooms').get() as { count: number };
  if (roomCount.count === 0) {
    const insertRoom = db.prepare('INSERT INTO rooms (room_name, room_type) VALUES (?, ?)');
    insertRoom.run('ER1', 'emergency');
    insertRoom.run('ER2', 'emergency');
    insertRoom.run('ICU1', 'icu');
    insertRoom.run('ICU2', 'icu');
    insertRoom.run('ICU3', 'icu');
    insertRoom.run('Room1', 'room');
    insertRoom.run('Room2', 'room');
    insertRoom.run('Room3', 'room');
    insertRoom.run('Room4', 'room');
    insertRoom.run('Room5', 'room');
    insertRoom.run('Room6', 'room');
  }
}

export default db;
