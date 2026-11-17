import React from 'react';
import { ShieldCheck, User, Droplet, AlertTriangle } from 'lucide-react';
import { Card } from '../ui/Card';

export const HealthVaultStrip = ({ currentUser, patientProfile }) => {
  const abhaId = patientProfile?.abhaId || currentUser?.abhaId || '';
  const uhid = patientProfile?.uhId || patientProfile?.uhid || currentUser?.uhId || currentUser?.uhid || (patientProfile?._id ? `UH-${patientProfile._id.substring(18).toUpperCase()}` : '—');
  const bloodGroup = patientProfile?.bloodGroup || currentUser?.bloodGroup || '—';
  const allergies = patientProfile?.allergies || (Array.isArray(currentUser?.allergies) ? currentUser.allergies.join(', ') : currentUser?.allergies) || 'None recorded';

  const items = [
    {
      id: 'uhid',
      label: 'Universal Health ID',
      value: uhid,
      icon: User,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50 border-blue-100',
      mono: true
    },
    {
      id: 'blood',
      label: 'Blood Group',
      value: bloodGroup,
      icon: Droplet,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-50 border-red-100',
      mono: false
    },
    {
      id: 'allergies',
      label: 'Documented Allergies',
      value: allergies,
      icon: AlertTriangle,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50 border-amber-100',
      mono: false
    },
    {
      id: 'abha',
      label: 'ABHA Health ID',
      value: abhaId || 'Not Linked',
      icon: ShieldCheck,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50 border-emerald-100',
      mono: Boolean(abhaId)
    }
  ];

  return (
    <Card className="p-4 sm:p-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="flex items-center gap-3 p-2 rounded-xl bg-slate-50/70 border border-slate-100">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${item.iconBg}`}>
                <Icon className={`w-4 h-4 ${item.iconColor}`} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                  {item.label}
                </span>
                <span className={`text-xs font-bold text-slate-800 block truncate ${item.mono ? 'font-mono' : ''}`}>
                  {item.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default HealthVaultStrip;
