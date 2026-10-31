// src/components/TelemetryCard.jsx
import React, { useState, useEffect } from 'react';
import { Sun, Activity, Zap, TrendingUp, CloudSun } from 'lucide-react';

export default function TelemetryCard({ systemSizeKw }) {
  // Simulate live fluctuating power output based on system size (kW)
  const basePower = parseFloat(systemSizeKw) || 5;
  const [currentKw, setCurrentKw] = useState(basePower * 0.8);
  const [dailyKwh, setDailyKwh] = useState(basePower * 4.2);

  useEffect(() => {
    // Random subtle live power fluctuation every 4 seconds
    const interval = setInterval(() => {
      const fluctuation = (Math.random() * 0.4 - 0.2); // -0.2 to +0.2 kW
      const newKw = Math.max(0.1, parseFloat((basePower * 0.85 + fluctuation).toFixed(2)));
      setCurrentKw(newKw);
      setDailyKwh(prev => parseFloat((prev + newKw / 900).toFixed(2))); // Increment daily kWh slowly
    }, 4000);

    return () => clearInterval(interval);
  }, [basePower]);

  const efficiency = Math.min(99.4, Math.max(91.0, (95 + (currentKw / basePower) * 3).toFixed(1)));

  return (
    <div className="bg-linear-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-md space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
            <Sun size={20} className="animate-spin-slow" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Live Power Generation</h4>
            <p className="text-[10px] text-slate-400">Inverter Synchronized</p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full">
          <Activity size={12} /> Generating
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
          <span className="text-[10px] text-slate-400 block mb-1">Current Output</span>
          <span className="text-lg font-extrabold text-amber-400 font-mono">{currentKw} kW</span>
        </div>
        <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
          <span className="text-[10px] text-slate-400 block mb-1">Today's Energy</span>
          <span className="text-lg font-extrabold text-white font-mono">{dailyKwh} kWh</span>
        </div>
        <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
          <span className="text-[10px] text-slate-400 block mb-1">Efficiency</span>
          <span className="text-lg font-extrabold text-emerald-400 font-mono">{efficiency}%</span>
        </div>
      </div>
    </div>
  );
}