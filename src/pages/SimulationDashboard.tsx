import { motion } from 'motion/react';
import { Activity, Play, Square, RotateCcw } from 'lucide-react';
import { AIBrainActivity } from '../components/AIBrainActivity';
import { DigitalTwinMap3D } from '../components/DigitalTwinMap3D';
import { PatientQueue } from '../components/PatientQueue';
import { AIDecisionLogs } from '../components/AIDecisionLogs';
import { AgentNetworkGraph } from '../components/AgentNetworkGraph';
import { PerformanceMetrics } from '../components/PerformanceMetrics';
import { useHospitalSimulation } from '../hooks/useHospitalSimulation';

import { useState } from 'react';
import { Toaster } from 'react-hot-toast';

export function SimulationDashboard() {

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const {
    isSimulationRunning,
    startSimulation,
    stopSimulation,
    resetSimulation,
    triggerEmergencySurge,
    activeAgent,
    aiStatusText,
    logs,
    rooms,
    patients,
    doctors,
    metrics,
    metricsHistory,
    loadPrediction,
    rlLearningCurve,
  } = useHospitalSimulation();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 overflow-hidden flex flex-col gap-6 font-sans antialiased">

      <Toaster
        position="top-right"
        toastOptions={{
          className:
            'glass-card border border-white/40 shadow-xl !bg-white/90 backdrop-blur-md',
        }}
      />

      {/* Header */}

      <header className="mb-8 pt-4 flex flex-col items-center justify-center text-center">

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center"
        >

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-800 flex items-center gap-3">

            <div className="p-3 bg-white/80 rounded-2xl shadow-sm border border-white">
              <Activity className="w-8 h-8 text-primary" />
            </div>

            AI Hospital Command Center
          </h1>

          <p className="text-slate-500 mt-3 text-lg mb-6">
            Real-time AI simulation of hospital operations and resource allocation.
          </p>

          {isSimulationRunning ? (

            <div className="flex items-center gap-4">

              <button
                onClick={stopSimulation}
                className="flex items-center gap-2 px-8 py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-full font-bold text-lg"
              >
                <Square className="w-6 h-6 fill-current" />
                STOP AI SIMULATION
              </button>

              <button
                onClick={triggerEmergencySurge}
                className="flex items-center gap-2 px-6 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-full font-bold text-lg animate-pulse"
              >
                🚨 EMERGENCY SURGE
              </button>

            </div>

          ) : (

            <div className="flex items-center gap-4">

              <button
                onClick={startSimulation}
                className="flex items-center gap-2 px-8 py-4 bg-primary hover:bg-accent text-white rounded-full font-bold text-lg"
              >
                <Play className="w-6 h-6 fill-current" />
                START AI SIMULATION
              </button>

              <button
                onClick={resetSimulation}
                className="flex items-center gap-2 px-6 py-4 bg-white/80 hover:bg-white text-slate-700 rounded-full font-semibold border"
              >
                <RotateCcw className="w-5 h-5" />
                Reset Simulation
              </button>

            </div>

          )}

        </motion.div>
      </header>


      {/* Top Section */}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:h-[450px]">

        <motion.div
          className="h-full min-h-0"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <AIBrainActivity activeAgent={activeAgent} statusText={aiStatusText} />
        </motion.div>

        <motion.div
          className="h-full min-h-0 relative group"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >

          <DigitalTwinMap3D
            rooms={rooms}
            doctors={doctors}
            patients={patients}
            selectedPatientId={selectedPatientId}
          />

        </motion.div>

      </div>


      {/* Middle Section */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[400px]">

        <PatientQueue
          patients={patients}
          selectedPatientId={selectedPatientId}
          onSelectPatient={(id) =>
            setSelectedPatientId(id === selectedPatientId ? null : id)
          }
        />

        <AIDecisionLogs logs={logs} />

        <AgentNetworkGraph activeAgent={activeAgent} />

      </div>


      {/* Bottom Section */}

      <div className="grid grid-cols-1 gap-6">

        <PerformanceMetrics
          metrics={metrics}
          metricsHistory={metricsHistory}
          doctors={doctors}
          loadPrediction={loadPrediction}
          rlLearningCurve={rlLearningCurve}
        />

      </div>

    </div>
  );
}