import { motion } from 'motion/react';
import { Brain, Activity, ShieldAlert, Network, CalendarCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { StarsBackground } from './backgrounds/stars';
import { useTheme } from 'next-themes';

const agents = [
  { id: 'supervisor', name: 'Supervisor Agent', icon: Brain },
  { id: 'monitoring', name: 'Monitoring Agent', icon: Activity },
  { id: 'triage', name: 'Triage Agent', icon: ShieldAlert },
  { id: 'resource', name: 'Resource Allocation Agent', icon: Network },
  { id: 'appointment', name: 'Appointment Agent', icon: CalendarCheck },
];

export function AIBrainActivity({
  activeAgent,
  statusText
}: {
  activeAgent: string | null;
  statusText: string;
}) {

  const [displayedText, setDisplayedText] = useState('');
  const { resolvedTheme } = useTheme();

  useEffect(() => {

    let i = 0;
    setDisplayedText('');

    const timer = setInterval(() => {

      if (i < statusText.length) {
        setDisplayedText(statusText.substring(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
      }

    }, 30);

    return () => clearInterval(timer);

  }, [statusText]);

  return (

    <div className="glass-card p-6 flex flex-col h-full relative overflow-hidden">

      {/* Stars Background Animation */}
      <StarsBackground
        starColor={resolvedTheme === 'dark' ? '#FFF' : '#000'}
        className="absolute inset-0 rounded-xl opacity-40"
      />

      {/* Title */}
      <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2 relative z-10">
        <Brain className="text-primary" />
        AI Brain Activity
      </h2>

      {/* Brain Visualization */}
      <div className="flex-1 flex flex-col justify-center items-center mb-6 relative z-10">

        <motion.div
          className="relative w-32 h-32 flex items-center justify-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >

          {/* outer rings */}

          <div className="absolute inset-0 border-4 border-dashed border-primary/30 rounded-full" />

          <div className="absolute inset-2 border-4 border-accent/40 rounded-full" />

          {/* glowing core */}

          <motion.div
            className="absolute inset-4 bg-gradient-to-tr from-primary to-secondary rounded-full opacity-20 blur-md"
            animate={{ scale: [1, 1.25, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />

          {/* brain icon */}

          <Brain className="w-12 h-12 text-primary absolute" />

        </motion.div>

        {/* typing status text */}

        <div className="mt-6 h-8 flex items-center justify-center">

          <p className="text-sm font-mono text-slate-600 text-glow">

            {displayedText}

            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              _
            </motion.span>

          </p>

        </div>

      </div>

      {/* Agent Status List */}

      <div className="space-y-3 relative z-10">

        {agents.map((agent) => {

          const isActive = activeAgent === agent.id;
          const Icon = agent.icon;

          return (

            <motion.div
              key={agent.id}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300
              ${
                isActive
                  ? 'bg-primary/10 border border-primary/50 glow-primary'
                  : 'bg-white/40 border border-white/20'
              }`}
              animate={isActive ? { scale: 1.02 } : { scale: 1 }}
            >

              {/* icon */}

              <div
                className={`p-2 rounded-lg ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              {/* agent name */}

              <span
                className={`text-sm font-medium ${
                  isActive ? 'text-primary' : 'text-slate-600'
                }`}
              >
                {agent.name}
              </span>

              {/* active indicator */}

              {isActive && (

                <motion.div
                  className="ml-auto w-2 h-2 rounded-full bg-primary"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />

              )}

            </motion.div>

          );

        })}

      </div>

    </div>

  );
}