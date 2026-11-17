import React from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { LayoutDashboard, Calendar, Pill, Activity, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const PatientMobileNav = () => {
  const { isAuthenticated } = useAuth();
  const { hospitalSlug } = useParams();
  const location = useLocation();

  if (!isAuthenticated || !hospitalSlug) return null;

  const basePath = `/${hospitalSlug}`;

  const navItems = [
    { label: 'Overview', path: `${basePath}/dashboard`, icon: LayoutDashboard },
    { label: 'Appointments', path: `${basePath}/appointments`, icon: Calendar },
    { label: 'Prescriptions', path: `${basePath}/prescriptions`, icon: Pill },
    { label: 'Lab Reports', path: `${basePath}/lab-results`, icon: Activity },
    { label: 'EMR Records', path: `${basePath}/medical-records`, icon: FileText }
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200/90 shadow-lg pb-safe">
      <div className="grid grid-cols-5 gap-0.5 px-1 py-1 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl text-[10px] font-semibold transition touch-manipulation ${
                isActive
                  ? 'text-blue-600 bg-blue-50/70 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5 shrink-0" />
              <span className="truncate max-w-[56px] text-center leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default PatientMobileNav;
