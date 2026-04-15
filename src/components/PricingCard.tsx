import React from 'react';
import { Link } from 'react-router-dom';
import { SubscriptionPlan } from '../types';
import { Check } from 'lucide-react';
import { formatPrice } from '../lib/utils';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface PricingCardProps {
  plan: SubscriptionPlan;
  isPopular?: boolean;
  key?: React.Key;
}

export default function PricingCard({ plan, isPopular }: PricingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={cn(
        "relative p-8 rounded-3xl border transition-all duration-300",
        isPopular 
          ? "bg-gray-900 text-white border-gray-800 shadow-2xl scale-105 z-10" 
          : "bg-white text-gray-900 border-gray-100 hover:border-blue-200"
      )}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
          Most Popular
        </div>
      )}
      
      <div className="mb-8">
        <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold">
            {plan.price === 0 ? 'Free' : formatPrice(plan.price)}
          </span>
        </div>
        <p className={cn("text-sm mt-2", isPopular ? "text-gray-400" : "text-gray-500")}>
          {plan.limits?.properties === -1 ? 'Unlimited properties' : 
           plan.limits?.properties ? `Up to ${plan.limits.properties} properties` : 
           'Property listing plan'}
        </p>
      </div>
      
      <ul className="space-y-4 mb-8">
        {plan.features.map((feature, idx) => (
          <li key={idx} className="flex items-center gap-3 text-sm">
            <Check className={cn("h-5 w-5 flex-shrink-0", isPopular ? "text-blue-400" : "text-blue-600")} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      
      <Link 
        to={`/pricing?plan=${plan.id}`}
        className={cn(
          "w-full py-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center",
          isPopular
            ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-900/20"
            : "bg-gray-100 text-gray-900 hover:bg-gray-200"
        )}
      >
        Get Started
      </Link>
    </motion.div>
  );
}
