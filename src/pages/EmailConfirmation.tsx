import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Mail, ArrowRight, Loader2, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';

export default function EmailConfirmation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      // Supabase handles the actual verification via the link
      // This page is where the user lands after clicking the link
      // We check if the user is now logged in and verified
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        setStatus('error');
        setMessage('Verification failed. The link may have expired or is invalid.');
        return;
      }

      if (session?.user) {
        setStatus('success');
        setMessage('Your email has been successfully verified! You can now access your dashboard once an admin approves your account.');
      } else {
        // If no session, maybe they are already verified but not logged in on this device
        // Or the link didn't auto-login (depends on Supabase config)
        setStatus('success');
        setMessage('Thank you for verifying your email. You can now log in to your account.');
      }
    };

    handleEmailConfirmation();
  }, []);

  return (
    <div className="min-h-screen pt-24 pb-12 flex items-center justify-center bg-gray-50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-xl shadow-gray-200/50 border border-gray-100 text-center"
      >
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <Loader2 className="h-16 w-16 text-blue-600 animate-spin mb-6" />
            <h1 className="text-2xl font-black text-gray-900 mb-2">Verifying Email</h1>
            <p className="text-gray-500">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center">
            <div className="h-20 w-20 bg-green-100 rounded-3xl flex items-center justify-center text-green-600 mb-6">
              <CheckCircle className="h-10 w-10" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-2">Email Verified!</h1>
            <p className="text-gray-600 mb-8 leading-relaxed">{message}</p>
            <Link
              to="/login"
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
            >
              Go to Login <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <div className="h-20 w-20 bg-red-100 rounded-3xl flex items-center justify-center text-red-600 mb-6">
              <XCircle className="h-10 w-10" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-2">Verification Failed</h1>
            <p className="text-gray-600 mb-8 leading-relaxed">{message}</p>
            <Link
              to="/signup"
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
            >
              Back to Signup
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}
