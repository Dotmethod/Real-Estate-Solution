import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Building2, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { getSafeSession } from '../lib/auth';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  useEffect(() => {
    const checkSession = async () => {
      if (searchParams.get('reset') === 'true') {
        // Force a clean slate
        await supabase.auth.signOut().catch(() => {});
        localStorage.clear();
        sessionStorage.clear();
        setInfoMessage('Session has been reset. You can now log in again.');
        
        // Remove the reset param from URL
        setSearchParams({}, { replace: true });
        return;
      }

      // If we are resetting, don't check session yet
      if (searchParams.get('reset') === 'true') return;

      try {
        const { session, error: sessionError } = await getSafeSession();
        
        if (sessionError) {
          console.error('Session retrieval error:', sessionError);
        }

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
      } catch (err) {
        console.error('Session check failed:', err);
      }
    };

    checkSession();

    if (searchParams.get('message') === 'pending') {
      setInfoMessage('Your account is pending admin approval. You will be able to log in once approved.');
    } else if (searchParams.get('message') === 'verify') {
      setInfoMessage('A verification email has been sent. Please check your inbox and verify your email to continue.');
    }
  }, [searchParams, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;

      if (data.user) {
        // Fetch profile to check status and role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('status, role')
          .eq('id', data.user.id)
          .single();

        if (profileError) throw profileError;

        // Check if user is suspended (admins are always allowed)
        if (profile?.status === 'suspended' && profile?.role !== 'admin') {
          // We allow suspended users to log in so they can see their status, 
          // but we will restrict their actions in the dashboard.
          // If you prefer to block them entirely, uncomment the next two lines:
          // await supabase.auth.signOut();
          // throw new Error('Your account has been suspended. Please contact an administrator.');
        }

        if (profile?.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      
      let userFriendlyMessage = err.message;
      let showResend = false;

      // Map common Supabase auth errors to user-friendly messages
      if (err.message?.toLowerCase().includes('invalid login credentials')) {
        userFriendlyMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (err.message?.toLowerCase().includes('email not confirmed')) {
        userFriendlyMessage = 'Your email address has not been verified. Please check your inbox for a verification link.';
        showResend = true;
      } else if (err.message?.toLowerCase().includes('user not found')) {
        userFriendlyMessage = 'No account found with this email address. Please sign up first.';
      } else if (err.message?.toLowerCase().includes('rate limit')) {
        userFriendlyMessage = 'Too many login attempts. Please try again later.';
      } else if (err.message?.toLowerCase().includes('network')) {
        userFriendlyMessage = 'Network error. Please check your internet connection.';
      }

      setError(userFriendlyMessage);
      setCanResend(showResend);
    } finally {
      setIsLoading(false);
    }
  };

  const [canResend, setCanResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const handleResendVerification = async () => {
    setResendLoading(true);
    try {
      let origin = process.env.APP_URL || window.location.origin;
      if (origin.includes('localhost') && !window.location.hostname.includes('localhost')) {
        origin = `${window.location.protocol}//${window.location.host}`;
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${origin}/email-confirmation`,
        },
      });
      if (error) throw error;
      setInfoMessage('Verification email resent! Please check your inbox.');
      setCanResend(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-16 flex items-center justify-center bg-gray-50 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-2xl md:rounded-[2.5rem] p-6 md:p-10 shadow-xl shadow-gray-200/50 border border-gray-100"
      >
        <div className="text-center mb-8 md:mb-10">
          <div className="h-12 w-12 md:h-16 md:w-16 bg-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-lg shadow-blue-200">
            <Building2 className="h-6 w-6 md:h-8 md:w-8 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-sm md:text-base text-gray-500">Enter your credentials to access your account</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex flex-col gap-3 text-red-600 text-sm">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 shrink-0" />
              {error}
            </div>
            {canResend && (
              <button
                onClick={handleResendVerification}
                disabled={resendLoading}
                className="text-blue-600 font-bold hover:underline text-left ml-8 disabled:opacity-50"
              >
                {resendLoading ? 'Resending...' : 'Resend verification email'}
              </button>
            )}
          </div>
        )}

        {infoMessage && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3 text-blue-600 text-sm">
            <Info className="h-5 w-5 shrink-0" />
            {infoMessage}
          </div>
        )}

        <form className="space-y-6" onSubmit={handleLogin}>
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

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-600" />
              <span className="text-gray-600">Remember me</span>
            </label>
            <Link to="/forgot-password" title="Forgot password?" className="text-blue-600 font-bold hover:underline">Forgot password?</Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-50"
          >
            {isLoading ? 'Signing In...' : 'Sign In'} <ArrowRight className="h-5 w-5" />
          </button>
        </form>

        <p className="text-center mt-8 text-sm text-gray-500">
          Don't have an account?{' '}
          <Link to="/signup" className="text-blue-600 font-bold hover:underline">Create one</Link>
        </p>

        <div className="mt-8 pt-8 border-t border-gray-50 text-center">
          <p className="text-xs text-gray-400 mb-4">Having trouble? Your session might be corrupted.</p>
          <button
            onClick={() => window.location.href = '/login?reset=true'}
            className="text-xs font-bold text-red-500 hover:text-red-600 underline"
          >
            Force Session Reset & Logout
          </button>
        </div>
      </motion.div>
    </div>
  );
}
