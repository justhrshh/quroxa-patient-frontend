import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Home, Building2 } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const NotFoundPage = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center py-12 px-4 text-center animate-fadeIn">
      <div className="w-16 h-16 rounded-3xl bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center mb-5 shadow-2xs">
        <AlertCircle className="w-8 h-8 text-blue-600" />
      </div>
      <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
        Page Not Found
      </h1>
      <p className="text-sm text-slate-500 max-w-sm mx-auto mb-8 leading-relaxed">
        The requested clinical portal resource or navigation route does not exist or may have been relocated.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-xs">
        <Link to="/" className="w-full">
          <Button variant="primary" size="md" className="w-full min-h-[44px]">
            <Home className="w-4 h-4 mr-2" />
            <span>Central Patient Directory</span>
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
