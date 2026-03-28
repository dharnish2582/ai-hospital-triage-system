import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Activity, Bed, HeartPulse, Stethoscope, PlusCircle, Calendar, PieChart as PieChartIcon, BarChart3, Zap, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#522B5B', '#7A4287', '#3A1E40', '#D4A5D9'];

export function HospitalConfig() {
  const [patients, setPatients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const fetchData = async () => {
    try {
      const [patientsRes, appointmentsRes, doctorsRes, roomsRes] = await Promise.all([
        fetch('/api/patients'),
        fetch('/api/appointments'),
        fetch('/api/doctors'),
        fetch('/api/rooms')
      ]);
      
      if (patientsRes.ok) setPatients(await patientsRes.json());
      if (appointmentsRes.ok) setAppointments(await appointmentsRes.json());
      if (doctorsRes.ok) setDoctors(await doctorsRes.json());
      if (roomsRes.ok) setRooms(await roomsRes.json());
    } catch (error) {
      console.error("Failed to fetch data", error);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll for updates
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadDemoPatients = async () => {
    try {
      await fetch('/api/demo-patients', { method: 'POST' });
      await fetchData();
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 3000);
    } catch (error) {
      console.error("Failed to load demo patients", error);
    }
  };

  const loadDemoAppointments = async () => {
    try {
      await fetch('/api/demo-appointments', { method: 'POST' });
      await fetchData();
    } catch (error) {
      console.error("Failed to load demo appointments", error);
    }
  };

  const startSimulation = async () => {
    try {
      await fetch('/api/start-simulation', { method: 'POST' });
      await fetchData();
    } catch (error) {
      console.error("Failed to start simulation", error);
    }
  };

  // Calculate stats
  const totalRooms = rooms.length;
  const icuBeds = rooms.filter(r => r.room_type === 'icu').length;
  const erRooms = rooms.filter(r => r.room_type === 'emergency').length;
  const totalDoctors = doctors.length;

  const stats = [
    { title: 'Total Rooms', value: totalRooms.toString(), icon: Bed, color: 'text-blue-500', bg: 'bg-blue-100' },
    { title: 'ICU Beds', value: icuBeds.toString(), icon: Activity, color: 'text-rose-500', bg: 'bg-rose-100' },
    { title: 'Emergency Rooms', value: erRooms.toString(), icon: HeartPulse, color: 'text-amber-500', bg: 'bg-amber-100' },
    { title: 'Total Doctors', value: totalDoctors.toString(), icon: Stethoscope, color: 'text-emerald-500', bg: 'bg-emerald-100' },
  ];

  // Calculate department distribution
  const deptMap: Record<string, number> = {};
  patients.forEach(p => {
    if (p.assigned_doctor) {
      const doc = doctors.find(d => d.name === p.assigned_doctor);
      if (doc) {
        deptMap[doc.specialization] = (deptMap[doc.specialization] || 0) + 1;
      }
    }
  });
  
  const departmentData = Object.keys(deptMap).length > 0 
    ? Object.keys(deptMap).map(key => ({ name: key, value: deptMap[key] }))
    : [{ name: 'No Data', value: 1 }];

  const totalAssignedPatients = Object.values(deptMap).reduce((a, b) => a + b, 0);

  const doctorData = doctors.length > 0 ? doctors : [{ name: 'No Doctors', workload: 0 }];

  return (
    <div className="max-w-7xl mx-auto space-y-8 relative z-10 pb-12">
      <header className="mb-8 pt-4">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-800 flex items-center gap-3">
            Hospital Resource Configuration
          </h1>
          <p className="text-slate-500 mt-3 text-lg">
            Configure hospital data and resources before initializing the AI simulation.
          </p>
        </motion.div>
      </header>

      {/* Top Section — Hospital Resource Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-6 flex items-center gap-5 hover:-translate-y-1 transition-transform duration-300"
            >
              <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
                <Icon className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{stat.title}</p>
                <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Middle Section — Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Add Patient to Queue */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ delay: 0.3 }}
          className="glass-card p-8 flex flex-col"
        >
          <h2 className="text-2xl font-semibold text-slate-800 mb-6 flex items-center gap-2">
            <PlusCircle className="text-primary" /> Add Patient
          </h2>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1" onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const data = Object.fromEntries(formData.entries());
            try {
              await fetch('/api/patients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
              });
              await fetchData();
              e.currentTarget.reset();
            } catch (error) {
              console.error("Failed to add patient", error);
            }
          }}>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-600">Patient Name</label>
              <input name="name" required type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-400" placeholder="e.g. John Doe" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-600">Age</label>
              <input name="age" required type="number" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-400" placeholder="e.g. 45" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-600">Heart Rate (bpm)</label>
              <input name="heart_rate" type="number" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-400" placeholder="e.g. 80" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-600">Blood Pressure</label>
              <input name="blood_pressure" type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-400" placeholder="e.g. 120/80" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-600">Oxygen Level (%)</label>
              <input name="oxygen_level" type="number" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-400" placeholder="e.g. 98" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-600">Temperature (°C)</label>
              <input name="temperature" type="number" step="0.1" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-400" placeholder="e.g. 37.0" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-slate-600">Symptoms</label>
              <input name="symptoms" type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-400" placeholder="e.g. Chest pain, shortness of breath" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-slate-600">Medical History</label>
              <input name="medical_history" type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-400" placeholder="e.g. Hypertension, Diabetes" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-slate-600">Arrival Type</label>
              <select name="severity" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-slate-700">
                <option value="Normal">Normal</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>
            <div className="md:col-span-2 pt-4 mt-auto space-y-3">
              <button type="submit" className="w-full py-3.5 rounded-xl bg-primary hover:bg-accent text-white font-semibold shadow-[0_0_20px_rgba(82,43,91,0.4)] hover:shadow-[0_0_25px_rgba(82,43,91,0.6)] transition-all duration-300">
                Add Patient to Queue
              </button>
              <button 
                type="button" 
                onClick={loadDemoPatients}
                className="w-full py-3.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-semibold transition-all duration-300 flex items-center justify-center gap-2 border border-cyan-200"
              >
                <Zap className="w-5 h-5" />
                Load Demo Patients
              </button>
              <p className="text-xs text-center text-slate-500">
                For demo purposes — loads 20 patients with different medical conditions.
              </p>
              {showConfirmation && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-emerald-50 text-emerald-600 text-sm font-medium rounded-lg text-center border border-emerald-100"
                >
                  6 demo patients successfully added to queue.
                </motion.div>
              )}
            </div>
          </form>
        </motion.div>

        {/* Schedule Appointment */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ delay: 0.4 }}
          className="glass-card p-8 flex flex-col"
        >
          <h2 className="text-2xl font-semibold text-slate-800 mb-6 flex items-center gap-2">
            <Calendar className="text-primary" /> Schedule Appointment
          </h2>
          <form className="grid grid-cols-1 gap-5 flex-1" onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const data = Object.fromEntries(formData.entries());
            try {
              await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
              });
              await fetchData();
              e.currentTarget.reset();
            } catch (error) {
              console.error("Failed to add appointment", error);
            }
          }}>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-600">Patient Name</label>
              <input name="patient_name" required type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-400" placeholder="e.g. Jane Smith" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-600">Age</label>
              <input name="age" required type="number" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-400" placeholder="e.g. 30" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-600">Symptoms</label>
              <input name="symptoms" type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-400" placeholder="e.g. Headache" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-600">Doctor Name (Optional)</label>
              <select name="requested_doctor" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-slate-700">
                <option value="">Any Doctor</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.name}>{d.name} ({d.specialization})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-600">Doctor Specialization (Optional)</label>
              <select name="specialization" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-slate-700">
                <option value="">Any Specialization</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Neurology">Neurology</option>
                <option value="Orthopedic">Orthopedic</option>
                <option value="General Medicine">General Medicine</option>
                <option value="Emergency Medicine">Emergency Medicine</option>
              </select>
            </div>
            <div className="pt-4 mt-auto space-y-3">
              <button type="submit" className="w-full py-3.5 rounded-xl bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white font-semibold shadow-sm hover:shadow-[0_0_20px_rgba(82,43,91,0.4)] transition-all duration-300">
                Schedule Appointment
              </button>
              <button 
                type="button" 
                onClick={loadDemoAppointments}
                className="w-full py-3.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-semibold transition-all duration-300 flex items-center justify-center gap-2 border border-cyan-200"
              >
                <Zap className="w-5 h-5" />
                Load Demo Appointments
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      {/* Patient Queue List Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.4 }}
        className="glass-card p-8 flex flex-col"
      >
        <h2 className="text-2xl font-semibold text-slate-800 mb-6 flex items-center gap-2">
          <Users className="text-primary" /> Patient Queue List
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-sm">
                <th className="pb-3 font-medium">Patient Name</th>
                <th className="pb-3 font-medium">Age</th>
                <th className="pb-3 font-medium">Vitals (HR/BP/O2)</th>
                <th className="pb-3 font-medium">Symptoms</th>
                <th className="pb-3 font-medium">Severity</th>
                <th className="pb-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No patients in queue. Add a patient or load demo patients.
                  </td>
                </tr>
              ) : (
                patients.map((patient) => (
                  <tr key={patient.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 text-slate-800 font-medium">{patient.name}</td>
                    <td className="py-4 text-slate-600">{patient.age}</td>
                    <td className="py-4 text-slate-600">
                      {patient.heart_rate || '-'} / {patient.blood_pressure || '-'} / {patient.oxygen_level ? `${patient.oxygen_level}%` : '-'}
                    </td>
                    <td className="py-4 text-slate-600">{patient.symptoms}</td>
                    <td className="py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        patient.severity === 'Normal' ? 'bg-slate-100 text-slate-700' :
                        patient.severity === 'Mild' ? 'bg-blue-100 text-blue-700' :
                        patient.severity === 'Moderate' ? 'bg-amber-100 text-amber-700' :
                        patient.severity === 'Serious' ? 'bg-orange-100 text-orange-700' :
                        patient.severity === 'Emergency' ? 'bg-rose-100 text-rose-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {patient.severity}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <button className="text-primary hover:text-secondary text-sm font-medium transition-colors">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Appointment List Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.45 }}
        className="glass-card p-8 flex flex-col"
      >
        <h2 className="text-2xl font-semibold text-slate-800 mb-6 flex items-center gap-2">
          <Calendar className="text-primary" /> Appointment List
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-sm">
                <th className="pb-3 font-medium">Patient Name</th>
                <th className="pb-3 font-medium">Doctor</th>
                <th className="pb-3 font-medium">Specialization</th>
                <th className="pb-3 font-medium">Date & Time</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No appointments scheduled. Add an appointment or load demo appointments.
                  </td>
                </tr>
              ) : (
                appointments.map((apt) => (
                  <tr key={apt.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 text-slate-800 font-medium">{apt.patient_name}</td>
                    <td className="py-4 text-slate-600">{apt.assigned_doctor || apt.requested_doctor || 'Pending AI'}</td>
                    <td className="py-4 text-slate-600">{apt.specialization || 'Any'}</td>
                    <td className="py-4 text-slate-600">{apt.appointment_date ? `${apt.appointment_date} at ${apt.appointment_time}` : 'Pending AI'}</td>
                    <td className="py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        apt.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                        apt.status === 'rescheduled' ? 'bg-amber-100 text-amber-700' :
                        apt.status === 'canceled' ? 'bg-rose-100 text-rose-700' :
                        apt.status === 'pending' ? 'bg-slate-100 text-slate-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <button className="text-primary hover:text-secondary text-sm font-medium transition-colors">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Bottom Section — Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Doctor Workload Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.5 }}
          className="glass-card p-8 h-[400px] flex flex-col"
        >
          <h2 className="text-2xl font-semibold text-slate-800 mb-6 flex items-center gap-2">
            <BarChart3 className="text-primary" /> Doctor Workload
          </h2>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={doctorData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(82, 43, 91, 0.05)' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
                  formatter={(value: number) => [value, 'Patients']}
                />
                <Bar dataKey="workload" fill="var(--color-primary)" radius={[6, 6, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Department Distribution Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.6 }}
          className="glass-card p-8 h-[400px] flex flex-col"
        >
          <h2 className="text-2xl font-semibold text-slate-800 mb-6 flex items-center gap-2">
            <PieChartIcon className="text-primary" /> Department Distribution
          </h2>
          <div className="flex-1 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={departmentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {departmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} opacity={0.3} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
                  formatter={(value: number, name: string) => [name === 'No Data' ? 0 : value, 'Patients']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold text-slate-800">{totalAssignedPatients}</span>
              <span className="text-sm text-slate-500 font-medium">Assigned Patients</span>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {departmentData.map((dept, idx) => (
              <div key={dept.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="text-sm text-slate-600">{dept.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
