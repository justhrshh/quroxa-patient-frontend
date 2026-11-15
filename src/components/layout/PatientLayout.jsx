import React from 'react';
import { Outlet } from 'react-router-dom';
import PatientHeader from './PatientHeader';
import PatientMobileNav from './PatientMobileNav';

export const PatientLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <PatientHeader />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12">
        <Outlet />
      </main>
      <PatientMobileNav />
    </div>
  );
};

export default PatientLayout;
