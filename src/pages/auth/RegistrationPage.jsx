import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  UserPlus, 
  ArrowLeft, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  Lock, 
  CheckCircle2, 
  HeartHandshake 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePortalBranding, HospitalBrandLogo } from '../../context/PortalBrandingContext';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import authService from '../../services/authService';

export const RegistrationPage = () => {
  const { hospitalSlug } = useParams();
  const navigate = useNavigate();
  const { tempRegistration, login } = useAuth();
  const { hospital } = usePortalBranding();

  // If no temporary registration token is present, prompt patient to verify OTP first
  const contactPrefill = tempRegistration?.emailOrPhone || '';
  const tempToken = tempRegistration?.tempToken || '';

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Male',
    email: '',
    bloodGroup: '',
    address: '',
    dpdpConsent: true
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errorMessage) setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!tempToken) {
      setErrorMessage('Your session has expired. Please verify your mobile number again.');
      return;
    }

    if (!formData.name.trim()) {
      setErrorMessage('Please enter your full legal name.');
      return;
    }

    const ageNum = parseInt(formData.age, 10);
    if (!formData.age || isNaN(ageNum) || ageNum <= 0 || ageNum > 125) {
      setErrorMessage('Please enter a valid age in years.');
      return;
    }

    if (!formData.dpdpConsent) {
      setErrorMessage('Consent to DPDP Act 2023 health data processing is required to create your hospital patient profile.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const cleanGender = formData.gender ? (formData.gender.charAt(0).toUpperCase() + formData.gender.slice(1).toLowerCase()) : 'Male';

      const payload = {
        name: formData.name.trim(),
        age: ageNum,
        gender: cleanGender,
        contact: contactPrefill,
        email: formData.email.trim() ? formData.email.trim() : undefined,
        bloodGroup: formData.bloodGroup || undefined,
        address: formData.address.trim() || undefined,
        dpdpConsent: {
          emrCreation: true,
          dataSharing: false
        }
      };

      const res = await authService.registerPatient(payload, tempToken);

      // Backend returns the registered patient document along with the authenticated patient JWT token and user
      if (res.token && res.user) {
        login(res.token, res.user);
        navigate(`/${hospitalSlug}/dashboard`, { replace: true });
      } else {
        // Fallback: Navigate to login so patient can sign in with newly created profile
        navigate(`/${hospitalSlug}/login`, { replace: true });
      }
    } catch (err) {
      const serverMsg = err.response?.data?.error || err.response?.data?.message;
      setErrorMessage(serverMsg || 'Registration failed. Please check the details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Missing OTP Verification State
  if (!tempToken) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center py-10 px-4">
        <div className="w-full max-w-md">
          <Card className="shadow-float border-slate-200">
            <CardContent className="p-6 sm:p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 mb-2">
                Verification Required
              </h2>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                To register as a new patient at <strong>{hospital?.name || hospitalSlug}</strong>, please verify your mobile number first.
              </p>
              <Link to={`/${hospitalSlug}/login`} className="block">
                <Button variant="primary" size="md" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  <span>Go to Patient Sign In</span>
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center py-8 px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-block mb-3">
            {hospital ? (
              <HospitalBrandLogo hospital={hospital} size={50} borderRadius={14} />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
                <UserPlus className="w-6 h-6" />
              </div>
            )}
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Patient Self-Registration
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Creating clinical profile at <span className="font-semibold text-slate-700">{hospital?.name || hospitalSlug}</span>
          </p>
        </div>

        <Card className="shadow-float border-slate-200">
          <CardContent className="p-6 sm:p-8">
            {errorMessage && (
              <div className="mb-5 flex items-start gap-2 bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Verified Contact */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Verified Contact Number
                </label>
                <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-mono font-bold">
                  <span>+91 {contactPrefill}</span>
                  <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-sans font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified
                  </span>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Full Legal Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Ramesh Kumar"
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-medium focus-ring focus:bg-white focus:border-blue-500 transition"
                />
              </div>

              {/* Age & Gender Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="age" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Age (Years) <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="age"
                    name="age"
                    type="number"
                    min={1}
                    max={125}
                    required
                    value={formData.age}
                    onChange={handleChange}
                    placeholder="e.g. 35"
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-medium focus-ring focus:bg-white focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label htmlFor="gender" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-medium focus-ring focus:bg-white focus:border-blue-500 transition"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Email & Blood Group Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="patient@example.com"
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-medium focus-ring focus:bg-white focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label htmlFor="bloodGroup" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Blood Group
                  </label>
                  <select
                    id="bloodGroup"
                    name="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-medium focus-ring focus:bg-white focus:border-blue-500 transition"
                  >
                    <option value="">Select (Optional)</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>

              {/* Address */}
              <div>
                <label htmlFor="address" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Residential Address
                </label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Street, City, Postal Code"
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-medium focus-ring focus:bg-white focus:border-blue-500 transition"
                />
              </div>

              {/* DPDP Consent */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/50 border border-blue-100/80 cursor-pointer">
                  <input
                    type="checkbox"
                    name="dpdpConsent"
                    checked={formData.dpdpConsent}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <div className="text-[11px] text-slate-600 leading-snug">
                    <span className="font-bold text-slate-800">DPDP Act 2023 Consent:</span> I consent to the creation and digital processing of my Electronic Medical Records (EMR) for diagnostic and treatment purposes at this healthcare facility.
                  </div>
                </label>
              </div>

              {/* Submit Button */}
              <Button type="submit" variant="primary" size="lg" className="w-full mt-4" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span>Registering Patient Profile...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Registration</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-5 pt-4 border-t border-slate-100 text-center">
              <Link to={`/${hospitalSlug}/login`} className="text-xs text-slate-500 hover:text-slate-800">
                Cancel and return to sign in
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Patient Identity Enforced &bull; Unique UHID Resolution</span>
        </div>
      </div>
    </div>
  );
};

export default RegistrationPage;
