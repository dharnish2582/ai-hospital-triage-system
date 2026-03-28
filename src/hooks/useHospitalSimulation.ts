import { useState, useEffect, useCallback, useRef } from 'react';
import { Room } from '../components/DigitalTwinMap';
import { Patient } from '../components/PatientQueue';
import { Metrics } from '../components/PerformanceMetrics';
import toast from 'react-hot-toast';

export function useHospitalSimulation() {
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [aiStatusText, setAiStatusText] = useState('System Initializing...');
  const [logs, setLogs] = useState<string[]>(['[System] AI Command Center Ready']);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    processed: 0,
    avgWaitTime: 4,
    utilization: 0,
    efficiency: 88,
  });
  const [departmentTraffic, setDepartmentTraffic] = useState([
    { name: 'ER', value: 0 },
    { name: 'ICU', value: 0 },
    { name: 'Wards', value: 0 },
  ]);
  const [metricsHistory, setMetricsHistory] = useState<{ time: string, processed: number, avgWait: number }[]>([]);
  const [loadPrediction, setLoadPrediction] = useState<{ current_queue: number, active_doctors: number, predicted_load: number, load_history: number[] }>({ current_queue: 0, active_doctors: 0, predicted_load: 0, load_history: [] });
  const [rlLearningCurve, setRlLearningCurve] = useState<number[]>([]);

  const eventSourceRef = useRef<EventSource | null>(null);
  const simulationStartTimeRef = useRef<number | null>(null);
  const processedCountRef = useRef(0);

  // ── Helpers ──────────────────────────────────────────────────────

  const addLog = useCallback((message: string) => {
    setLogs(prev => [...prev, message].slice(-80));
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [patientsRes, doctorsRes, roomsRes, loadRes, rlRes] = await Promise.all([
        fetch('/api/patients'),
        fetch('/api/doctors'),
        fetch('/api/rooms'),
        fetch('/api/predict-load'),
        fetch('/api/rl-learning'),
      ]);

      if (patientsRes.ok) {
        const data = await patientsRes.json();
        setPatients(data);
        const processed = data.filter((p: any) => p.status === 'assigned').length;
        processedCountRef.current = processed;
        setMetrics(prev => ({ ...prev, processed }));

        // Avg wait time: ~4s per patient processed
        if (simulationStartTimeRef.current && processed > 0) {
          const elapsed = (Date.now() - simulationStartTimeRef.current) / 1000 / 60;
          const avg = Math.round((elapsed / processed) * 60);
          setMetrics(prev => ({ ...prev, avgWaitTime: avg > 0 ? avg : 4 }));
        }
      }

      if (doctorsRes.ok) {
        const data = await doctorsRes.json();
        setDoctors(data);
        const activeDoctors = data.filter((d: any) => d.workload > 0).length;
        const util = data.length > 0 ? Math.round((activeDoctors / data.length) * 100) : 0;
        const efficiency = Math.min(100, Math.round(88 + processedCountRef.current * 1.5));

        setMetrics(prev => {
          const nextWaitTime = processedCountRef.current > 0 && simulationStartTimeRef.current
            ? Math.round(((Date.now() - simulationStartTimeRef.current) / 1000 / 60 / processedCountRef.current) * 60)
            : prev.avgWaitTime;

          const newMetrics = { ...prev, utilization: util, efficiency, avgWaitTime: nextWaitTime > 0 ? nextWaitTime : 4 };

          // Append to history for line charts
          setMetricsHistory(mh => {
            const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            // prevent duplicate exact second entries to keep chart clean
            if (mh.length > 0 && mh[mh.length - 1].time === timeStr) return mh;
            return [...mh, { time: timeStr, processed: processedCountRef.current, avgWait: newMetrics.avgWaitTime }].slice(-20); // keep last 20 points
          });

          return newMetrics;
        });
      }

      if (roomsRes.ok) {
        const data = await roomsRes.json();
        setRooms(data.map((r: any) => ({
          id: r.id.toString(),
          name: r.room_name,
          type: r.room_type === 'emergency' ? 'ER' : r.room_type === 'icu' ? 'ICU' : 'Room',
          status: r.status as 'available' | 'occupied' | 'reserved',
          patientId: r.assigned_patient ?? undefined,
        })));
      }

      if (loadRes.ok) {
        const data = await loadRes.json();
        setLoadPrediction(data);
      }

      if (rlRes.ok) {
        const data = await rlRes.json();
        setRlLearningCurve(data.learning_curve || []);
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  }, []);

  // Initial data load + background polling every 5s
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Compute department traffic from patient list
  useEffect(() => {
    const traffic = { ER: 0, ICU: 0, Wards: 0 };
    patients.forEach(p => {
      if (p.status === 'assigned' || p.status === 'processing') {
        const sev = p.severity?.toLowerCase();
        if (sev === 'serious' || sev === 'emergency') traffic.ER++;
        else if (sev === 'critical') traffic.ICU++;
        else traffic.Wards++;
      }
    });
    setDepartmentTraffic([
      { name: 'ER', value: traffic.ER },
      { name: 'ICU', value: traffic.ICU },
      { name: 'Wards', value: traffic.Wards },
    ]);
  }, [patients]);

  // ── SSE Event Handlers ──────────────────────────────────────────

  const handleSSEMessage = useCallback((event: MessageEvent) => {
    try {
      const payload = JSON.parse(event.data);

      switch (payload.type) {
        case 'agentUpdate':
          setActiveAgent(payload.agent ?? null);
          setAiStatusText(payload.statusText ?? '');
          if (payload.log) addLog(payload.log);
          break;

        case 'alert':
          // Add to system logs
          if (payload.message) addLog(`[Alert] ${payload.message}`);

          // Trigger visual toast
          if (payload.color === 'red') {
            toast.error(payload.message, { icon: '🚨', duration: 5000 });
          } else if (payload.color === 'orange') {
            toast(payload.message, { icon: '⚠️', duration: 5000, style: { borderLeft: '4px solid #f97316' } });
          } else if (payload.color === 'blue') {
            toast(payload.message, { icon: 'ℹ️', duration: 5000, style: { borderLeft: '4px solid #3b82f6' } });
          } else {
            toast(payload.message);
          }
          break;

        case 'patientStatus':
          // Optimistically update a single patient's status without a full re-fetch
          setPatients(prev => prev.map(p =>
            String(p.id) === String(payload.patientId)
              ? { ...p, status: payload.status }
              : p
          ));
          break;

        case 'dataRefresh':
          fetchData();
          break;

        case 'complete':
          setActiveAgent(null);
          setAiStatusText(payload.statusText ?? 'Simulation complete');
          if (payload.log) addLog(payload.log);
          setIsSimulationRunning(false);
          fetchData();
          closeSSE();
          break;

        case 'stopped':
          setActiveAgent(null);
          setAiStatusText('Simulation stopped');
          if (payload.log) addLog(payload.log);
          setIsSimulationRunning(false);
          fetchData();
          closeSSE();
          break;

        case 'error':
          addLog(`[System] Error: ${payload.message}`);
          setIsSimulationRunning(false);
          setActiveAgent(null);
          closeSSE();
          break;

        default:
          break;
      }
    } catch (e) {
      console.warn('SSE parse error:', e, event.data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addLog, fetchData]);

  // ── SSE Lifecycle ────────────────────────────────────────────────

  const closeSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const startSimulation = useCallback(async () => {
    if (isSimulationRunning) return;

    closeSSE();
    setIsSimulationRunning(true);
    simulationStartTimeRef.current = Date.now();
    processedCountRef.current = 0;
    setActiveAgent('supervisor');
    setAiStatusText('Supervisor Agent active — Starting simulation...');
    addLog('[System] AI Simulation Started');

    const es = new EventSource('/api/simulation-stream');
    eventSourceRef.current = es;

    es.onmessage = handleSSEMessage;

    es.onerror = (e) => {
      console.error('SSE connection error', e);
      // If simulation naturally ended, SSE error is expected after res.end()
      if (!isSimulationRunning) return;
      addLog('[System] Connection lost — simulation may have ended');
      setIsSimulationRunning(false);
      setActiveAgent(null);
      closeSSE();
      fetchData();
    };
  }, [isSimulationRunning, closeSSE, handleSSEMessage, addLog, fetchData]);

  const stopSimulation = useCallback(async () => {
    try {
      await fetch('/api/stop-simulation', { method: 'POST' });
    } catch { }
    closeSSE();
    setIsSimulationRunning(false);
    setActiveAgent(null);
    setAiStatusText('Simulation stopped by user');
    addLog('[System] AI Simulation Stopped');
    fetchData();
  }, [closeSSE, addLog, fetchData]);

  const resetSimulation = useCallback(async () => {
    // Stop any running simulation first
    try { await fetch('/api/stop-simulation', { method: 'POST' }); } catch { }
    closeSSE();
    setIsSimulationRunning(false);
    setActiveAgent(null);

    // Call backend reset
    try {
      await fetch('/api/reset-db', { method: 'POST' });
    } catch (err) {
      console.error('Reset failed', err);
      return;
    }

    // Reset all frontend state
    setAiStatusText('System Idle — Environment reset. Ready for new simulation.');
    setLogs(['[System] Simulation environment reset successfully.']);
    setPatients([]);
    setRooms([]);
    setDoctors([]);
    setMetricsHistory([]);
    setMetrics({ processed: 0, avgWaitTime: 4, utilization: 0, efficiency: 88 });
    setDepartmentTraffic([
      { name: 'ER', value: 0 },
      { name: 'ICU', value: 0 },
      { name: 'Wards', value: 0 },
    ]);
    setLoadPrediction({ current_queue: 0, active_doctors: 0, predicted_load: 0, load_history: [] });
    setRlLearningCurve([]);

    // Re-fetch to reload doctors and rooms (static data stays)
    await fetchData();
  }, [closeSSE, fetchData]);

  const triggerEmergencySurge = useCallback(async () => {
    try {
      await fetch('/api/demo-emergency-surge', { method: 'POST' });
      addLog('[System] 🚨 EMERGENCY SURGE TRIGGERED - Multiple critical patients incoming!');
      fetchData(); // immediately fetch to see them in queue
    } catch (err) {
      console.error('Failed to trigger emergency surge', err);
    }
  }, [addLog, fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => closeSSE();
  }, [closeSSE]);

  return {
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
    departmentTraffic,
    loadPrediction,
    rlLearningCurve,
  };
}
