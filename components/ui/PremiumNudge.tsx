/**
 * Premium Nudge Components
 * All values are fetched from SuperAdmin marketing config - nothing hardcoded!
 */

import React, { useState, useEffect } from 'react';
import {
  Crown, TrendingUp, Lock, Users, Map, BarChart3,
  CreditCard, X, Gift, Star, ArrowRight, Clock, CheckCircle, AlertCircle
} from 'lucide-react';
import { getMarketingConfig } from '../../services/billingService';
import { MarketingConfig } from '../../types';

// Feature icon mapping
const FEATURE_ICONS: Record<string, any> = {
  profit: TrendingUp,
  gps: Map,
  madeni: CreditCard,
  suppliers: Users,
  reports: BarChart3,
};

// Hook to load marketing config
export const useMarketingConfig = () => {
  const [config, setConfig] = useState<MarketingConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMarketingConfig().then(data => {
      setConfig(data);
      setLoading(false);
    });
  }, []);

  return { config, loading };
};

// ============================================================================
// FLOATING ACTION BUTTON - Subtle corner reminder
// ============================================================================
export const PremiumFloatingBadge: React.FC<{
  isTrialActive?: boolean;
  trialDaysLeft?: number;
  onUpgrade: () => void;
}> = ({ isTrialActive, trialDaysLeft, onUpgrade }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { config } = useMarketingConfig();

  if (dismissed || !config?.show_floating_badge) return null;

  // Replace {percent} placeholder with actual value
  const discountText = config.discount_cta_text.replace('{percent}', String(config.trial_discount_percent));

  return (
    <div className="fixed bottom-20 right-4 z-40">
      {isExpanded ? (
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 shadow-2xl max-w-xs animate-in slide-in-from-right">
          <button 
            onClick={() => setDismissed(true)}
            className="absolute -top-2 -right-2 w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center"
          >
            <X className="w-3 h-3 text-white" />
          </button>
          
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              {isTrialActive ? (
                <>
                  <p className="text-white font-bold text-sm">
                    {config.trial_ending_message.replace('{days}', String(trialDaysLeft))}
                  </p>
                  {config.trial_discount_enabled && (
                    <p className="text-white/80 text-xs mt-1">
                      Upgrade now + get {config.trial_discount_percent}% off!
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-white font-bold text-sm">
                    Unlock Premium Features
                  </p>
                  {config.show_social_proof && (
                    <p className="text-white/80 text-xs mt-1">
                      {config.weekly_upgrades_count} businesses upgraded this week
                    </p>
                  )}
                </>
              )}
              <button
                onClick={onUpgrade}
                className="mt-2 bg-white text-amber-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-amber-50 transition"
              >
                {config.upgrade_cta_text} →
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsExpanded(true)}
          className="relative bg-gradient-to-r from-amber-500 to-orange-500 text-white p-3 rounded-full shadow-lg hover:scale-110 transition-transform"
        >
          <Crown className="w-5 h-5" />
          {isTrialActive && trialDaysLeft && trialDaysLeft <= 3 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold">
              {trialDaysLeft}
            </span>
          )}
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-green-500 text-[8px] px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap">
            UPGRADE
          </span>
        </button>
      )}
    </div>
  );
};

