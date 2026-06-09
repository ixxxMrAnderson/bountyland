/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Users, RefreshCw } from 'lucide-react';
import { useTranslation } from '../locales';

export const NetworkStatsWidget: React.FC = () => {
  const { t, locale } = useTranslation();
  
  // Real-time fluctuating state variable
  const [activeMiners, setActiveMiners] = useState(1424);   // Nodes count
  const [isRotatingRing, setIsRotatingRing] = useState(false);

  useEffect(() => {
    // Dynamic micro-changes simulating workers joining and leaving the peer network
    const interval = setInterval(() => {
      setActiveMiners((prev) => {
        const change = Math.random() > 0.65 ? (Math.random() > 0.5 ? 1 : -1) : 0;
        return Math.max(1418, Math.min(prev + change, 1432));
      });
      
      setIsRotatingRing(true);
      setTimeout(() => setIsRotatingRing(false), 800);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl hover:border-slate-750 transition duration-300 relative overflow-hidden select-none">
      
      {/* Background subtle network grid decoration */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:16px_16px] opacity-10 pointer-events-none"></div>
      
      {/* Widget Header with live status beacon */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
            <Users className="w-4 h-4 text-brand-cyan shrink-0 animate-pulse" />
          </div>
          <div>
            <h4 className="font-display font-medium text-xs tracking-wide text-slate-300">
              {t('platformActiveMiners') || 'Active Miners Online'}
            </h4>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-ping shrink-0"></span>
              <span className="text-[9px] text-slate-500 font-mono font-bold uppercase tracking-wider">
                {locale === 'zh' ? '算网节点秒级同步中' : 'WORKER CONTEXT LIVE'}
              </span>
            </div>
          </div>
        </div>
        
        <button 
          title="Sync Node Status" 
          className="text-slate-500 hover:text-slate-350 transition duration-150 p-1"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isRotatingRing ? 'animate-spin text-brand-cyan' : ''}`} />
        </button>
      </div>

      {/* Hero layout of the Metric */}
      <div className="mt-4 flex items-baseline gap-2 relative z-10 pl-1">
        <span className="text-3xl font-extrabold font-mono text-white tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          {activeMiners}
        </span>
        <span className="text-xs text-slate-500 font-bold font-mono">
          {locale === 'zh' ? '个活跃算力节点' : 'Nodes Active'}
        </span>
      </div>

    </div>
  );
};
