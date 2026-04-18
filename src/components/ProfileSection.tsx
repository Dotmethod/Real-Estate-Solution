import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, CreditCard, Edit2, Check, X, LogOut, Phone, MapPin, Camera, Briefcase, Globe, FileText, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
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
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newBio, setNewBio] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
    checkCurrentUser();
  }, [userId]);

  const checkCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

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
      setNewPhone(data.phone || '');
      setNewAddress(data.address || '');
      setNewBio(data.bio || '');
      setNewCompany(data.company || '');

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

  const handleSavePassword = () => {
    const trimmedPassword = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (trimmedPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }
    if (trimmedPassword !== trimmedConfirm) {
      setPasswordError('Passwords do not match.');
      return;
    }
    
    setPasswordError(null);
    setShowPasswordConfirm(true);
  };

  const executePasswordUpdate = async () => {
    const trimmedPassword = newPassword.trim();
    setIsSubmitting(true);
    setPasswordError(null);
    setPasswordSuccess(null);
    setShowPasswordConfirm(false);
    
    try {
      // Check if we have a current session
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        throw new Error('You must be logged in to update your password.');
      }

      console.log('Attempting password update for user:', authUser.id);
      const { error } = await supabase.auth.updateUser({ password: trimmedPassword });
      if (error) throw error;

      setPasswordSuccess('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
      
      // Keep it open for a moment to show success, then close
      setTimeout(() => {
        setIsEditingPassword(false);
        setPasswordSuccess(null);
      }, 2000);
    } catch (error: any) {
      console.error('Error updating password:', error);
      setPasswordError(error.message || 'Failed to update password.');
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSubmitting(true);
    setError(null);
    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file (JPG, PNG, etc).');
      }

      // Limit file size to 1MB for profile pictures
      if (file.size > 1 * 1024 * 1024) {
        throw new Error('Image size must be less than 1MB.');
      }

      const fileExt = file.name.split('.').pop() || 'jpg';
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
      
      // Reset file input so the same file can be selected again
      if (e.target) {
        e.target.value = '';
      }
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      setError(error.message || 'Failed to upload profile image.');
      
      // Reset file input even on error
      if (e.target) {
        e.target.value = '';
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setNewName(user?.full_name || '');
    setNewPhone(user?.phone || '');
    setNewAddress(user?.address || '');
    setNewBio(user?.bio || '');
    setNewCompany(user?.company || '');
    setNewPassword('');
    setConfirmPassword('');
    setIsEditing(false);
    setIsEditingPhone(false);
    setIsEditingAddress(false);
    setIsEditingBio(false);
    setIsEditingCompany(false);
    setIsEditingPassword(false);
    setError(null);
    setPasswordError(null);
    setPasswordSuccess(null);
  };

  const isProfileComplete = () => {
    return !!(user?.full_name && user?.phone && user?.address && user?.avatar_url && user?.bio);
  };

  const handleSubmitForReview = async () => {
    if (!isProfileComplete()) {
      setError('Please complete all required fields (Photo, Phone, and Address) before submitting for review.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Update the profile status to notify admin
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          status: 'review_requested',
        })
        .eq('id', userId);

      if (updateError) throw updateError;
      
      // Update local user state
      setUser((prev: any) => ({ ...prev, status: 'review_requested' }));

      // Update local state to reflect submission
      setSuccess('Your profile has been submitted for review! An administrator will verify your details soon.');
      
      // Optionally notify admin via API
      try {
        await axios.post('/api/notify-admin-ready', {
          userId,
          name: user.full_name,
          email: user.email
        });
      } catch (err) {
        console.error('Error triggering review notification:', err);
      }

      setTimeout(() => setSuccess(null), 10000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit for review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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
            <div className="h-full w-full bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 text-3xl font-black overflow-hidden relative">
              {isSubmitting && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                  <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                </div>
              )}
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
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                fileInputRef.current?.click();
              }}
              disabled={isSubmitting}
              className="absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full shadow-lg cursor-pointer hover:bg-blue-700 transition-colors border-2 border-white disabled:opacity-50 disabled:cursor-not-allowed z-20"
              title="Upload profile picture (Max 1MB)"
            >
              <Camera className="h-4 w-4 text-white" />
            </button>
            <p className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-black text-gray-400 uppercase tracking-tighter">Max: 1MB</p>
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              capture={false}
              className="hidden" 
              onChange={handleAvatarUpload} 
              disabled={isSubmitting} 
            />
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

        {/* Action Button for Profile Completion */}
        {(user.role === 'agent' || user.role === 'owner') && (user.status === 'pending' || user.status === 'review_requested') && (
          <div className="mt-8 space-y-6">
            {/* Progress Checklist */}
            <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black text-gray-900">
                    {isProfileComplete() ? 'Profile Complete - Ready for Verification' : 'Verification Checklist'}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    {isProfileComplete() 
                      ? 'Congratulations! Your profile is 100% complete and ready for admin verification.' 
                      : 'Complete these steps to unlock property listings'}
                  </p>
                </div>
                {!isProfileComplete() && (
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-32 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div 
                        key={Object.values({
                          photo: !!user.avatar_url,
                          name: !!user.full_name,
                          phone: !!user.phone,
                          address: !!user.address,
                          bio: !!user.bio
                        }).filter(Boolean).length}
                        initial={{ width: 0 }}
                        animate={{ width: `${(Object.values({
                          photo: !!user.avatar_url,
                          name: !!user.full_name,
                          phone: !!user.phone,
                          address: !!user.address,
                          bio: !!user.bio
                        }).filter(Boolean).length / 5) * 100}%` }}
                        className="h-full bg-blue-600 rounded-full"
                      />
                    </div>
                    <span className="text-xs font-black text-blue-600">
                      {Math.round((Object.values({
                        photo: !!user.avatar_url,
                        name: !!user.full_name,
                        phone: !!user.phone,
                        address: !!user.address,
                        bio: !!user.bio
                      }).filter(Boolean).length / 5) * 100)}%
                    </span>
                  </div>
                )}
              </div>

              {isProfileComplete() ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-6 text-center"
                >
                  <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
                    <CheckCircle className="h-8 w-8" />
                  </div>
                  <h4 className="text-lg font-black text-gray-900">100% Complete!</h4>
                  <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
                    Your profile is ready. Click the button below to notify administrators.
                  </p>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Profile Photo', done: !!user.avatar_url, icon: Camera },
                    { label: 'Full Name', done: !!user.full_name, icon: User },
                    { label: 'Phone Number', done: !!user.phone, icon: Phone },
                    { label: 'Physical Address', done: !!user.address, icon: MapPin },
                    { label: 'Agent Bio', done: !!user.bio, icon: FileText },
                  ].map((item, i) => (
                    <div key={i} className={cn(
                      "flex items-center gap-3 p-4 rounded-2xl border transition-all",
                      item.done ? "bg-green-50 border-green-100" : "bg-white border-red-50/50 border-red-100"
                    )}>
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center",
                        item.done ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"
                      )}>
                        {item.done ? <item.icon className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      </div>
                      <span className={cn(
                        "text-sm font-black",
                        item.done ? "text-green-900" : "text-red-600"
                      )}>
                        {item.label}
                      </span>
                      {item.done && <Check className="h-4 w-4 ml-auto text-green-600" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {user.status === 'review_requested' ? (
              <div className="p-8 bg-green-50 rounded-[2.5rem] border border-green-100 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1">
                  <h3 className="text-xl font-black text-green-900 mb-2">Review in Progress</h3>
                  <p className="text-sm text-green-700 font-medium">
                    Our administrators are currently verifying your documentation. You will be notified once your account is fully activated.
                  </p>
                </div>
                <div className="px-6 py-3 bg-white text-green-600 rounded-xl font-black flex items-center gap-2 shadow-sm">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  Processing
                </div>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-8 bg-blue-50 rounded-[2.5rem] border border-blue-100 flex flex-col md:flex-row items-center justify-between gap-6"
              >
                <div className="flex-1">
                  <h3 className="text-xl font-black text-blue-900 mb-2">Submit Profile for Approval</h3>
                  <p className="text-sm text-blue-700 font-medium">
                    Once your checklist is all green, click the button to notify our team for verification and listing activation.
                  </p>
                </div>
                <button
                  onClick={handleSubmitForReview}
                  disabled={isSubmitting}
                  className={cn(
                    "px-8 py-4 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg",
                    isProfileComplete() 
                      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200" 
                      : "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <Check className="h-5 w-5" /> Submit for Review
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </div>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <span className="text-xl font-black text-gray-900 block">{plan?.name || user?.subscription_plan || 'Starter Plan'}</span>
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

        {/* Account Settings */}
        <div className="mt-12 space-y-8">
          <div className="p-8 bg-blue-50/30 rounded-[2.5rem] border border-blue-100/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-blue-600">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900">Account Security</h3>
                <p className="text-xs text-gray-500 font-medium">Protect your account with a strong password</p>
              </div>
              {!isEditingPassword && currentUserId === userId && (
                <button
                  onClick={() => {
                    setIsEditingPassword(true);
                    setPasswordError(null);
                    setPasswordSuccess(null);
                  }}
                  className="ml-auto px-4 py-2 bg-white text-blue-600 rounded-xl text-xs font-bold border border-blue-100 hover:bg-blue-50 transition-colors"
                >
                  Change Password
                </button>
              )}
            </div>

            {isEditingPassword && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 max-w-md"
              >
                {passwordError && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100 flex items-center gap-2">
                    <X className="h-3 w-3" /> {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div className="p-3 bg-green-50 text-green-600 rounded-xl text-xs font-bold border border-green-100 flex items-center gap-2">
                    <Check className="h-3 w-3" /> {passwordSuccess}
                  </div>
                )}
                <div className="space-y-3">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none bg-white"
                    placeholder="New password"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none bg-white"
                    placeholder="Confirm new password"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSavePassword}
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-white text-gray-600 rounded-xl font-bold text-sm border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Danger Zone */}
          <div className="mt-12 pt-8 border-t border-gray-100">
            <h3 className="text-lg font-bold text-red-600 mb-4">Danger Zone</h3>
            <button className="px-6 py-3 border border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-colors">
              Deactivate Account
            </button>
          </div>
        </div>
      </div>
      
      {/* Password Update Confirmation Modal */}
      <AnimatePresence>
        {showPasswordConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl relative overflow-hidden"
            >
              {/* Decorative background element */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-50 rounded-full -mr-16 -mt-16 blur-2xl opacity-50"></div>
              
              <div className="flex flex-col items-center text-center relative">
                <div className="h-16 w-16 bg-yellow-100 rounded-2xl flex items-center justify-center text-yellow-600 mb-6">
                  <AlertTriangle className="h-8 w-8" />
                </div>
                
                <h3 className="text-xl font-black text-gray-900 mb-2">Update Password?</h3>
                <p className="text-gray-500 font-medium text-sm leading-relaxed mb-8">
                  Are you sure you want to change your password? You will need to use your new password for all future logins.
                </p>
                
                <div className="flex flex-col w-full gap-3">
                  <button
                    onClick={executePasswordUpdate}
                    className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                  >
                    Confirm Change
                  </button>
                  <button
                    onClick={() => setShowPasswordConfirm(false)}
                    className="w-full py-4 bg-gray-50 text-gray-600 rounded-xl font-black text-sm hover:bg-gray-100 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
