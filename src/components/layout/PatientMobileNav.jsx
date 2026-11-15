import React from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Home, Calendar, Pill, Activity, FileText, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const PatientMobileNav = () => {
  const { isAuthenticated } = useAuth();
  const { hospitalSlug } = useParams();
  const location = useLocation();

  if (!isAuthenticated) return null;

  const basePath = hospitalSlug ? `/${hospitalSlug}` : '';

  const navItems = [
    { label: 'Home', path: `${basePath}/dashboard`, icon: Home },
    { label: 'Appointments', path: `${basePath}/appointments`, icon: Calendar },
    { label: 'Prescriptions', path: `${basePath}/prescriptions`, icon: Pill },
    { label: 'Labs', path: `${basePath}/lab-results`, icon: Activity },
    { label: 'Records', path: `${basePath}/medical-records`, icon: FileText },
    { label: 'Profile', path: `${basePath}/profile`, icon: User }
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 glass-surface border-t border-slate-200/80 px-2 py-1.5 shadow-lg">
      <div className="grid grid-cols-6 gap-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[9px] font-semibold transition ${
                isActive
                  ? 'text-blue-600 bg-blue-50/70 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="truncate max-w-[50px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default PatientMobileNav;
