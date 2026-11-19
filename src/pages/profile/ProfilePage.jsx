import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  User, 
  Lock, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  Smartphone, 
  Mail, 
  MapPin, 
  HeartPulse,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePortalBranding } from '../../context/PortalBrandingContext';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import profileService from '../../services/profileService';

export const ProfilePage = () => {
  const { hospitalSlug } = useParams();
  const { user } = useAuth();
  const { hospital } = usePortalBranding();

  const patientId = user?.id || user?._id;

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Profile Form state
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Male',
    contact: '',
    email: '',
    bloodGroup: '',
    address: '',
    uhId: '',
    patientId: ''
  });

  useEffect(() => {
    if (!patientId) return;

    const loadProfile = async () => {
      setLoading(true);
      try {
        const data = await profileService.getMyProfile(patientId);
        if (data) {
          setFormData({
            name: data.name || '',
            age: data.age || '',
            gender: data.gender || 'Male',
            contact: data.contact || '',
            email: data.email || '',
            bloodGroup: data.bloodGroup || '',
            address: data.address || '',
            uhId: data.uhId || '',
            patientId: data.patientId || ''
          });
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
        setProfileError('Failed to load patient profile details.');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [patientId]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (profileSuccess) setProfileSuccess('');
    if (profileError) setProfileError('');
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!patientId) return;

    setSavingProfile(true);
    setProfileSuccess('');
    setProfileError('');

    try {
      const payload = {
        name: formData.name.trim(),
        age: parseInt(formData.age, 10) || undefined,
        gender: formData.gender,
        email: formData.email.trim() || undefined,
        bloodGroup: formData.bloodGroup || undefined,
        address: formData.address.trim() || undefined
      };

      await profileService.updateMyProfile(patientId, payload);
      setProfileSuccess('Profile information updated successfully.');
    } catch (err) {
      setProfileError(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!patientId) return;

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setSavingPassword(true);
    setPasswordSuccess('');
    setPasswordError('');

    try {
      await profileService.changePassword(patientId, {
        currentPassword,
        newPassword
      });
      setPasswordSuccess('Account password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err.response?.data?.error || 'Failed to change password. Please verify current password.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Patient Profile & Account Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your verified demographic data, emergency contact, and portal credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Identity Snapshot Card */}
        <div className="space-y-4">
          <Card className="border-slate-200 shadow-2xs">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl mx-auto mb-3 shadow-md">
                {formData.name ? formData.name.charAt(0).toUpperCase() : <User className="w-8 h-8" />}
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">
                {formData.name || 'Patient'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {formData.gender} {formData.age ? `• ${formData.age} yrs` : ''}
              </p>

              <div className="mt-4 pt-4 border-t border-slate-100 text-left space-y-2.5 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">National UHID</span>
                  <span className="font-mono font-bold text-slate-800">{formData.uhId || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Clinic Patient ID</span>
                  <span className="font-mono font-bold text-slate-800">{formData.patientId || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Associated Facility</span>
                  <span className="font-semibold text-blue-600">{hospital?.name || hospitalSlug}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Edit Profile & Password Cards */}
        <div className="md:col-span-2 space-y-6">
          {/* Edit Profile Form */}
          <Card className="border-slate-200 shadow-2xs">
            <CardContent className="p-5 sm:p-6">
              <h3 className="font-extrabold text-slate-900 text-sm mb-4">
                Personal Demographic Information
              </h3>

              {profileError && (
                <div className="mb-4 flex items-center gap-2 bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              {profileSuccess && (
                <div className="mb-4 flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs p-3 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleProfileChange}
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus-ring focus:bg-white"
                  />
                </div>

                {/* Age & Gender */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="age" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Age (Years)
                    </label>
                    <input
                      id="age"
                      name="age"
                      type="number"
                      value={formData.age}
                      onChange={handleProfileChange}
                      className="w-full min-h-[44px] px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus-ring focus:bg-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="gender" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Gender
                    </label>
                    <select
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleProfileChange}
                      className="w-full min-h-[44px] px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus-ring focus:bg-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Contact (Locked) & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Primary Mobile (Locked)
                    </label>
                    <div className="min-h-[44px] px-3.5 py-2.5 flex items-center justify-between text-xs rounded-xl bg-slate-100 border border-slate-200 text-slate-500 font-mono">
                      <span>+91 {formData.contact}</span>
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Email Address
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleProfileChange}
                      className="w-full min-h-[44px] px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus-ring focus:bg-white"
                    />
                  </div>
                </div>

                {/* Blood Group & Address */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="bloodGroup" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Blood Group
                    </label>
                    <select
                      id="bloodGroup"
                      name="bloodGroup"
                      value={formData.bloodGroup}
                      onChange={handleProfileChange}
                      className="w-full min-h-[44px] px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus-ring focus:bg-white"
                    >
                      <option value="">Select</option>
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
                  <div className="sm:col-span-2">
                    <label htmlFor="address" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Residential Address
                    </label>
                    <input
                      id="address"
                      name="address"
                      type="text"
                      value={formData.address}
                      onChange={handleProfileChange}
                      className="w-full min-h-[44px] px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus-ring focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <Button type="submit" variant="primary" size="md" disabled={savingProfile}>
                    {savingProfile ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5 mr-1.5" />
                        <span>Update Profile</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Account Password Change Card */}
          <Card className="border-slate-200 shadow-2xs">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <KeyRound className="w-4 h-4 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Change Account Password
                </h3>
              </div>

              {passwordError && (
                <div className="mb-4 flex items-center gap-2 bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="mb-4 flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs p-3 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Current Password</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter existing password"
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus-ring focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">New Password</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full min-h-[44px] px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus-ring focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full min-h-[44px] px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus-ring focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" variant="secondary" size="md" disabled={savingPassword}>
                    {savingPassword ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <span>Update Password</span>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
