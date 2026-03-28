import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, PieChart as PieChartIcon } from 'lucide-react';

export function DoctorWorkloadChart({ data }: { data: { name: string, workload: number }[] }) {
  return (
    <div className="glass-card p-6 h-full flex flex-col">
      <h2 className="text-xl font-semibold text-slate-800 mb-6 flex items-center gap-2">
        <BarChart3 className="text-primary" /> Doctor Workload
      </h2>
      
      <div className="flex-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
            <Tooltip 
              cursor={{ fill: 'rgba(82, 43, 91, 0.1)' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Bar dataKey="workload" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function DepartmentTrafficChart({ data }: { data: { name: string, value: number }[] }) {
  const COLORS = ['#522B5B', '#7A4287', '#3A1E40', '#D4A5D9'];

  return (
    <div className="glass-card p-6 h-full flex flex-col">
      <h2 className="text-xl font-semibold text-slate-800 mb-6 flex items-center gap-2">
        <PieChartIcon className="text-primary" /> Department Traffic
      </h2>
      
      <div className="flex-1 min-h-[200px] flex items-center justify-center relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-slate-800">
            {data.reduce((acc, curr) => acc + curr.value, 0)}
          </span>
          <span className="text-xs text-slate-500">Total</span>
        </div>
      </div>
    </div>
  );
}
