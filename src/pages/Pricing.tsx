import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { usePaystackPayment } from 'react-paystack';
import { CheckCircle, CreditCard, Loader2 } from 'lucide-react';
import { formatPrice, cn } from '../lib/utils';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    properties: number;
    images_per_property: number;
  };
}

export default function Pricing() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const planRef = React.useRef<SubscriptionPlan | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .order('price', { ascending: true });
        
        if (error) throw error;
        setPlans(data || []);
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };

    fetchPlans();
    checkUser();
  }, []);

  const config = {
    reference: (new Date()).getTime().toString(),
    email: user?.email || '',
    amount: (selectedPlan?.price || 0) * 100, // Paystack uses kobo (Nigeria) or cents
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
  };

  const initializePayment = usePaystackPayment(config);

  const onSuccess = async (reference: any) => {
    setIsProcessing(true);
    console.log('Payment successful, verifying with backend...', {
      reference: reference.reference,
      planId: planRef.current?.id,
      userId: user?.id,
    });
    try {
      const response = await axios.post('/api/verify-payment', {
        reference: reference.reference,
        planId: planRef.current?.id,
        userId: user?.id,
      });
      console.log('Backend verification response:', response.data);

      if (response.data.success) {
        alert('Payment successful! Your subscription has been updated.');
        navigate('/dashboard');
      } else {
        alert('Payment verification failed. Please contact support.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      alert('An error occurred during verification. Please contact support.');
    } finally {
      setIsProcessing(false);
    }
  };

  const onClose = () => {
    console.log('Payment closed');
    setIsProcessing(false);
  };

  const handleSubscribe = (plan: SubscriptionPlan) => {
    if (!user) {
      navigate('/login?redirect=/pricing');
      return;
    }
    
    if (plan.price === 0) {
      // Handle free plan signup directly
      updateFreePlan(plan);
      return;
    }

    planRef.current = plan;
    setSelectedPlan(plan);
  };

  // Trigger payment when selectedPlan is set and it's not free
  useEffect(() => {
    if (selectedPlan && selectedPlan.price > 0) {
      initializePayment({ onSuccess, onClose });
      setSelectedPlan(null); // Reset for next time
    }
  }, [selectedPlan]);

  const updateFreePlan = async (plan: SubscriptionPlan) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_plan: plan.name,
          status: 'approved'
        })
        .eq('id', user.id);

      if (error) throw error;
      alert('Subscription updated to ' + plan.name);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error updating free plan:', error);
      alert('Failed to update subscription.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="pt-32 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose the perfect plan for your real estate business. Scale as you grow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, idx) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={cn(
                "bg-white rounded-3xl border p-8 shadow-sm flex flex-col relative overflow-hidden",
                plan.name.toLowerCase() === 'pro' ? "border-blue-600 ring-4 ring-blue-50" : "border-gray-100"
              )}
            >
              {plan.name.toLowerCase() === 'pro' && (
                <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1 rounded-bl-xl text-xs font-bold uppercase">
                  Most Popular
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-gray-900">{formatPrice(plan.price)}</span>
                  <span className="text-gray-500 text-sm">/{plan.interval}</span>
                </div>
              </div>

              <div className="space-y-4 mb-8 flex-1">
                <div className="text-sm font-bold text-gray-900 uppercase tracking-wider">Plan Limits</div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-gray-600">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>{plan.limits.properties === -1 ? 'Unlimited' : plan.limits.properties} Property Listings</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-600">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>{plan.limits.images_per_property === -1 ? 'Unlimited' : plan.limits.images_per_property} Images per Listing</span>
                  </li>
                </ul>

                <div className="text-sm font-bold text-gray-900 uppercase tracking-wider mt-6">Features</div>
                <ul className="space-y-3">
                  {plan.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-center gap-3 text-gray-600">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handleSubscribe(plan)}
                disabled={isProcessing}
                className={cn(
                  "w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2",
                  plan.name.toLowerCase() === 'pro' 
                    ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200" 
                    : "bg-gray-900 text-white hover:bg-gray-800"
                )}
              >
                {isProcessing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="h-5 w-5" />
                    {plan.price === 0 ? 'Get Started' : 'Subscribe Now'}
                  </>
                )}
              </button>
            </motion.div>
          ))}
        </div>

        <div className="mt-20 bg-blue-600 rounded-[3rem] p-12 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">Need a Custom Solution?</h2>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
            For large agencies and enterprise needs, we offer custom plans with unlimited listings and dedicated support.
          </p>
          <button className="px-8 py-4 bg-white text-blue-600 rounded-2xl font-bold hover:bg-blue-50 transition-all">
            Contact Sales
          </button>
        </div>
      </div>
    </div>
  );
}
