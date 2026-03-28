import { motion, AnimatePresence } from 'motion/react';
import { Users, Clock, CheckCircle2, Loader2 } from 'lucide-react';

export interface Patient {
  id: string | number;
  name: string;
  symptoms: string;
  status: string;
  severity: string;
}

export function PatientQueue({ 
  patients, 
  selectedPatientId, 
  onSelectPatient 
}: { 
  patients: Patient[], 
  selectedPatientId?: string | null,
  onSelectPatient?: (id: string) => void 
}) {
  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'text-red-700 bg-red-100 border-red-200';
      case 'emergency': return 'text-rose-700 bg-rose-100 border-rose-200';
      case 'serious': return 'text-orange-700 bg-orange-100 border-orange-200';
      case 'moderate': return 'text-amber-700 bg-amber-100 border-amber-200';
      case 'mild': return 'text-blue-700 bg-blue-100 border-blue-200';
      case 'normal': return 'text-slate-700 bg-slate-100 border-slate-200';
      default: return 'text-slate-500 bg-slate-50 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'waiting': return <Clock className="w-4 h-4 text-slate-400" />;
      case 'processing': return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case 'assigned': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      default: return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="glass-card p-6 h-full flex flex-col">
      <h2 className="text-xl font-semibold text-slate-800 mb-6 flex items-center gap-2">
        <Users className="text-primary" /> Patient Queue
      </h2>
      
      <div className="flex-1 overflow-y-auto pr-2 space-y-3">
        <AnimatePresence>
          {patients.map((patient) => (
            <motion.div
              key={patient.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              layout
              onClick={() => onSelectPatient && onSelectPatient(patient.id.toString())}
              className={`p-4 rounded-xl border shadow-sm transition-all cursor-pointer ${
                selectedPatientId === patient.id.toString() 
                  ? 'bg-fuchsia-50/90 border-fuchsia-400 shadow-fuchsia-200/50 shadow-md transform scale-[1.02]' 
                  : 'bg-white/60 border-white/40 hover:shadow-md'
              } flex items-center justify-between`}
            >
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-slate-800">{patient.name}</span>
                <span className="text-sm text-slate-500 flex items-center gap-2">
                  {patient.symptoms}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium uppercase tracking-wider ${getSeverityColor(patient.severity)}`}>
                    {patient.severity || 'Unknown'}
                  </span>
                </span>
              </div>
              
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-full text-xs font-medium text-slate-600">
                  {getStatusIcon(patient.status)}
                  {patient.status ? patient.status.charAt(0).toUpperCase() + patient.status.slice(1) : 'Unknown'}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {patients.length === 0 && (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
            No patients in queue
          </div>
        )}
      </div>
    </div>
  );
}
