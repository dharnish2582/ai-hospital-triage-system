import { motion } from 'motion/react';
import { Bed, Activity, User, Stethoscope } from 'lucide-react';

export type RoomStatus = 'available' | 'occupied' | 'reserved';

export interface Room {
  id: string;
  name: string;
  type: 'ER' | 'ICU' | 'Room';
  status: RoomStatus;
  patientId?: string;
  doctorId?: string;
}

export function DigitalTwinMap({ rooms, doctors }: { rooms: Room[], doctors: any[] }) {
  const getStatusColor = (status: RoomStatus) => {
    switch (status) {
      case 'available': return 'bg-emerald-100 border-emerald-300 text-emerald-700';
      case 'occupied': return 'bg-rose-100 border-rose-300 text-rose-700';
      case 'reserved': return 'bg-amber-100 border-amber-300 text-amber-700';
      default: return 'bg-slate-100 border-slate-300 text-slate-700';
    }
  };

  const getStatusIcon = (status: RoomStatus) => {
    switch (status) {
      case 'available': return <Bed className="w-5 h-5" />;
      case 'occupied': return <User className="w-5 h-5" />;
      case 'reserved': return <Activity className="w-5 h-5" />;
      default: return <Bed className="w-5 h-5" />;
    }
  };

  const renderRoomGroup = (type: 'ER' | 'ICU' | 'Room', title: string) => {
    const groupRooms = rooms.filter(r => r.type === type);
    return (
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">{title}</h3>
        <div className="grid grid-cols-3 gap-4">
          {groupRooms.map(room => (
            <motion.div
              key={room.id}
              layoutId={`room-${room.id}`}
              className={`relative p-4 rounded-xl border-2 transition-colors duration-300 flex flex-col items-center justify-center gap-2 ${getStatusColor(room.status)}`}
              whileHover={{ scale: 1.05 }}
            >
              <div className="absolute top-2 right-2 flex gap-1">
                {room.doctorId && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-md"
                    title={`Doctor ${room.doctorId}`}
                  >
                    <Stethoscope className="w-3 h-3" />
                  </motion.div>
                )}
              </div>
              
              {getStatusIcon(room.status)}
              <span className="font-medium text-sm">{room.name}</span>
              
              {room.status === 'occupied' && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500 rounded-b-xl"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="glass-card p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <Activity className="text-primary" /> Digital Twin Hospital
        </h2>
        <div className="flex gap-4 text-xs font-medium">
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-emerald-400" /> Available</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-amber-400" /> Reserved</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-rose-400" /> Occupied</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        {renderRoomGroup('ER', 'Emergency Room')}
        {renderRoomGroup('ICU', 'Intensive Care Unit')}
        {renderRoomGroup('Room', 'General Wards')}
      </div>
    </div>
  );
}
