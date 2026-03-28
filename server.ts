import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import db, { initDb } from './database.js';
import { runSimulation, stopSimulation, isSimulationRunning } from './simulationController.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize DB
  initDb();

  // ── DATABASE READ ENDPOINTS ───────────────────────────────────────

  app.get('/api/doctors', (req, res) => {
    const doctors = db.prepare('SELECT * FROM doctors').all();
    res.json(doctors);
  });

  app.get('/api/patients', (req, res) => {
    const patients = db.prepare('SELECT * FROM patients ORDER BY created_at DESC').all();
    res.json(patients);
  });

  app.get('/api/appointments', (req, res) => {
    const appointments = db.prepare('SELECT * FROM appointments').all();
    res.json(appointments);
  });

  app.get('/api/rooms', (req, res) => {
    const rooms = db.prepare('SELECT * FROM rooms').all();
    res.json(rooms);
  });

  app.get('/api/logs', (req, res) => {
    const logs = db.prepare('SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100').all();
    res.json(logs);
  });

  // ── DATABASE WRITE ENDPOINTS ─────────────────────────────────────

  app.post('/api/patients', (req, res) => {
    const { name, age, heart_rate, blood_pressure, oxygen_level, temperature, symptoms, medical_history, severity } = req.body;
    const stmt = db.prepare(`
      INSERT INTO patients (name, age, heart_rate, blood_pressure, oxygen_level, temperature, symptoms, medical_history, severity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(name, age, heart_rate, blood_pressure, oxygen_level, temperature, symptoms, medical_history, severity);
    res.json({ id: info.lastInsertRowid, status: 'waiting' });
  });

  app.post('/api/appointments', (req, res) => {
    const { patient_name, age, symptoms, requested_doctor, specialization, appointment_date, appointment_time } = req.body;
    const stmt = db.prepare(`
      INSERT INTO appointments (patient_name, age, symptoms, requested_doctor, specialization, appointment_date, appointment_time)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(patient_name, age, symptoms, requested_doctor, specialization, appointment_date, appointment_time);
    res.json({ id: info.lastInsertRowid, status: 'pending' });
  });

  // ── DEMO DATA ENDPOINTS ─────────────────────────────────────────

  app.post('/api/demo-patients', (req, res) => {
    const demoPatients = [
      { name: 'Arun Kumar', age: 25, heart_rate: 72, blood_pressure: '120/80', oxygen_level: 98, temperature: 36.8, symptoms: 'Mild headache', medical_history: 'None', severity: '' },
      { name: 'Priya Sharma', age: 32, heart_rate: 85, blood_pressure: '118/78', oxygen_level: 97, temperature: 37.2, symptoms: 'Fever', medical_history: 'Cold history', severity: '' },
      { name: 'Rahul Verma', age: 45, heart_rate: 105, blood_pressure: '140/90', oxygen_level: 95, temperature: 38.4, symptoms: 'Chest discomfort', medical_history: 'Hypertension', severity: '' },
      { name: 'Maria Joseph', age: 61, heart_rate: 130, blood_pressure: '160/100', oxygen_level: 88, temperature: 39.0, symptoms: 'Breathing difficulty', medical_history: 'Asthma', severity: '' },
      { name: 'Ahmed Khan', age: 54, heart_rate: 120, blood_pressure: '150/95', oxygen_level: 92, temperature: 38.7, symptoms: 'Severe chest pain', medical_history: 'Heart disease', severity: '' },
      { name: 'Ramesh Patel', age: 68, heart_rate: 145, blood_pressure: '170/110', oxygen_level: 82, temperature: 39.5, symptoms: 'Cardiac arrest symptoms', medical_history: 'Heart disease + diabetes', severity: '' }
    ];

    const stmt = db.prepare(`
      INSERT INTO patients (name, age, heart_rate, blood_pressure, oxygen_level, temperature, symptoms, medical_history)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((patients: typeof demoPatients) => {
      for (const p of patients) {
        stmt.run(p.name, p.age, p.heart_rate, p.blood_pressure, p.oxygen_level, p.temperature, p.symptoms, p.medical_history);
      }
    });

    insertMany(demoPatients);
    res.json({ message: '6 demo patients successfully added to queue.' });
  });

  app.post('/api/demo-appointments', (req, res) => {
    const demoAppointments = [
      { patient_name: 'Jane Smith', age: 28, symptoms: 'Routine checkup', requested_doctor: 'Dr Dharnish', specialization: null },
      { patient_name: 'Robert Johnson', age: 45, symptoms: 'Migraine', requested_doctor: null, specialization: 'Neurology' },
      { patient_name: 'Michael Brown', age: 35, symptoms: 'Knee pain', requested_doctor: 'Dr Arjun', specialization: null },
      { patient_name: 'Emily Davis', age: 50, symptoms: 'Fever', requested_doctor: null, specialization: 'General Medicine' },
      { patient_name: 'William Wilson', age: 60, symptoms: 'Chest pain', requested_doctor: null, specialization: 'Cardiology' },
      { patient_name: 'Sarah Connor', age: 30, symptoms: 'Back pain', requested_doctor: null, specialization: 'Orthopedic' }
    ];

    const stmt = db.prepare(`
      INSERT INTO appointments (patient_name, age, symptoms, requested_doctor, specialization)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((apps: typeof demoAppointments) => {
      for (const a of apps) {
        stmt.run(a.patient_name, a.age, a.symptoms, a.requested_doctor, a.specialization);
      }
    });

    insertMany(demoAppointments);
    res.json({ message: '6 demo appointments successfully added.' });
  });

  // ── SIMULATION SSE ENDPOINT ────────────────────────────────────

  /**
   * GET /api/simulation-stream
   * Starts the multi-agent simulation and streams events via SSE.
   * The client should open this as an EventSource.
   */
  app.get('/api/simulation-stream', async (req, res) => {
    if (isSimulationRunning()) {
      res.status(409).json({ error: 'Simulation already running' });
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    // Send a heartbeat comment to keep the connection alive
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      stopSimulation();
    });

    try {
      await runSimulation(res);
    } catch (err) {
      console.error('[Server] Simulation stream error:', err);
    } finally {
      clearInterval(heartbeat);
      res.end();
    }
  });

  /**
   * POST /api/stop-simulation
   * Terminates a running simulation.
   */
  app.post('/api/stop-simulation', (req, res) => {
    stopSimulation();
    res.json({ message: 'Stop signal sent' });
  });

  /**
   * POST /api/reset-db
   * Resets patients, appointments, rooms, doctors workload, and logs for a fresh simulation.
   */
  app.post('/api/reset-db', (req, res) => {
    try {
      stopSimulation();
      db.exec(`
        DELETE FROM patients;
        DELETE FROM appointments;
        DELETE FROM logs;
        UPDATE rooms SET status = 'available', assigned_patient = NULL;
        UPDATE doctors SET workload = 0, status = 'available';
      `);
      res.json({ message: 'Database reset successfully' });
    } catch (err) {
      console.error('[Server] Reset error:', err);
      res.status(500).json({ error: 'Failed to reset database' });
    }
  });

  /**
   * POST /api/demo-emergency-surge
   * Adds 4 critical/serious patients for emergency scenario.
   */
  app.post('/api/demo-emergency-surge', (req, res) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO patients (name, age, heart_rate, blood_pressure, oxygen_level, temperature, symptoms, medical_history)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const surgePatients = [
        ['John Doe', 45, 140, '180/120', 88, 38.5, 'Severe chest pain, shortness of breath', 'Hypertension'],
        ['Jane Smith', 62, 50, '90/60', 92, 35.8, 'Unconscious, head trauma', 'None'],
        ['Mike Johnson', 28, 130, '100/70', 95, 36.5, 'Multiple fractures, internal bleeding', 'None'],
        ['Sarah Lee', 34, 150, '85/50', 85, 39.2, 'Severe allergic reaction, anaphylaxis', 'Asthma']
      ];

      db.transaction(() => {
        for (const p of surgePatients) {
          stmt.run(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7]);
        }
      })();

      res.json({ message: 'Emergency surge initiated' });
    } catch (err) {
      console.error('[Server] Surge error:', err);
      res.status(500).json({ error: 'Failed to trigger emergency surge' });
    }
  });

  // Legacy synchronous start-simulation endpoint (kept for compatibility)
  app.post('/api/start-simulation', (req, res) => {
    res.json({ message: 'Use GET /api/simulation-stream for real-time simulation.' });
  });

  // ── VITE MIDDLEWARE ──────────────────────────────────────────────

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
