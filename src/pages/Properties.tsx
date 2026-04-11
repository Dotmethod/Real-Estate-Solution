import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import PropertyCard from '../components/PropertyCard';
import { Search, MapPin, Building2, DollarSign, X } from 'lucide-react';
import { cn } from '../lib/utils';

const Properties = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [type, setType] = useState(searchParams.get('type') || '');
  const [listingStatus, setListingStatus] = useState(searchParams.get('listingStatus') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');

  useEffect(() => {
    fetchProperties();
  }, [searchParams]);

  const fetchProperties = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('properties')
        .select('*')
        .eq('status', 'approved');

      // Apply filters
      const qParam = searchParams.get('q');
      const locationParam = searchParams.get('location');
      const typeParam = searchParams.get('type');
      const listingStatusParam = searchParams.get('listingStatus');
      const maxPriceParam = searchParams.get('maxPrice');

      if (qParam) {
        query = query.or(`title.ilike.%${qParam}%,description.ilike.%${qParam}%`);
      }
      if (locationParam) {
        query = query.ilike('location', `%${locationParam}%`);
      }
      if (typeParam) {
        query = query.eq('type', typeParam);
      }
      if (listingStatusParam) {
        query = query.eq('listing_status', listingStatusParam);
      }
      if (maxPriceParam) {
        query = query.lte('price', parseInt(maxPriceParam));
      }

      const { data: propertiesData, error: propertiesError } = await query.order('created_at', { ascending: false });
      
      if (propertiesError) throw propertiesError;

      if (propertiesData && propertiesData.length > 0) {
        const agentIds = [...new Set(propertiesData.map(p => p.agent_id))];
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
        setProperties([]);
      }
    } catch (error: any) {
      console.error('Error fetching properties:', error);
      setError(error.message || 'An unknown error occurred');
      setProperties([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    const params: any = {};
    if (q) params.q = q;
    if (location) params.location = location;
    if (type) params.type = type;
    if (listingStatus) params.listingStatus = listingStatus;
    if (maxPrice) params.maxPrice = maxPrice;
    setSearchParams(params);
  };

  const clearFilters = () => {
    setQ('');
    setLocation('');
    setType('');
    setListingStatus('');
    setMaxPrice('');
    setSearchParams({});
  };

  return (
    <div className="pt-24 pb-20 px-4 max-w-7xl mx-auto min-h-screen bg-gray-50">
      <div className="mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900 mb-4">All Properties</h1>
            <p className="text-gray-600">Browse through our verified listings across Nigeria.</p>
          </div>
          {(q || location || type || listingStatus || maxPrice) && (
            <button 
              onClick={clearFilters}
              className="flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-700 transition-colors"
            >
              <X className="h-4 w-4" /> Clear All Filters
            </button>
          )}
        </div>

        {/* Search & Filter Bar */}
        <form onSubmit={handleFilter} className="bg-white p-4 rounded-3xl shadow-xl border border-gray-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input 
              type="text"
              placeholder="Search properties..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-blue-600 transition-all text-sm"
            />
          </div>

          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select 
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-blue-600 transition-all text-sm appearance-none"
            >
              <option value="">All Locations</option>
              <option value="Lagos">Lagos</option>
              <option value="Abuja">Abuja</option>
              <option value="Port Harcourt">Port Harcourt</option>
              <option value="Ibadan">Ibadan</option>
            </select>
          </div>

          <div className="relative">
            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select 
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-blue-600 transition-all text-sm appearance-none"
            >
              <option value="">All Types</option>
              <option value="apartment">Apartment</option>
              <option value="house">House</option>
              <option value="land">Land</option>
              <option value="commercial">Commercial</option>
            </select>
          </div>

          <div className="relative">
            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select 
              value={listingStatus}
              onChange={(e) => setListingStatus(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-blue-600 transition-all text-sm appearance-none"
            >
              <option value="">All Status</option>
              <option value="sale">For Sale</option>
              <option value="rent">For Rent</option>
              <option value="lease">For Lease</option>
              <option value="short-let">Short Let</option>
            </select>
          </div>

          <div className="relative">
            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input 
              type="number"
              placeholder="Max Price"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-blue-600 transition-all text-sm"
            />
          </div>

          <button 
            type="submit"
            className="bg-blue-600 text-white py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            Apply Filters
          </button>
        </form>
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
            Error: {error}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-[400px] bg-gray-200 rounded-3xl animate-pulse"></div>
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[3rem] border border-gray-100">
          <p className="text-gray-500 font-bold">No properties found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Properties;
