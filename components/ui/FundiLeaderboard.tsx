import React, { useEffect, useState } from 'react';
import { StoreProfile, Agent } from '../../types';
import { fetchAgents } from '../../services/supabaseService';
import { Trophy, Medal, User, TrendingUp } from 'lucide-react';

interface FundiLeaderboardProps {
  store: StoreProfile;
  label: string; // e.g. "Fundi" or "Broker"
}

export const FundiLeaderboard: React.FC<FundiLeaderboardProps> = ({ store, label }) => {
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    fetchAgents(store.id).then(setAgents);
  }, [store.id]);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 1: return <Medal className="w-5 h-5 text-slate-400" />;
      case 2: return <Medal className="w-5 h-5 text-amber-600" />;
      default: return <span className="font-bold text-slate-400 text-sm">#{index + 1}</span>;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-500" />
        <h3 className="font-bold text-slate-800">Top {label}s</h3>
      </div>
      
      <div className="divide-y divide-slate-100">
        {agents.map((agent, index) => (
          <div key={agent.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
             <div className="flex items-center gap-3">
               <div className="w-8 flex justify-center">
                 {getRankIcon(index)}
               </div>
               <div>
                  <div className="font-bold text-slate-900">{agent.name}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                     <TrendingUp className="w-3 h-3" /> Sales: KES {agent.total_sales_value.toLocaleString()}
                  </div>
               </div>
             </div>
             <div className="text-right">
                <div className="font-bold text-blue-600 text-lg">{agent.total_points}</div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Points</div>
             </div>
          </div>
        ))}
        {agents.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm">
             No data yet. Sales recorded with a {label} name will appear here.
          </div>
        )}
      </div>
    </div>
  );
};
