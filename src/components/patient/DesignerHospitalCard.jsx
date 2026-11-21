import React from 'react';
import { 
  Building2, 
  MapPin, 
  CheckCircle2, 
  ArrowRight, 
  RotateCw, 
  ShieldCheck, 
  Navigation, 
  Phone, 
  Zap, 
  FileText, 
  FlaskConical,
  Activity
} from 'lucide-react';
import { HospitalBrandLogo } from '../../context/PortalBrandingContext';

export const DesignerHospitalCard = ({
  hospital,
  isLinked = false,
  isEntering = false,
  onEnter,
  showDistance = false,
  className = ''
}) => {
  if (!hospital) return null;

  const rawAddress = hospital.address || '';
  const cityStatePin = [hospital.city, hospital.state, hospital.pincode].filter(Boolean).join(', ');
  const displayAddress = rawAddress || cityStatePin || 'Accredited Healthcare Facility';
  const hasDistance = hospital.distanceKm !== undefined && hospital.distanceKm !== null;
  const identifier = hospital.hospitalId || hospital.tenantId || hospital.code;
  const mrn = hospital.hospitalPatientId || hospital.clinicMrn;

  return (
    <div
      className={`bg-white rounded-3xl border border-slate-200/90 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)] hover:border-blue-400 hover:shadow-[0_16px_36px_-6px_rgba(37,99,235,0.14)] transition-all duration-300 flex flex-col justify-between overflow-hidden group relative ${className}`}
    >
      {/* ── Top Micro-Accent Gradient Bar ── */}
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 opacity-90 group-hover:opacity-100 transition-opacity" />

      {/* ── Header Area with Logo, Name & Live Badge ── */}
      <div className="p-5 pb-3 bg-gradient-to-b from-slate-50/80 via-blue-50/20 to-white border-b border-slate-100/80">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Framed Logo Container */}
            <div className="w-13 h-13 rounded-2xl bg-white shadow-[0_2px_10px_rgba(15,23,42,0.08)] border border-slate-100 p-1 flex items-center justify-center shrink-0 relative group-hover:scale-105 transition-transform">
              <HospitalBrandLogo hospital={hospital} size={46} borderRadius={12} fontSize={18} />
              {/* Pulse status indicator */}
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full ring-1 ring-emerald-300 animate-pulse" />
            </div>

            {/* Hospital Name & Sub-details */}
            <div className="min-w-0 flex-1">
              <h3 className="font-black text-slate-900 text-base sm:text-[17px] tracking-tight group-hover:text-blue-600 transition-colors leading-snug line-clamp-1">
                {hospital.name}
              </h3>

              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full shadow-2xs">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>Accredited</span>
                </span>

                {identifier && (
                  <span className="font-mono text-[10px] font-semibold text-slate-500 bg-slate-100/90 px-1.5 py-0.5 rounded border border-slate-200/70 uppercase">
                    {identifier}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Status Badge */}
          {isLinked ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs shrink-0">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>YOUR CLINIC</span>
            </span>
          ) : showDistance && hasDistance ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs shrink-0 whitespace-nowrap">
              <Navigation className="w-3 h-3 text-blue-600" />
              <span>{hospital.distanceKm} km away</span>
            </span>
          ) : null}
        </div>
      </div>

      {/* ── Card Body ── */}
      <div className="p-5 pt-3.5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-3.5">
          {/* Address & Geographic Pin */}
          <div className="flex items-start gap-2 text-xs text-slate-600">
            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 leading-relaxed font-medium text-slate-700">
                {displayAddress}
              </p>
              {(hospital.city || hospital.pincode) && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="inline-block text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                    {[hospital.city, hospital.pincode ? `PIN ${hospital.pincode}` : ''].filter(Boolean).join(' • ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Clinical Capabilities Ribbon */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/60">
              <Zap className="w-3 h-3 text-amber-600" />
              <span>Express OPD</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/60">
              <FileText className="w-3 h-3 text-emerald-600" />
              <span>ABDM Health Locker</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200/60">
              <FlaskConical className="w-3 h-3 text-blue-600" />
              <span>Digital Lab</span>
            </span>
          </div>

          {/* Patient MRN Strip (Shown if user is linked) */}
          {isLinked && (
            <div className="p-2.5 rounded-xl bg-gradient-to-r from-slate-50 to-blue-50/30 border border-slate-200/70 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Clinic Patient MRN
                </span>
                <span className="font-mono font-black text-slate-800 text-xs tracking-wider">
                  {mrn || 'PAT-RECORD-SYNC'}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-100 shadow-2xs">
                <CheckCircle2 className="w-3 h-3 text-blue-600" />
                <span>Active Profile</span>
              </span>
            </div>
          )}

          {/* Phone / Reception contact (if available and in nearby mode) */}
          {!isLinked && hospital.phone && (
            <div className="pt-1 flex items-center justify-between text-xs text-slate-500">
              <a
                href={`tel:${hospital.phone}`}
                className="inline-flex items-center gap-1.5 font-bold text-slate-600 hover:text-blue-600 transition"
              >
                <Phone className="w-3 h-3 text-blue-500" />
                <span>{hospital.phone}</span>
              </a>
              <span className="text-[10.5px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                Reception Desk Open
              </span>
            </div>
          )}
        </div>

        {/* ── Primary Action CTA ── */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => onEnter && onEnter(hospital)}
            disabled={isEntering}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-black text-xs text-white bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] disabled:opacity-50 transition-all shadow-[0_4px_14px_rgba(37,99,235,0.22)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.32)] cursor-pointer group/btn"
          >
            {isEntering ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Connecting to Clinical Session...</span>
              </>
            ) : (
              <>
                <span>Enter Clinic Portal</span>
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DesignerHospitalCard;
