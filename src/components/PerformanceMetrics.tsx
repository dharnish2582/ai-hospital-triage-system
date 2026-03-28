import { motion } from 'motion/react';
import { Percent, Activity, TrendingUp, Briefcase, BarChart2 } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

export interface Metrics {
  processed: number;
  avgWaitTime: number;
  utilization: number;
  efficiency: number;
}

interface PerformanceMetricsProps {
  metrics: Metrics;
  metricsHistory: { time: string; processed: number; avgWait: number }[];
  doctors: any[];
  loadPrediction?: any;
  rlLearningCurve?: number[];
}

export function PerformanceMetrics({
  metrics,
  metricsHistory,
  doctors = [],
  loadPrediction,
  rlLearningCurve = []
}: PerformanceMetricsProps) {

  // ---------- FIXED DOCTOR DATA ----------
  const workloadData =
    doctors && doctors.length > 0
      ? doctors.map((d) => ({
        name: (d.name || "").replace("Dr ", ""),
        workload: Number(d.workload || 0)
      }))
      : [{ name: "Loading", workload: 0 }];

  // ---------- RL LEARNING ----------
  const rlData = rlLearningCurve.map((val, idx) => ({
    step: idx + 1,
    reward: val
  }));

  // ---------- LOAD PREDICTION ----------
  const loadHist = loadPrediction?.load_history || [];

  const loadData = [
    { time: 0, load: 0 },
    ...loadHist.map((val: number, idx: number) => ({
      time: idx + 1,
      load: val
    }))
  ];

  return (
    <div className="glass-card p-6 h-full flex flex-col">

      <h2 className="text-xl font-semibold text-slate-800 mb-6 flex items-center gap-2">
        <Percent className="text-primary" />
        AIML Performance Metrics
      </h2>

      {/* TOP ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[220px]">

        {/* LIVE METRICS */}
        <motion.div
          className="flex flex-col bg-white/40 p-4 rounded-xl shadow-inner border border-white/50"
          whileHover={{ scale: 1.02 }}
        >

          <div className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1">
            <BarChart2 className="w-4 h-4 text-emerald-500" />
            Live Metrics
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">

            <div>
              <p className="text-xs text-slate-500">Patients Processed</p>
              <p className="text-xl font-bold text-emerald-600">
                {metrics.processed}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">AI Decisions</p>
              <p className="text-xl font-bold text-blue-600">
                {metrics.processed * 4}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Avg Triage Time</p>
              <p className="text-xl font-bold text-purple-600">
                {metrics.avgWaitTime}s
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Doctor Utilization</p>
              <p className="text-xl font-bold text-orange-600">
                {metrics.utilization}%
              </p>
            </div>

          </div>

        </motion.div>

        {/* RL LEARNING CURVE */}
        <motion.div
          className="flex flex-col bg-white/40 p-4 rounded-xl shadow-inner border border-white/50"
          whileHover={{ scale: 1.02 }}
        >

          <div className="flex justify-between mb-2">
            <span className="text-sm font-semibold flex items-center gap-1">
              <Activity className="w-4 h-4 text-cyan-500" />
              RL Learning Curve
            </span>

            <span className="text-lg font-bold text-cyan-500">
              {rlData.length > 0
                ? `Score: ${rlData[rlData.length - 1].reward}`
                : "N/A"}
            </span>
          </div>

          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={rlData}>
              <XAxis dataKey="step" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="reward"
                stroke="#06b6d4"
                strokeWidth={3}
                dot
              />
            </LineChart>
          </ResponsiveContainer>

        </motion.div>

        {/* LOAD PREDICTION */}
        <motion.div
          className="flex flex-col bg-white/40 p-4 rounded-xl shadow-inner border border-white/50"
          whileHover={{ scale: 1.02 }}
        >

          <div className="flex justify-between mb-2">
            <span className="text-sm font-semibold flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              Predict Load
            </span>

            <span className="text-lg font-bold text-orange-500">
              {loadPrediction?.predicted_load || 0} pts/hr
            </span>
          </div>

          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={loadData}>
              <XAxis dataKey="time" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="load"
                stroke="#f97316"
                strokeWidth={3}
                dot
              />
            </LineChart>
          </ResponsiveContainer>

        </motion.div>

      </div>

      {/* DOCTOR WORKLOAD */}
      {/* DOCTOR WORKLOAD */}
      <div className="mt-6">

        <motion.div
          className="bg-white/40 p-4 rounded-xl shadow-inner border border-white/50"
          whileHover={{ scale: 1.01 }}
        >

          <div className="flex justify-between mb-4">
            <span className="text-sm font-semibold flex items-center gap-1">
              <Briefcase className="w-4 h-4 text-purple-500" />
              Doctor Workload
            </span>

            <span className="text-lg font-bold text-purple-500">
              {metrics.utilization}% util
            </span>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={workloadData}>

              <XAxis
                dataKey="name"
                angle={-20}
                textAnchor="end"
                interval={0}
                height={70}
                stroke="#64748b"
              />

              <YAxis
                domain={[0, 5]}
                allowDecimals={false}
                stroke="#64748b"
              />

              <Tooltip />

              <Bar
                dataKey="workload"
                barSize={28}
                radius={[6, 6, 0, 0]}
              >
                {workloadData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.workload >= 4 ? "#ef4444" : "#a855f7"}
                  />
                ))}
              </Bar>

            </BarChart>
          </ResponsiveContainer>

        </motion.div>

      </div>

    </div>
  );
}