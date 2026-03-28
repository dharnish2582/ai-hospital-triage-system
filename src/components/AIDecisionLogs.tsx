import { motion, AnimatePresence } from 'motion/react';
import {
  Terminal,
  Brain,
  Activity,
  Shield,
  CalendarCheck,
  Network
} from 'lucide-react';
import { useEffect, useRef } from 'react';

interface Props {
  logs: string[];
}

/* --------------------------
   Detect agent icon
-------------------------- */

function getAgentIcon(log: string) {

  if (log.includes("[Supervisor]"))
    return <Brain className="w-4 h-4 text-indigo-500" />;

  if (log.includes("[Monitoring]"))
    return <Activity className="w-4 h-4 text-emerald-500" />;

  if (log.includes("[Severity]") || log.includes("[Triage]"))
    return <Shield className="w-4 h-4 text-orange-500" />;

  if (log.includes("[Resource]"))
    return <Network className="w-4 h-4 text-blue-500" />;

  if (log.includes("[Appointment]"))
    return <CalendarCheck className="w-4 h-4 text-purple-500" />;

  return <Terminal className="w-4 h-4 text-slate-400" />;
}

/* --------------------------
   Agent color styling
-------------------------- */

function getAgentColor(log: string) {

  if (log.includes("[Supervisor]"))
    return "border-indigo-200 bg-indigo-50";

  if (log.includes("[Monitoring]"))
    return "border-emerald-200 bg-emerald-50";

  if (log.includes("[Severity]") || log.includes("[Triage]"))
    return "border-orange-200 bg-orange-50";

  if (log.includes("[Resource]"))
    return "border-blue-200 bg-blue-50";

  if (log.includes("[Appointment]"))
    return "border-purple-200 bg-purple-50";

  return "border-slate-200 bg-white/50";
}

/* --------------------------
   Remove [Agent] prefix
-------------------------- */

function cleanLog(log: string) {
  return log.replace(/\[.*?\]\s*/, "");
}

/* --------------------------
   Component
-------------------------- */

export function AIDecisionLogs({ logs }: Props) {

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {

    if (scrollRef.current) {
      scrollRef.current.scrollTop =
        scrollRef.current.scrollHeight;
    }

  }, [logs]);

  return (

    <div className="glass-card p-6 h-full flex flex-col">

      <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Terminal className="text-primary" />
        AI Decision Logs
      </h2>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto pr-2 font-mono text-sm space-y-2 pb-4 scroll-smooth"
      >

        <AnimatePresence initial={false}>

          {logs.map((log, index) => (

            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`break-words p-2 rounded-lg border shadow-sm flex items-start gap-2 ${getAgentColor(log)}`}
            >

              {getAgentIcon(log)}

              <span className="text-slate-700">
                {cleanLog(log)}
              </span>

            </motion.div>

          ))}

        </AnimatePresence>

        {logs.length === 0 && (
          <div className="text-slate-400 italic">
            Waiting for AI initialization...
          </div>
        )}

      </div>

      <div className="mt-4 pt-4 border-t border-slate-200/50 flex items-center gap-2 text-xs text-slate-500 font-medium">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
        System Online - Logging active
      </div>

    </div>
  );
}