import { motion } from 'motion/react';
import { Network, Brain, Activity, ShieldAlert, CalendarCheck } from 'lucide-react';

const agents = [
  { id: 'supervisor', name: 'Supervisor', icon: Brain, x: 50, y: 20 },
  { id: 'monitoring', name: 'Monitoring', icon: Activity, x: 20, y: 50 },
  { id: 'triage', name: 'Triage', icon: ShieldAlert, x: 80, y: 50 },
  { id: 'resource', name: 'Resource', icon: Network, x: 35, y: 80 },
  { id: 'appointment', name: 'Appointment', icon: CalendarCheck, x: 65, y: 80 },
];

const connections = [
  { from: 'supervisor', to: 'monitoring' },
  { from: 'supervisor', to: 'triage' },
  { from: 'monitoring', to: 'triage' },
  { from: 'triage', to: 'resource' },
  { from: 'resource', to: 'appointment' },
  { from: 'supervisor', to: 'appointment' },
];

export function AgentNetworkGraph({ activeAgent }: { activeAgent: string | null }) {
  return (
    <div className="glass-card p-6 h-full flex flex-col relative overflow-hidden">
      <h2 className="text-xl font-semibold text-slate-800 mb-6 flex items-center gap-2 z-10">
        <Network className="text-primary" /> AI Agent Network
      </h2>
      
      <div className="flex-1 relative">
        {/* Draw connections */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {connections.map((conn, i) => {
            const fromAgent = agents.find(a => a.id === conn.from);
            const toAgent = agents.find(a => a.id === conn.to);
            if (!fromAgent || !toAgent) return null;
            
            const isActive = activeAgent === conn.from || activeAgent === conn.to;
            
            return (
              <motion.line
                key={i}
                x1={`${fromAgent.x}%`}
                y1={`${fromAgent.y}%`}
                x2={`${toAgent.x}%`}
                y2={`${toAgent.y}%`}
                stroke={isActive ? 'var(--color-primary)' : 'rgba(148, 163, 184, 0.3)'}
                strokeWidth={isActive ? 2 : 1}
                strokeDasharray={isActive ? '5,5' : 'none'}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1 }}
              />
            );
          })}
          
          {/* Animated active connection particles */}
          {connections.map((conn, i) => {
            const fromAgent = agents.find(a => a.id === conn.from);
            const toAgent = agents.find(a => a.id === conn.to);
            if (!fromAgent || !toAgent) return null;
            
            const isActive = activeAgent === conn.from;
            
            if (!isActive) return null;
            
            return (
              <motion.circle
                key={`particle-${i}`}
                r="3"
                fill="var(--color-primary)"
                initial={{ cx: `${fromAgent.x}%`, cy: `${fromAgent.y}%`, opacity: 0 }}
                animate={{ 
                  cx: [`${fromAgent.x}%`, `${toAgent.x}%`], 
                  cy: [`${fromAgent.y}%`, `${toAgent.y}%`],
                  opacity: [0, 1, 0]
                }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
            );
          })}
        </svg>

        {/* Draw nodes */}
        {agents.map((agent) => {
          const isActive = activeAgent === agent.id;
          const Icon = agent.icon;
          
          return (
            <motion.div
              key={agent.id}
              className={`absolute flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2`}
              style={{ left: `${agent.x}%`, top: `${agent.y}%` }}
              animate={isActive ? { scale: 1.1 } : { scale: 1 }}
            >
              <div 
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors duration-300 z-10 ${
                  isActive ? 'bg-primary text-white glow-primary' : 'bg-white text-slate-500 border border-slate-200'
                }`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <span className={`mt-2 text-xs font-medium whitespace-nowrap bg-white/80 px-2 py-1 rounded-md shadow-sm ${
                isActive ? 'text-primary' : 'text-slate-600'
              }`}>
                {agent.name}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
