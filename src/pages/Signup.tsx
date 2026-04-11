import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, ShieldCheck, Phone, MapPin, Camera } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

export default function Signup() {
  const navigate = useNavigate();
  const [role, setRole] = useState<'agent' | 'owner'>('agent');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!avatar && email.toLowerCase() !== 'ebokpo.method@gmail.com') {
      setError('Please upload a profile image.');
      setIsLoading(false);
      return;
    }

    try {
      // Automatically assign admin role to the developer/owner email
      const finalRole = email.toLowerCase() === 'ebokpo.method@gmail.com' ? 'admin' : role;

      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role: finalRole,
            status: finalRole === 'admin' ? 'approved' : 'pending',
            phone,
            address,
          },
        },
      });

      if (signupError) throw signupError;

      if (data.user) {
        // Upload avatar if provided
        let avatarUrl = '';
        if (avatar) {
          const fileExt = avatar.name.split('.').pop();
          const fileName = `${data.user.id}-${Date.now()}.${fileExt}`;
          const filePath = `avatars/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('profile-images')
            .upload(filePath, avatar);

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('profile-images')
              .getPublicUrl(filePath);
            avatarUrl = publicUrl;
          }
        }

        // Create/Update profile with additional info
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            full_name: name,
            role: finalRole,
            status: finalRole === 'admin' ? 'approved' : 'pending',
            phone,
            address,
            avatar_url: avatarUrl,
            email: email,
            subscription_plan: 'New Comers'
          });

        if (profileError) console.error('Error creating/updating profile:', profileError);

        if (finalRole === 'admin') {
          navigate('/admin');
        } else {
          // Show a success message or redirect to login with a message
          setStatusMessage('Your account has been created and is pending admin approval. You will be able to log in once approved.');
          // Or just navigate to login with a query param
          setTimeout(() => navigate('/login?message=pending'), 3000);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  React.useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        if (profile?.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }
    };
    checkSession();
  }, [navigate]);

  return (
    <div className="min-h-screen pt-24 pb-12 flex items-center justify-center bg-gray-50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full bg-white rounded-[2.5rem] p-10 shadow-xl shadow-gray-200/50 border border-gray-100"
      >
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-gray-900 mb-2">Join Real Estate Solution</h1>
          <p className="text-gray-500">Choose your account type and start listing today</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        {statusMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-3 text-green-600 text-sm">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            {statusMessage}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-10">
          <button
            onClick={() => setRole('agent')}
            className={cn(
              "p-6 rounded-2xl border-2 transition-all text-left",
              role === 'agent' ? "border-blue-600 bg-blue-50/50" : "border-gray-100 hover:border-gray-200"
            )}
          >
            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center mb-4", role === 'agent' ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500")}>
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="font-bold text-gray-900">Agent</p>
            <p className="text-xs text-gray-500 mt-1">I represent an agency</p>
          </button>
          
          <button
            onClick={() => setRole('owner')}
            className={cn(
              "p-6 rounded-2xl border-2 transition-all text-left",
              role === 'owner' ? "border-blue-600 bg-blue-50/50" : "border-gray-100 hover:border-gray-200"
            )}
          >
            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center mb-4", role === 'owner' ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500")}>
              <User className="h-6 w-6" />
            </div>
            <p className="font-bold text-gray-900">Owner</p>
            <p className="text-xs text-gray-500 mt-1">I own the property</p>
          </button>
        </div>

        <form className="space-y-6" onSubmit={handleSignup}>
          {/* Profile Image Upload */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group">
              <div className="h-24 w-24 bg-gray-100 rounded-3xl overflow-hidden border-2 border-dashed border-gray-300 group-hover:border-blue-600 transition-all">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar Preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center text-gray-400">
                    <Camera className="h-8 w-8 mb-1" />
                    <span className="text-[10px] font-bold uppercase">Upload</span>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              {avatarPreview && (
                <div className="absolute -bottom-2 -right-2 h-8 w-8 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                  <Camera className="h-4 w-4" />
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-3 font-medium">Profile Image (Required)</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-blue-600 focus:bg-white focus:outline-none transition-all"
                  placeholder="John Doe"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-blue-600 focus:bg-white focus:outline-none transition-all"
                  placeholder="name@example.com"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-blue-600 focus:bg-white focus:outline-none transition-all"
                  placeholder="+234 800 000 0000"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Office/Home Address</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-blue-600 focus:bg-white focus:outline-none transition-all"
                  placeholder="123 Street Name, City"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-blue-600 focus:bg-white focus:outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
            <p className="text-xs text-blue-800 leading-relaxed">
              By signing up, you agree to our <a href="#" className="font-bold underline">Terms of Service</a> and <a href="#" className="font-bold underline">Privacy Policy</a>. Your account will be reviewed by our admin team before you can start listing.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-50"
          >
            {isLoading ? 'Creating Account...' : 'Create Account'} <ArrowRight className="h-5 w-5" />
          </button>
        </form>

        <p className="text-center mt-8 text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 font-bold hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
