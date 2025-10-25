import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  suffix?: string;
  color?: string;
}

const colorBg: Record<string, string> = {
  blue: 'bg-blue-50',
  purple: 'bg-purple-50',
  green: 'bg-green-50',
  pink: 'bg-pink-50',
  orange: 'bg-orange-50',
};

const colorText: Record<string, string> = {
  blue: 'text-blue-500',
  purple: 'text-purple-500',
  green: 'text-green-500',
  pink: 'text-pink-500',
  orange: 'text-orange-500',
};

const MetricCard: React.FC<MetricCardProps> = ({ icon: Icon, label, value, suffix = "", color = "blue" }) => (
  <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100">
    <div className={`w-10 h-10 rounded-full ${colorBg[color] ?? colorBg.blue} flex items-center justify-center mb-3`}>
      <Icon className={`w-5 h-5 ${colorText[color] ?? colorText.blue}`} />
    </div>
    <div className="text-2xl sm:text-3xl font-extrabold leading-none">{value}{suffix}</div>
    <div className="text-gray-500 text-sm sm:text-base">{label}</div>
  </div>
);

export default MetricCard;
