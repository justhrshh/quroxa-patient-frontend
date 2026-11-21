import React, { useState, useEffect, useCallback } from 'react';
import { 
  MapPin, 
  Navigation, 
  Search, 
  Building2, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  RotateCw, 
  Phone, 
  Compass, 
  ShieldCheck, 
  SlidersHorizontal,
  ChevronRight,
  Info
} from 'lucide-react';
import authService from '../../services/authService';
import { HospitalBrandLogo } from '../../context/PortalBrandingContext';
import { DesignerHospitalCard } from './DesignerHospitalCard';

export const NearbyHospitalsExplorer = ({
  onLocationVerified,
  onSelectHospital,
  onProceedToDashboard,
  isOnboarding = true,
  currentLocation = null,
  onResetLocation = null
}) => {
  // Radius Options: 3 km, 5 km, 10 km (default), 15 km
  const [radiusKm, setRadiusKm] = useState(10);
  const [pincodeInput, setPincodeInput] = useState(() => {
    return currentLocation?.pincode || localStorage.getItem('quroxa_patient_pincode') || '';
  });

  // State: 'prompt' | 'requesting_gps' | 'searching' | 'results' | 'empty' | 'error'
  const [stage, setStage] = useState('prompt');
  const [gpsError, setGpsError] = useState('');
  const [pinError, setPinError] = useState('');
  const [hospitals, setHospitals] = useState([]);
  const [searchContext, setSearchContext] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastGpsCoords, setLastGpsCoords] = useState(null);

  // Active method: 'gps' | 'pincode'
  const [activeMethod, setActiveMethod] = useState(currentLocation?.type || 'gps');

  // Trigger search with given coordinates or PIN code
  const executeSearch = useCallback(async ({ lat, lng, pincode, radius = radiusKm }) => {
    setLoading(true);
    setGpsError('');
    setPinError('');
    setStage('searching');

    try {
      const res = await authService.getNearbyHospitals({
        lat,
        lng,
        pincode,
        radiusKm: radius
      });

      if (res && res.success) {
        setHospitals(res.hospitals || []);
        setSearchContext(res.searchContext || null);

        // Notify parent of verified location
        if (onLocationVerified) {
          onLocationVerified({
            type: res.searchContext?.locationSource === 'gps' ? 'gps' : 'pincode',
            pincode: res.searchContext?.pincode || (pincode ? String(pincode).trim() : null),
            district: res.searchContext?.district || null,
            state: res.searchContext?.state || null,
            radiusKm: radius,
            isApproximate: Boolean(res.searchContext?.isApproximate)
          });
        }

        if (res.hospitals && res.hospitals.length > 0) {
          setStage('results');
        } else {
          setStage('empty');
        }
      } else {
        setStage('error');
        setPinError('Failed to retrieve nearby healthcare providers.');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Error querying nearby clinics.';
      if (pincode) {
        setPinError(msg);
      } else {
        setGpsError(msg);
      }
      setStage('prompt');
    } finally {
      setLoading(false);
    }
  }, [radiusKm, onLocationVerified]);

  // Request browser geolocation ONLY on user click
  const handleRequestGps = () => {
    setGpsError('');
    setPinError('');

    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your current browser. Please enter your 6-digit PIN code below.');
      setActiveMethod('pincode');
      return;
    }

    setStage('requesting_gps');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLastGpsCoords({ lat: latitude, lng: longitude });
        setActiveMethod('gps');
        executeSearch({ lat: latitude, lng: longitude });
      },
      (err) => {
        let msg = 'Could not retrieve your location.';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            msg = 'Location permission was denied. You can search by entering your 6-digit PIN code below.';
            break;
          case err.POSITION_UNAVAILABLE:
            msg = 'GPS signal is currently unavailable. Please enter your PIN code below.';
            break;
          case err.TIMEOUT:
            msg = 'Location request timed out. Please enter your PIN code below.';
            break;
          default:
            msg = 'Location service error. Please use manual PIN code search.';
        }
        setGpsError(msg);
        setActiveMethod('pincode');
        setStage('prompt');
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000
      }
    );
  };

  // Submit manual 6-digit PIN code
  const handlePincodeSubmit = (e) => {
    if (e) e.preventDefault();
    setPinError('');
    setGpsError('');

    const clean = pincodeInput.replace(/\D/g, '');
    if (!/^[1-9][0-9]{5}$/.test(clean)) {
      setPinError('Please enter a valid 6-digit Indian PIN code (e.g. 123401).');
      return;
    }

    setActiveMethod('pincode');
    executeSearch({ pincode: clean });
  };

  // Change radius and re-trigger active search without re-requesting browser geolocation
  const handleRadiusChange = (newRadius) => {
    setRadiusKm(newRadius);
    if (searchContext) {
      if (searchContext.pincode) {
        executeSearch({ pincode: searchContext.pincode, radius: newRadius });
      } else if (lastGpsCoords) {
        executeSearch({ lat: lastGpsCoords.lat, lng: lastGpsCoords.lng, radius: newRadius });
      } else {
        handleRequestGps();
      }
    }
  };

  // Auto-search if returning patient has restored PIN code
  useEffect(() => {
    if (currentLocation?.isRestored && currentLocation?.pincode && stage === 'prompt') {
      executeSearch({ pincode: currentLocation.pincode });
    }
  }, [currentLocation, stage, executeSearch]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* ── HEADER & EXPLANATORY BANNER ── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {isOnboarding ? 'Discover Care Near You' : 'Clinics Near You'}
                </h1>
                {isOnboarding && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                    Required Setup
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                Connect your medical journey with accredited clinics and healthcare facilities in your vicinity.
              </p>
            </div>
          </div>

          {/* Change Location Action (when results are loaded) */}
          {stage === 'results' && (
            <button
              type="button"
              onClick={() => {
                setStage('prompt');
                if (onResetLocation) onResetLocation();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition self-start sm:self-center cursor-pointer min-h-[38px]"
            >
              <RotateCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Change Location</span>
            </button>
          )}
        </div>

        {/* ── LOCATION DISCOVERY CONTROLS ── */}
        <div className="mt-6 space-y-5">
          {/* Geolocation Button */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-blue-600" />
                <span>Option 1: Device Geolocation</span>
              </label>
              <span className="text-[11px] text-slate-400">Exact GPS distance</span>
            </div>

            <button
              type="button"
              onClick={handleRequestGps}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm shadow-sm hover:shadow transition disabled:opacity-60 cursor-pointer min-h-[48px]"
            >
              {stage === 'requesting_gps' ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Requesting Location Permission…</span>
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4" />
                  <span>Use My Current Location</span>
                </>
              )}
            </button>

            {gpsError && (
              <div className="mt-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{gpsError}</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
              OR
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Manual PIN Code Fallback Form */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="pincodeInput" className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>Option 2: Indian 6-Digit PIN Code</span>
              </label>
              <span className="text-[11px] text-slate-400">Approximate area centroid</span>
            </div>

            <form onSubmit={handlePincodeSubmit} className="flex flex-col sm:flex-row items-stretch gap-2.5">
              <div className="relative flex-1">
                <input
                  id="pincodeInput"
                  type="text"
                  maxLength={6}
                  value={pincodeInput}
                  onChange={(e) => {
                    setPincodeInput(e.target.value.replace(/\D/g, ''));
                    if (pinError) setPinError('');
                  }}
                  disabled={loading}
                  placeholder="e.g. 123401, 110001, 560001"
                  className="w-full px-4 py-3 pl-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold tracking-wider placeholder:tracking-normal placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition min-h-[46px]"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>

              <button
                type="submit"
                disabled={loading || pincodeInput.length !== 6}
                className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-sm transition disabled:opacity-40 cursor-pointer min-h-[46px] shrink-0"
              >
                {loading && stage === 'searching' ? 'Searching…' : 'Search PIN Code'}
              </button>
            </form>

            {pinError && (
              <div className="mt-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{pinError}</span>
              </div>
            )}
          </div>

          {/* Search Radius Selection */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span>Search Radius:</span>
            </div>
            <div className="flex items-center gap-1.5">
              {[3, 5, 10, 15].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRadiusChange(r)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    radiusKm === r
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {r} km
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── SEARCH CONTEXT & APPROXIMATE NOTICE ── */}
      {searchContext && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 rounded-2xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-medium">
              {searchContext.locationSource === 'pincode_approximate' ? (
                <>
                  Searching within <strong>{searchContext.radiusKm} km</strong> of PIN <strong>{searchContext.pincode}</strong>
                  {searchContext.district ? ` (${searchContext.district}, ${searchContext.state})` : ''}
                </>
              ) : (
                <>
                  Searching within <strong>{searchContext.radiusKm} km</strong> of your verified GPS coordinates
                </>
              )}
            </span>
          </div>
          {searchContext.isApproximate && (
            <span className="text-[11px] text-blue-700 bg-white/80 px-2 py-0.5 rounded-md border border-blue-200/50 self-start sm:self-center font-medium">
              Approximate Centroid (~3–5 km variance)
            </span>
          )}
        </div>
      )}

      {/* ── LOADING STATE ── */}
      {loading && (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <RotateCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">Locating accredited clinics…</h3>
          <p className="text-xs text-slate-400 mt-1">Comparing verified clinic coordinates across our provider network.</p>
        </div>
      )}

      {/* ── RESULTS GRID ── */}
      {!loading && stage === 'results' && hospitals.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-600">
              Found {hospitals.length} {hospitals.length === 1 ? 'Clinic' : 'Clinics'} Nearby
            </h2>
            <span className="text-xs text-slate-400">Sorted by distance</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {hospitals.map((h, idx) => (
              <DesignerHospitalCard
                key={h.code || h.hospitalId || idx}
                hospital={h}
                isLinked={false}
                showDistance={true}
                onEnter={onSelectHospital}
              />
            ))}
          </div>

          {/* Bottom Completion Bar for Onboarding Flow */}
          {isOnboarding && onProceedToDashboard && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider">
                    Location Setup Complete
                  </h4>
                  <p className="text-xs text-emerald-800">
                    Your nearby clinic network is ready. You can now access your central patient dashboard.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onProceedToDashboard}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition shrink-0 cursor-pointer min-h-[40px]"
              >
                <span>Proceed to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── EMPTY STATE (NO CLINICS WITHIN RADIUS) ── */}
      {!loading && stage === 'empty' && (
        <div className="p-8 sm:p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              No Quroxa clinics found within {radiusKm} km
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
              We did not find active clinics in your immediate radius. Try expanding the search radius or enter a different PIN code.
            </p>
          </div>

          {/* Radius Expansion Quick Buttons */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {[5, 15].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleRadiusChange(r)}
                className="px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition cursor-pointer"
              >
                Expand to {r} km
              </button>
            ))}
          </div>

          {/* Continue button for onboarding even if no clinic within radius */}
          {isOnboarding && onProceedToDashboard && (
            <div className="pt-4 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={onProceedToDashboard}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
              >
                <span>Continue to Central Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* OpenStreetMap Attribution (Required by OSM Nominatim usage policy) */}
      <div className="pt-4 pb-2 text-center">
        <p className="text-[11px] text-slate-400 font-medium">
          Map data and geolocation powered by{' '}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-slate-700 underline font-semibold transition"
          >
            OpenStreetMap contributors
          </a>
        </p>
      </div>
    </div>
  );
};

export default NearbyHospitalsExplorer;
