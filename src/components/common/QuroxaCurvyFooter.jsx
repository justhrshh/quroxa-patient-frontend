import React from 'react';

/**
 * High-craft Curvy Footer with fluid multi-layer organic waves and "Powered by QUROXA" branding.
 * Resolution-independent SVG: renders crisp curves on mobile (320px) up to 4K desktop (2560px)
 * without stretching or clipping the organic top curves.
 */
export const QuroxaCurvyFooter = ({ className = '', hideText = false }) => {
  return (
    <footer className={`w-full relative z-0 mt-auto leading-none overflow-hidden shrink-0 select-none ${className}`}>
      {/* Organic Layered Wave SVG */}
      <div className="relative w-full">
        <svg 
          viewBox="0 0 1440 96" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg" 
          className="w-full h-12 sm:h-14 md:h-16 lg:h-18 block"
          preserveAspectRatio="none"
        >
          {/* Layer 1: Soft Cyan/Teal Under-Wave */}
          <path 
            d="M0,28 C260,6 520,48 760,24 C1000,0 1240,42 1440,20 L1440,96 L0,96 Z" 
            fill="url(#quroxa-wave-grad-1)" 
            opacity="0.45"
          />
          {/* Layer 2: Electric Royal Blue Mid-Wave */}
          <path 
            d="M0,42 C200,58 420,28 720,46 C1020,64 1260,34 1440,50 L1440,96 L0,96 Z" 
            fill="url(#quroxa-wave-grad-2)" 
            opacity="0.8"
          />
          {/* Layer 3: Solid Deep Navy Base Wave */}
          <path 
            d="M0,56 C260,40 500,68 780,52 C1060,36 1300,60 1440,54 L1440,96 L0,96 Z" 
            fill="#071938"
          />

          <defs>
            <linearGradient id="quroxa-wave-grad-1" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="40%" stopColor="#38bdf8" />
              <stop offset="80%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#0052cc" />
            </linearGradient>
            <linearGradient id="quroxa-wave-grad-2" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="45%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#071938" />
            </linearGradient>
          </defs>
        </svg>

        {/* Floating Brand Label in Deep Navy Base */}
        {!hideText && (
          <div className="absolute inset-x-0 bottom-1 sm:bottom-1.5 flex items-center justify-center gap-2 pointer-events-none px-4">
            <span className="w-6 sm:w-12 h-px bg-white/20" />
            <div className="inline-flex items-center gap-1.5 text-[9px] sm:text-[11px] font-semibold text-white/80 tracking-wider">
              <span>Powered by</span>
              <strong className="font-black text-white tracking-widest uppercase">
                QUROXA
              </strong>
            </div>
            <span className="w-6 sm:w-12 h-px bg-white/20" />
          </div>
        )}
      </div>
    </footer>
  );
};

export default QuroxaCurvyFooter;
