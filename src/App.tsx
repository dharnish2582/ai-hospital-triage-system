import { useState } from 'react';
import { Building2, Cpu, Activity } from 'lucide-react';
import { HospitalConfig } from './pages/HospitalConfig';
import { SimulationDashboard } from './pages/SimulationDashboard';

export default function App() {
  const [activeTab, setActiveTab] = useState<'hospital' | 'simulation'>('hospital');

  return (
    <div className="flex h-screen overflow-hidden font-sans bg-slate-50">
      {/* Sidebar */}
      <aside className="w-72 bg-[#3A1E40] rounded-r-[2.5rem] shadow-2xl flex flex-col py-8 px-6 z-20 text-white shrink-0">
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="p-2 bg-white/10 rounded-xl">
            <Activity className="w-8 h-8 text-[#D4A5D9]" />
          </div>
          <h1 className="text-xl font-bold leading-tight">
            MedAI<br/><span className="text-[#D4A5D9] font-medium">Command</span>
          </h1>
        </div>

        <nav className="flex flex-col gap-3">
          <button
            onClick={() => setActiveTab('hospital')}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-medium transition-all duration-300 ${
              activeTab === 'hospital' 
                ? 'bg-white text-[#522B5B] shadow-lg scale-105' 
                : 'text-fuchsia-100 hover:bg-[#522B5B] hover:text-white'
            }`}
          >
            <Building2 className="w-5 h-5" />
            Hospital Config
          </button>
          <button
            onClick={() => setActiveTab('simulation')}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-medium transition-all duration-300 ${
              activeTab === 'simulation' 
                ? 'bg-white text-[#522B5B] shadow-lg scale-105' 
                : 'text-fuchsia-100 hover:bg-[#522B5B] hover:text-white'
            }`}
          >
            <Cpu className="w-5 h-5" />
            AI Simulation
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
        {/* Subtle background spotlight gradients */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[100px] pointer-events-none" />
        
        {activeTab === 'hospital' ? <HospitalConfig /> : <SimulationDashboard />}
      </main>
    </div>
  );
}
