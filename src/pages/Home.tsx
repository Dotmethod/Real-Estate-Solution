import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, ArrowRight, Shield, Users, Building2, Loader2, X } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import PropertyCard from '../components/PropertyCard';
import PricingCard from '../components/PricingCard';
import { supabase } from '../lib/supabase';
import { SubscriptionPlan } from '../types';
import { NIGERIA_STATES_LGA } from '../constants/nigeriaData';

export default function Home() {
  const [properties, setProperties] = useState<any[]>([]);
  const [featuredProperties, setFeaturedProperties] = useState<any[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(true);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [searchType, setSearchType] = useState('');
  const [searchListingStatus, setSearchListingStatus] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProperties();
    fetchFeaturedProperties();
    fetchPlans();
  }, []);

  const fetchFeaturedProperties = async () => {
    try {
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .eq('status', 'approved')
        .eq('is_featured', true)
        .limit(6)
        .order('created_at', { ascending: false });
      
      if (propertiesError) throw propertiesError;

      if (propertiesData && propertiesData.length > 0) {
        const agentIds = [...new Set(propertiesData.map(p => p.agent_id))].filter(Boolean);
        if (agentIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', agentIds);
          
          if (profilesError) throw profilesError;

          const propertiesWithProfiles = propertiesData.map(property => ({
            ...property,
            profiles: profilesData.find(profile => profile.id === property.agent_id)
          }));

          setFeaturedProperties(propertiesWithProfiles);
        } else {
          setFeaturedProperties(propertiesData);
        }
      } else {
        setFeaturedProperties([]);
      }
    } catch (error) {
      console.error('Error fetching featured properties:', error);
      setFeaturedProperties([]);
    } finally {
      setIsLoadingFeatured(false);
    }
  };

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
      setIsLoadingPlans(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.append('q', searchQuery);
    if (searchLocation) params.append('location', searchLocation);
    if (searchType) params.append('type', searchType);
    if (searchListingStatus) params.append('listingStatus', searchListingStatus);
    navigate(`/properties?${params.toString()}`);
  };

  const fetchProperties = async () => {
    try {
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .eq('status', 'approved')
        .limit(10)
        .order('created_at', { ascending: false });
      
      if (propertiesError) throw propertiesError;

      if (propertiesData && propertiesData.length > 0) {
        const agentIds = [...new Set(propertiesData.map(p => p.agent_id))].filter(Boolean);
        if (agentIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', agentIds);
          
          if (profilesError) throw profilesError;

          const propertiesWithProfiles = propertiesData.map(property => ({
            ...property,
            profiles: profilesData.find(profile => profile.id === property.agent_id)
          }));

          setProperties(propertiesWithProfiles);
        } else {
          setProperties(propertiesData);
        }
      } else {
        setProperties([]);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
      setProperties([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pt-16">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] md:h-[90vh] flex items-center overflow-hidden bg-gray-900">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=1920" 
            alt="Beautiful House Interior" 
            className="w-full h-full object-cover opacity-60"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900/80 via-gray-900/40 to-transparent"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-20 md:py-0">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl"
          >
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white leading-tight mb-6">
              Find Your <span className="text-blue-400 italic">Dream</span> Home in Nigeria.
            </h1>
            <p className="text-lg md:text-xl text-gray-200 mb-8 leading-relaxed">
              The most trusted platform for agents and property owners to list, manage, and sell properties across the nation.
            </p>
            
            {/* Mobile Search Trigger */}
            <div className="md:hidden">
              <button 
                onClick={() => setShowMobileSearch(true)}
                className="w-full bg-white px-6 py-5 rounded-3xl shadow-2xl flex items-center gap-4 text-gray-500 font-bold active:scale-95 transition-all text-left"
              >
                <Search className="h-6 w-6 text-blue-600" />
                <span className="flex-1">Search properties...</span>
                <ArrowRight className="h-5 w-5 text-gray-300" />
              </button>
            </div>

            {/* Mobile Search Dropdown/Modal */}
            <div className={cn(
              "md:hidden",
              showMobileSearch ? "fixed inset-0 z-50 p-4 bg-gray-900/60 backdrop-blur-md flex items-start justify-center pt-10 pb-10 overflow-y-auto" : "hidden"
            )}>
              <div className="w-full max-w-sm bg-white p-6 rounded-[2rem] shadow-2xl relative mx-auto my-auto">
                <button 
                  onClick={() => setShowMobileSearch(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-6 w-6 text-red-600" />
                </button>

                <div className="mb-6">
                  <h2 className="text-2xl font-black text-gray-900 mb-1 leading-tight">Find your <span className="text-blue-600 italic">perfect</span> home</h2>
                  <p className="text-gray-500 font-bold text-sm">Search thousands of verified listings.</p>
                </div>

                <form onSubmit={handleSearch} className="space-y-3">
                  <div className="bg-gray-50 p-3.5 rounded-xl flex items-center gap-3 border border-gray-100">
                    <Search className="text-blue-600 h-5 w-5 shrink-0" />
                    <input 
                      type="text" 
                      placeholder="Title, description..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-transparent focus:outline-none text-gray-900 font-bold text-sm"
                    />
                  </div>
                  <div className="bg-gray-50 p-3.5 rounded-xl flex items-center gap-3 border border-gray-100">
                    <MapPin className="text-blue-600 h-5 w-5 shrink-0" />
                    <select 
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                      className="w-full bg-transparent focus:outline-none text-gray-900 font-bold appearance-none cursor-pointer text-sm"
                    >
                      <option value="">All Locations</option>
                      {Object.keys(NIGERIA_STATES_LGA).sort().map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                  <div className="bg-gray-50 p-3.5 rounded-xl flex items-center gap-3 border border-gray-100">
                    <Building2 className="text-blue-600 h-5 w-5 shrink-0" />
                    <select 
                      value={searchType}
                      onChange={(e) => setSearchType(e.target.value)}
                      className="w-full bg-transparent focus:outline-none text-gray-900 font-bold appearance-none cursor-pointer text-sm"
                    >
                      <option value="">All Types</option>
                      <option value="house">House</option>
                      <option value="apartment">Apartment</option>
                      <option value="land">Land</option>
                      <option value="office">Office</option>
                    </select>
                  </div>
                  <div className="bg-gray-50 p-3.5 rounded-xl flex items-center gap-3 border border-gray-100">
                    <Building2 className="text-blue-600 h-5 w-5 shrink-0" />
                    <select 
                      value={searchListingStatus}
                      onChange={(e) => setSearchListingStatus(e.target.value)}
                      className="w-full bg-transparent focus:outline-none text-gray-900 font-bold appearance-none cursor-pointer text-sm"
                    >
                      <option value="">All Status</option>
                      <option value="sale">For Sale</option>
                      <option value="rent">For Rent</option>
                      <option value="lease">For Lease</option>
                      <option value="short-let">Short Let</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 mt-2 active:scale-[0.98]">
                    Search Properties
                  </button>
                </form>
              </div>
            </div>
            
            <form onSubmit={handleSearch} className="hidden md:flex bg-white p-2 rounded-2xl md:rounded-3xl shadow-2xl flex-col md:flex-row gap-2">
              <div className="flex-1 flex items-center px-4 gap-3 border-b md:border-b-0 md:border-r border-gray-100">
                <Search className="text-gray-400 h-5 w-5 shrink-0" />
                <input 
                  type="text" 
                  placeholder="Search title..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full py-4 focus:outline-none text-gray-900 text-sm md:text-base font-bold"
                />
              </div>
              <div className="flex-1 flex items-center px-4 gap-3 border-b md:border-b-0 md:border-r border-gray-100">
                <MapPin className="text-gray-400 h-5 w-5 shrink-0" />
                <select 
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  className="w-full py-4 focus:outline-none text-gray-900 bg-transparent text-sm md:text-base font-bold"
                >
                  <option value="">Location</option>
                  {Object.keys(NIGERIA_STATES_LGA).sort().map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 flex items-center px-4 gap-3 border-b md:border-b-0 md:border-r border-gray-100">
                <Building2 className="text-gray-400 h-5 w-5 shrink-0" />
                <select 
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="w-full py-4 focus:outline-none text-gray-900 bg-transparent text-sm md:text-base font-bold"
                >
                  <option value="">Type</option>
                  <option value="house">House</option>
                  <option value="apartment">Apartment</option>
                  <option value="land">Land</option>
                  <option value="office">Office</option>
                </select>
              </div>
              <div className="flex-1 flex items-center px-4 gap-3">
                <Building2 className="text-gray-400 h-5 w-5 shrink-0" />
                <select 
                  value={searchListingStatus}
                  onChange={(e) => setSearchListingStatus(e.target.value)}
                  className="w-full py-4 focus:outline-none text-gray-900 bg-transparent text-sm md:text-base font-bold"
                >
                  <option value="">Status</option>
                  <option value="sale">Sale</option>
                  <option value="rent">Rent</option>
                  <option value="lease">Lease</option>
                  <option value="short-let">Short Let</option>
                </select>
              </div>
              <button type="submit" className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 mt-2 md:mt-0 shadow-lg shadow-blue-200 active:scale-95">
                Search <ArrowRight className="h-5 w-5" />
              </button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Featured Properties Section */}
      <section className="py-12 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-12 gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-2 md:mb-4">Featured <span className="text-blue-600 italic">Listings</span></h2>
              <p className="text-gray-600">Hand-picked premium properties for you.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
            {isLoadingFeatured ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="h-[400px] bg-gray-100 rounded-3xl animate-pulse"></div>
              ))
            ) : featuredProperties.length > 0 ? (
              featuredProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-gray-500 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                <p>No featured properties at the moment.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 max-w-4xl mx-auto">
            {[
              { icon: Shield, title: "Trusted Platform", desc: "Verified agents and secure transactions for peace of mind." },
              { icon: Users, title: "Direct Connection", desc: "Connect directly with property owners and certified agents." }
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.2 }}
                className="flex flex-col items-center text-center"
              >
                <div className="h-16 w-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                  <item.icon className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Property Gallery */}
      <section className="py-12 md:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-12 gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-2 md:mb-4">Property Gallery</h2>
              <p className="text-gray-600">Explore our most recent property submissions.</p>
            </div>
            <Link to="/properties" className="text-blue-600 font-bold flex items-center gap-2 hover:gap-3 transition-all">
              View All <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
            {isLoading ? (
              [1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-[400px] bg-gray-200 rounded-3xl animate-pulse"></div>
              ))
            ) : (
              properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-12 md:py-20 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-gray-600">Choose the plan that fits your business needs. Scale as you grow.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {isLoadingPlans ? (
              <div className="col-span-full flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : plans.length > 0 ? (
              plans.map((plan, idx) => (
                <PricingCard key={plan.id} plan={plan} isPopular={idx === 1} />
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-gray-500">
                No subscription plans available.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-blue-600 rounded-[2rem] md:rounded-[3rem] p-10 md:p-20 text-center text-white relative overflow-hidden">
            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-black mb-4 md:mb-6">Ready to list your property?</h2>
              <p className="text-lg md:text-xl text-blue-100 mb-8 md:mb-10">Join thousands of successful agents and owners on Nigeria's leading real estate platform.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/signup" className="bg-white text-blue-600 px-10 py-4 rounded-xl font-bold hover:bg-blue-50 transition-all w-full sm:w-auto">
                  Get Started Now
                </Link>
                <Link to="/pricing" className="bg-blue-700 text-white px-10 py-4 rounded-xl font-bold hover:bg-blue-800 transition-all w-full sm:w-auto">
                  View Pricing
                </Link>
              </div>
            </div>
            {/* Abstract shapes */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full -mr-32 -mt-32 opacity-20"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 rounded-full -ml-32 -mb-32 opacity-20"></div>
          </div>
        </div>
      </section>
    </div>
  );
}