// ============================================================================
// TRIAL COUNTDOWN BANNER - Urgency without being annoying
// ============================================================================
export const TrialCountdownBanner: React.FC<{
  daysLeft: number;
  onUpgrade: () => void;
  onDismiss?: () => void;
}> = ({ daysLeft, onUpgrade, onDismiss }) => {
  const [dismissed, setDismissed] = useState(false);
  const { config } = useMarketingConfig();

  if (dismissed || !config?.show_trial_banner) return null;

  const discountText = config.trial_discount_enabled 
    ? config.discount_cta_text.replace('{percent}', String(config.trial_discount_percent))
    : config.upgrade_cta_text;

  // Different messaging based on urgency
  const getMessage = () => {
    if (daysLeft <= 1) {
      return {
        bg: 'from-red-600 to-rose-600',
        icon: AlertCircle,
        title: 'Last day of your trial!',
        subtitle: 'Upgrade now to keep all your data and features',
        cta: config.trial_discount_enabled ? `Upgrade Now - ${config.trial_discount_percent}% OFF` : config.upgrade_cta_text,
        urgent: true,
      };
    }
    if (daysLeft <= 3) {
      return {
        bg: 'from-orange-500 to-amber-500',
        icon: Clock,
        title: `Only ${daysLeft} days left in your trial`,
        subtitle: config.trial_discount_enabled ? 'Lock in your special trial price before it expires' : 'Upgrade to keep all features',
        cta: discountText,
        urgent: true,
      };
    }
    if (daysLeft <= 7) {
      return {
        bg: 'from-amber-500 to-yellow-500',
        icon: Gift,
        title: `${daysLeft} days left to explore Premium`,
        subtitle: config.trial_discount_enabled 
          ? `Loving it? Upgrade now and get ${config.trial_discount_percent}% off your first month`
          : 'Loving it? Upgrade now to keep all features',
        cta: discountText,
        urgent: false,
      };
    }
    return {
      bg: 'from-blue-500 to-cyan-500',
      icon: Crown,
      title: `You're on a Premium trial (${daysLeft} days left)`,
      subtitle: 'Explore all the powerful features you\'re unlocking',
      cta: 'View Premium Benefits',
      urgent: false,
    };
  };

  const msg = getMessage();
  const Icon = msg.icon;

  return (
    <div className={`relative bg-gradient-to-r ${msg.bg} rounded-xl p-4 mb-4 ${msg.urgent ? 'animate-pulse' : ''}`}>
      {onDismiss && (
        <button
          onClick={() => { setDismissed(true); onDismiss?.(); }}
          className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full transition"
        >
          <X className="w-4 h-4 text-white/70" />
        </button>
      )}
      
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
          <Icon className="w-6 h-6 text-white" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold">{msg.title}</p>
          <p className="text-white/80 text-sm truncate">{msg.subtitle}</p>
        </div>

        <button
          onClick={onUpgrade}
          className="bg-white text-slate-900 font-bold px-4 py-2 rounded-lg hover:bg-slate-100 transition flex items-center gap-2 flex-shrink-0"
        >
          {msg.cta}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// SUCCESS STORY POPUP - Social proof at key moments
// ============================================================================
export const SuccessStoryPopup: React.FC<{
  onUpgrade: () => void;
  onDismiss: () => void;
}> = ({ onUpgrade, onDismiss }) => {
  const { config } = useMarketingConfig();

  if (!config || !config.testimonials || config.testimonials.length === 0) return null;

  // Pick a random testimonial from config
  const story = config.testimonials[Math.floor(Math.random() * config.testimonials.length)];

  return (
    <div className="fixed bottom-24 right-4 z-50 max-w-sm animate-in slide-in-from-bottom">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-2xl">
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 p-1 hover:bg-slate-700 rounded-full"
        >
          <X className="w-4 h-4 text-slate-500" />
        </button>

        <div className="flex items-start gap-3">
          <div className="text-3xl">{story.avatar}</div>
          <div>
            <p className="text-white font-medium">{story.name}</p>
            <p className="text-slate-400 text-xs">{story.business}, {story.location}</p>
          </div>
        </div>

        <p className="text-slate-300 text-sm mt-3 italic">"{story.quote}"</p>

        <div className="flex items-center gap-1 mt-3">
          {[1,2,3,4,5].map(i => (
            <Star 
              key={i} 
              className={`w-4 h-4 ${i <= story.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} 
            />
          ))}
        </div>

        <button
          onClick={onUpgrade}
          className="w-full mt-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-2 px-4 rounded-lg hover:from-amber-400 hover:to-orange-400 transition"
        >
          Join {config.businesses_count.toLocaleString()}+ Happy Businesses
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// INLINE FEATURE TEASER - Shows in the feature area itself
// ============================================================================
export const InlineFeatureTeaser: React.FC<{
  featureId: string;
  onUpgrade: () => void;
  compact?: boolean;
}> = ({ featureId, onUpgrade, compact }) => {
  const { config } = useMarketingConfig();
  
  if (!config) return null;

  const featureBenefit = config.feature_benefits.find(f => f.feature_id === featureId);
  const FeatureIcon = FEATURE_ICONS[featureId] || TrendingUp;

  if (compact) {
    return (
      <button
        onClick={onUpgrade}
        className="flex items-center gap-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-lg px-3 py-2 hover:border-amber-500/50 transition group"
      >
        <Lock className="w-4 h-4 text-amber-500" />
        <span className="text-amber-400 text-sm font-medium">{featureBenefit?.hook_text || 'Premium Feature'}</span>
        <Crown className="w-3 h-3 text-amber-500 opacity-0 group-hover:opacity-100 transition" />
      </button>
    );
  }

  return (
    <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6 overflow-hidden">
      <div className="absolute top-0 right-0 p-2 opacity-10">
        <Crown className="w-32 h-32 rotate-12 text-amber-500" />
      </div>
      
      <div className="absolute top-3 right-3 bg-amber-500 text-black text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
        <Crown className="w-3 h-3" /> PREMIUM
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
            <FeatureIcon className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h4 className="font-bold text-white">{featureBenefit?.hook_text || 'Premium Feature'}</h4>
            <p className="text-slate-400 text-sm">{featureBenefit?.benefit_text || 'Unlock with Premium'}</p>
          </div>
        </div>

        <button
          onClick={onUpgrade}
          className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition"
        >
          <Crown className="w-5 h-5" />
          {config.upgrade_cta_text}
        </button>

        {config.show_social_proof && (
          <p className="text-center text-slate-500 text-xs mt-4">
            <Users className="w-3 h-3 inline mr-1" />
            {config.weekly_upgrades_count} businesses unlocked this week
          </p>
        )}
      </div>
    </div>
  );
};

export default {
  PremiumFloatingBadge,
  TrialCountdownBanner,
  SuccessStoryPopup,
  InlineFeatureTeaser,
  useMarketingConfig,
};
