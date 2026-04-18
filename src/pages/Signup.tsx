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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [defaultPlanName, setDefaultPlanName] = useState('Free Plan');

  React.useEffect(() => {
    const fetchDefaultPlan = async () => {
      try {
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('name')
          .eq('price', 0)
          .limit(1)
          .single();
        
        if (data && !error) {
          setDefaultPlanName(data.name);
        }
      } catch (err) {
        console.error('Error fetching default plan:', err);
      }
    };
    fetchDefaultPlan();
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Automatically assign admin role to the developer/owner email
      const finalRole = email.toLowerCase() === 'ebokpo.method@gmail.com' ? 'admin' : role;

      let origin = process.env.APP_URL || window.location.origin;
      if (origin.includes('localhost') && !window.location.hostname.includes('localhost')) {
        origin = `${window.location.protocol}//${window.location.host}`;
      }

      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${origin}/email-confirmation`,
          data: {
            full_name: name,
            role: finalRole,
            status: finalRole === 'admin' ? 'approved' : 'pending',
            subscription_updated_at: new Date().toISOString(),
          },
        },
      });

      if (signupError) throw signupError;

      if (data.user) {
        // Update user metadata for redundancy so fallbacks can recover state if profiles table write fails or is delayed
        await supabase.auth.updateUser({
          data: {
            full_name: name,
            role: finalRole,
          }
        });

        // Create/Update profile with additional info
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            full_name: name,
            role: finalRole,
            status: finalRole === 'admin' ? 'approved' : 'pending',
            email: email,
            subscription_plan: defaultPlanName
          });

        if (profileError) console.error('Error creating/updating profile:', profileError);

        // Send Welcome Email to User
        try {
          fetch('/api/send-welcome-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name }),
          }).catch(err => console.error('Error calling welcome email API:', err));
        } catch (emailErr) {
          console.error('Error triggering email notifications:', emailErr);
        }

        // Inform user about email verification
        setStatusMessage('Account created! Please check your email for a verification link. You must verify your email before you can log in.');
        
        // Scroll to top to see the message
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
        className="max-w-xl w-full bg-white rounded-2xl md:rounded-[2.5rem] p-6 md:p-10 shadow-xl shadow-gray-200/50 border border-gray-100"
      >
        <div className="text-center mb-8 md:mb-10">
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">Join Real Estate Solution</h1>
          <p className="text-sm md:text-base text-gray-500">Choose your account type and start listing today</p>
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

        <div className="grid grid-cols-2 gap-3 md:gap-4 mb-8 md:mb-10">
          <button
            onClick={() => setRole('agent')}
            className={cn(
              "p-4 md:p-6 rounded-xl md:rounded-2xl border-2 transition-all text-left",
              role === 'agent' ? "border-blue-600 bg-blue-50/50" : "border-gray-100 hover:border-gray-200"
            )}
          >
            <div className={cn("h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl flex items-center justify-center mb-3 md:mb-4", role === 'agent' ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500")}>
              <ShieldCheck className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <p className="text-sm md:text-base font-bold text-gray-900">Agent</p>
            <p className="text-[10px] md:text-xs text-gray-500 mt-1">I represent an agency</p>
          </button>
          
          <button
            onClick={() => setRole('owner')}
            className={cn(
              "p-4 md:p-6 rounded-xl md:rounded-2xl border-2 transition-all text-left",
              role === 'owner' ? "border-blue-600 bg-blue-50/50" : "border-gray-100 hover:border-gray-200"
            )}
          >
            <div className={cn("h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl flex items-center justify-center mb-3 md:mb-4", role === 'owner' ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500")}>
              <User className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <p className="text-sm md:text-base font-bold text-gray-900">Owner</p>
            <p className="text-[10px] md:text-xs text-gray-500 mt-1">I own the property</p>
          </button>
        </div>

        <form className="space-y-6" onSubmit={handleSignup}>
          <div className="grid grid-cols-1 gap-6">
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
