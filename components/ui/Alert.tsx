import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface AlertProps {
  type: 'error' | 'success' | 'warning';
  title: string;
  message: string;
}

export const Alert: React.FC<AlertProps> = ({ type, title, message }) => {
  const styles = {
    error: 'bg-red-50 text-red-900 border-red-200',
    success: 'bg-green-50 text-green-900 border-green-200',
    warning: 'bg-amber-50 text-amber-900 border-amber-200',
  };

  const Icon = type === 'success' ? CheckCircle2 : AlertCircle;

  return (
    <div className={`p-4 rounded-lg border flex items-start gap-3 ${styles[type]}`}>
      <Icon className="w-5 h-5 mt-0.5 shrink-0" />
      <div>
        <h4 className="font-semibold text-sm">{title}</h4>
        <p className="text-sm opacity-90">{message}</p>
      </div>
    </div>
  );
};