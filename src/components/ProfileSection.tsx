import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, CreditCard, Edit2, Check, X, LogOut, Phone, MapPin, Camera, Briefcase, Globe, FileText, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';

interface ProfileSectionProps {
  userId: string;
}

export default function ProfileSection({ userId }: ProfileSectionProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newBio, setNewBio] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newWebsite, setNewWebsite] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [isEditingWebsite, setIsEditingWebsite] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      setUser(data);
      setNewName(data.full_name);
      setNewEmail(data.email || '');
      setNewPhone(data.phone || '');
      setNewAddress(data.address || '');
      setNewBio(data.bio || '');
      setNewCompany(data.company || '');
      setNewWebsite(data.website || '');

      // Fetch real plan details if subscription_plan exists
      if (data.subscription_plan) {
        const { data: planData } = await supabase
          .from('subscription_plans')
          .select('*')
          .ilike('name', data.subscription_plan)
          .single();
        
        if (planData) {
          setPlan(planData);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (newName.trim().length < 3) {
      setError('Name must be at least 3 characters long.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: newName })
        .eq('id', userId);
      
      if (error) throw error;
      setUser({ ...user, full_name: newName });
      setIsEditing(false);
      setSuccess('Name updated successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Failed to update name.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEmail = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.updateUser({ email: newEmail });
      if (authError) throw authError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ email: newEmail })
        .eq('id', userId);
      
      if (profileError) throw profileError;

      setUser({ ...user, email: newEmail });
      setIsEditingEmail(false);
      setSuccess('Email update initiated. Please check your new email for verification.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (error: any) {
      console.error('Error updating email:', error);
      setError(error.message || 'Failed to update email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSavePassword = async () => {
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setIsEditingPassword(false);
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Password updated successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error updating password:', error);
      setError(error.message || 'Failed to update password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSavePhone = async () => {
    if (newPhone.trim().length < 5) {
      setError('Phone number must be at least 5 characters long.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ phone: newPhone })
        .eq('id', userId);
      
      if (error) throw error;
      setUser({ ...user, phone: newPhone });
      setIsEditingPhone(false);
      setSuccess('Phone number updated successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error updating phone:', error);
      setError(error.message || 'Failed to update phone number.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAddress = async () => {
    if (newAddress.trim().length < 5) {
      setError('Address must be at least 5 characters long.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ address: newAddress })
        .eq('id', userId);
      
      if (error) throw error;
      setUser({ ...user, address: newAddress });
      setIsEditingAddress(false);
      setSuccess('Address updated successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error updating address:', error);
      setError(error.message || 'Failed to update address.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveBio = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ bio: newBio })
        .eq('id', userId);
      
      if (error) throw error;
      setUser({ ...user, bio: newBio });
      setIsEditingBio(false);
      setSuccess('Bio updated successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error updating bio:', error);
      setError(error.message || 'Failed to update bio.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCompany = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ company: newCompany })
        .eq('id', userId);
      
      if (error) throw error;
      setUser({ ...user, company: newCompany });
      setIsEditingCompany(false);
      setSuccess('Company updated successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error updating company:', error);
      setError(error.message || 'Failed to update company.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveWebsite = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ website: newWebsite })
        .eq('id', userId);
      
      if (error) throw error;
      setUser({ ...user, website: newWebsite });
      setIsEditingWebsite(false);
      setSuccess('Website updated successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error updating website:', error);
      setError(error.message || 'Failed to update website.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);
      
      if (profileError) throw profileError;

      setUser({ ...user, avatar_url: publicUrl });
      setSuccess('Profile image updated successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      setError(error.message || 'Failed to upload profile image.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setNewName(user?.full_name || '');
    setNewEmail(user?.email || '');
    setNewPhone(user?.phone || '');
    setNewAddress(user?.address || '');
    setNewBio(user?.bio || '');
    setNewCompany(user?.company || '');
    setNewWebsite(user?.website || '');
    setNewPassword('');
    setConfirmPassword('');
    setIsEditing(false);
    setIsEditingEmail(false);
    setIsEditingPhone(false);
    setIsEditingAddress(false);
    setIsEditingBio(false);
    setIsEditingCompany(false);
    setIsEditingWebsite(false);
    setIsEditingPassword(false);
    setError(null);
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-[2.5rem] p-12 text-center border border-gray-100 shadow-sm">
        <p className="text-gray-500 font-bold">Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-white rounded-[2.5rem] p-12 text-center border border-gray-100 shadow-sm">
        <p className="text-gray-500 font-bold">Profile not found.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden"
    >
      {/* Header/Cover */}
      <div className="h-32 bg-gradient-to-r from-blue-600 to-blue-400"></div>
      
      <div className="px-8 pb-8">
        {/* Notifications */}
        {(error || success) && (
          <div className="mt-4">
            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold flex items-center gap-2">
                <X className="h-4 w-4" /> {error}
              </div>
            )}
            {success && (
              <div className="p-4 bg-green-50 text-green-600 rounded-2xl text-sm font-bold flex items-center gap-2">
                <Check className="h-4 w-4" /> {success}
              </div>
            )}
          </div>
        )}

        {/* Profile Picture & Name Section */}
        <div className="relative -mt-12 mb-8 flex flex-col items-center sm:items-start sm:flex-row sm:gap-6">
          <div className="h-24 w-24 bg-white rounded-3xl p-1 shadow-lg relative group">
            <div className="h-full w-full bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 text-3xl font-black overflow-hidden">
              {user.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt={user.full_name} 
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                (user.full_name || 'U').charAt(0)
              )}
            </div>
            <label className="absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full shadow-lg cursor-pointer hover:bg-blue-700 transition-colors border-2 border-white">
              <Camera className="h-4 w-4 text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={isSubmitting} />
            </label>
          </div>
          
          <div className="mt-4 sm:mt-14 text-center sm:text-left flex-1">
            {isEditing ? (
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="text-2xl font-black text-gray-900 border-b-2 border-blue-600 focus:outline-none bg-transparent px-1"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveName}
                    disabled={isSubmitting}
                    className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors disabled:opacity-50"
                  >
                    <Check className="h-5 w-5" />
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <h1 className="text-3xl font-black text-gray-900">{user.full_name}</h1>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                    user.status === 'approved' ? "bg-green-100 text-green-700" :
                    user.status === 'suspended' ? "bg-red-100 text-red-700" :
                    user.status === 'rejected' ? "bg-gray-100 text-gray-700" :
                    "bg-yellow-100 text-yellow-700"
                  )}>
                    {user.status || 'pending'}
                  </span>
                </div>
              </div>
            )}
            <p className="text-gray-500 font-medium uppercase tracking-wider text-sm mt-1">{user.role}</p>
          </div>

          <div className="mt-4 sm:mt-14">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-all"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-900">Email Address</h3>
              </div>
              {!isEditingEmail && (
                <button
                  onClick={() => setIsEditingEmail(true)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              )}
            </div>
            {isEditingEmail ? (
              <div className="space-y-3">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none"
                  placeholder="Enter new email"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEmail}
                    disabled={isSubmitting}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    Update Email
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-600">{user.email || 'No email provided'}</p>
            )}
          </div>

          <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <Phone className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-900">Phone Number</h3>
              </div>
              {!isEditingPhone && (
                <button
                  onClick={() => setIsEditingPhone(true)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              )}
            </div>
            {isEditingPhone ? (
              <div className="space-y-3">
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none"
                  placeholder="Enter phone number"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSavePhone}
                    disabled={isSubmitting}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    Update Phone
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-600">{user.phone || 'No phone number provided'}</p>
            )}
          </div>

          <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-900">Address</h3>
              </div>
              {!isEditingAddress && (
                <button
                  onClick={() => setIsEditingAddress(true)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              )}
            </div>
            {isEditingAddress ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none"
                  placeholder="Enter address"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveAddress}
                    disabled={isSubmitting}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    Update Address
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-600">{user.address || 'No address provided'}</p>
            )}
          </div>

          <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-900">Security</h3>
              </div>
              {!isEditingPassword && (
                <button
                  onClick={() => setIsEditingPassword(true)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              )}
            </div>
            {isEditingPassword ? (
              <div className="space-y-3">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none"
                  placeholder="New password"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none"
                  placeholder="Confirm new password"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSavePassword}
                    disabled={isSubmitting}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    Update Password
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-600">••••••••••••</p>
            )}
          </div>

          <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-900">Company / Agency</h3>
              </div>
              {!isEditingCompany && (
                <button
                  onClick={() => setIsEditingCompany(true)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              )}
            </div>
            {isEditingCompany ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none"
                  placeholder="Enter company name"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveCompany}
                    disabled={isSubmitting}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    Update Company
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-600">{user.company || 'No company provided'}</p>
            )}
          </div>

          <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <Globe className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-900">Website</h3>
              </div>
              {!isEditingWebsite && (
                <button
                  onClick={() => setIsEditingWebsite(true)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              )}
            </div>
            {isEditingWebsite ? (
              <div className="space-y-3">
                <input
                  type="url"
                  value={newWebsite}
                  onChange={(e) => setNewWebsite(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none"
                  placeholder="https://example.com"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveWebsite}
                    disabled={isSubmitting}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    Update Website
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-600">{user.website || 'No website provided'}</p>
            )}
          </div>

          <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-900">Bio / About Me</h3>
              </div>
              {!isEditingBio && (
                <button
                  onClick={() => setIsEditingBio(true)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              )}
            </div>
            {isEditingBio ? (
              <div className="space-y-3">
                <textarea
                  value={newBio}
                  onChange={(e) => setNewBio(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none min-h-[120px]"
                  placeholder="Tell us about yourself..."
                ></textarea>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveBio}
                    disabled={isSubmitting}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    Update Bio
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-600 whitespace-pre-wrap">{user.bio || 'No bio provided'}</p>
            )}
          </div>

          <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 md:col-span-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Subscription Plan</h3>
                  <p className="text-sm text-gray-500">Current active plan</p>
                </div>
              </div>
              <div className="text-right w-full sm:w-auto">
                <span className="text-xl font-black text-gray-900 block">{plan?.name || user?.subscription_plan || 'New Comers'}</span>
                <Link to="/pricing" className="text-blue-600 text-sm font-bold hover:underline mt-1">Upgrade Plan</Link>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-bold text-gray-900 mb-3">Plan Features:</h4>
              {plan ? (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {plan.features?.map((feature: string, idx: number) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="h-1.5 w-1.5 bg-blue-600 rounded-full"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic">No features listed for this plan.</p>
              )}
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mt-12 pt-8 border-t border-gray-100">
          <h3 className="text-lg font-bold text-red-600 mb-4">Danger Zone</h3>
          <button className="px-6 py-3 border border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-colors">
            Deactivate Account
          </button>
        </div>
      </div>
    </motion.div>
  );
}
