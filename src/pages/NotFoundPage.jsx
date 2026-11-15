import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Home } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const NotFoundPage = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-3xl bg-red-50 border border-red-200/80 text-red-500 flex items-center justify-center mb-5 shadow-sm">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
        Page Not Found
      </h1>
      <p className="text-sm text-slate-500 max-w-sm mx-auto mb-8 leading-relaxed">
        The requested page or hospital portal route does not exist or may have been moved.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-xs">
        <Link to="/" className="w-full">
          <Button variant="primary" size="md" className="w-full">
            <Home className="w-4 h-4 mr-2" />
            <span>Hospital Directory</span>
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
