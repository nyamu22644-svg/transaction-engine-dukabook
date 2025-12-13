import React, { useState } from 'react';
import { Lock, Crown, TrendingUp, Users, Zap, Star } from 'lucide-react';

interface PremiumLockProps {
  title: string;
  description: string;
  onUpgrade?: () => void;
  benefit?: string;
  socialProof?: string;
}

// Random social proof numbers
const getRandomSocialProof = () => {
  const options = [
    `${Math.floor(Math.random() * 20) + 15} businesses upgraded this week`,
    `Join ${(Math.floor(Math.random() * 1000) + 2000).toLocaleString()}+ happy stores`,
    `Rated 4.9/5 by Premium users`,
    `Save up to 5 hours every week`,
  ];
  return options[Math.floor(Math.random() * options.length)];
};

export const PremiumLock: React.FC<PremiumLockProps> = ({ 
  title, 
  description, 
  onUpgrade,
  benefit,
  socialProof 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const displaySocialProof = socialProof || getRandomSocialProof();

  return (
    <div 
      className="relative overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6 text-center transition-all hover:shadow-lg hover:border-amber-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated background shimmer */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-shimmer" />
      
      <div className="absolute top-0 right-0 p-2 opacity-10">
        <Crown className={`w-32 h-32 rotate-12 text-amber-500 transition-transform duration-300 ${isHovered ? 'scale-110' : ''}`} />
      </div>
      
      <div className="relative z-10 flex flex-col items-center justify-center py-4">
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-3 rounded-full mb-4 shadow-lg">
          <Lock className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-sm text-slate-600 mb-3 max-w-xs mx-auto">{description}</p>
        
        {/* Benefit highlight */}
        {benefit && (
          <div className="bg-green-100 text-green-700 text-xs font-medium px-3 py-1.5 rounded-full mb-3 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {benefit}
          </div>
        )}
        
        <button 
          onClick={onUpgrade}
          className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-2.5 px-6 rounded-full shadow-lg hover:shadow-xl hover:from-amber-400 hover:to-orange-400 transition-all active:scale-95 flex items-center gap-2"
        >
          <Crown className="w-4 h-4" />
          Unlock Premium
        </button>
        
        {/* Social proof */}
        <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
          <Users className="w-3 h-3" />
          {displaySocialProof}
        </p>
      </div>
    </div>
  );
};

// Add shimmer animation to your global CSS or tailwind config
// @keyframes shimmer { 100% { transform: translateX(100%); } }
// .animate-shimmer { animation: shimmer 2s infinite; }
