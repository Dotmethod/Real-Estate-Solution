import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import PropertyCard from '../components/PropertyCard';
import { Search, MapPin, Building2, DollarSign, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { NIGERIA_STATES_LGA } from '../constants/nigeriaData';

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
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

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
      const sortParam = searchParams.get('sort') || 'newest';

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

      // Apply sorting
      if (sortParam === 'newest') {
        query = query.order('created_at', { ascending: false });
      } else if (sortParam === 'price-asc') {
        query = query.order('price', { ascending: true });
      } else if (sortParam === 'price-desc') {
        query = query.order('price', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data: propertiesData, error: propertiesError } = await query;
      
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
    if (sort) params.sort = sort;
    setSearchParams(params);
    setShowMobileFilters(false);
  };

  const handleSortChange = (newSort: string) => {
    setSort(newSort);
    const params = Object.fromEntries(searchParams.entries());
    params.sort = newSort;
    setSearchParams(params);
  };

  const clearFilters = () => {
    setQ('');
    setLocation('');
    setType('');
    setListingStatus('');
    setMaxPrice('');
    setSort('newest');
    setSearchParams({});
    setShowMobileFilters(false);
  };

  const activeFiltersCount = [q, location, type, listingStatus, maxPrice].filter(Boolean).length;

  return (
    <div className="pt-20 md:pt-32 pb-20 px-4 max-w-7xl mx-auto min-h-screen bg-gray-50">
      <div className="mb-8 md:mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-gray-900 mb-2 md:mb-4 tracking-tight">All Properties</h1>
            <p className="text-gray-600 text-sm md:text-lg font-medium">Browse through our verified listings across Nigeria.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Mobile Filter Toggle */}
            <button 
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="lg:hidden flex items-center gap-2 px-6 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm font-bold text-gray-700 hover:bg-gray-50 transition-all active:scale-95"
            >
              <Search className="h-4 w-4 text-blue-600" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="bg-blue-600 text-white text-[10px] h-5 w-5 rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <div className="hidden md:flex items-center gap-3">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sort By:</span>
              <select 
                value={sort}
                onChange={(e) => handleSortChange(e.target.value)}
                className="bg-white border border-gray-100 rounded-2xl px-6 py-3 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all appearance-none cursor-pointer pr-12 relative bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236B7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[position:right_1rem_center] bg-no-repeat shadow-sm"
              >
                <option value="newest">Recently Listed</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>

            {activeFiltersCount > 0 && (
              <button 
                onClick={clearFilters}
                className="flex items-center gap-2 text-xs font-black text-red-600 hover:text-red-700 transition-colors uppercase tracking-widest px-4 py-2 hover:bg-red-50 rounded-xl"
              >
                <X className="h-4 w-4 text-red-600" /> Clear All
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className={cn(
          "lg:block",
          showMobileFilters ? "fixed inset-0 z-50 p-4 bg-gray-900/40 backdrop-blur-sm flex items-start justify-center pt-10 pb-10 overflow-y-auto" : "hidden"
        )}>
          <div className={cn(
            "w-full max-w-lg lg:max-w-none bg-white lg:bg-transparent p-5 lg:p-0 rounded-[2rem] lg:rounded-none shadow-2xl lg:shadow-none border border-gray-100 lg:border-none relative transition-all duration-300 mx-auto my-auto",
            showMobileFilters ? "scale-100 opacity-100" : "scale-95 opacity-0 lg:opacity-100 lg:scale-100"
          )}>
            {showMobileFilters && (
              <button 
                onClick={() => setShowMobileFilters(false)}
                className="absolute top-4 right-4 lg:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-6 w-6 text-red-600" />
              </button>
            )}

            <div className="lg:hidden mb-6">
              <h2 className="text-2xl font-black text-gray-900 mb-1">Search Filters</h2>
              <p className="text-gray-500 font-bold text-sm">Narrow down your property search.</p>
            </div>

            <form onSubmit={handleFilter} className="bg-white lg:p-4 rounded-2xl lg:rounded-3xl lg:shadow-xl lg:border lg:border-gray-100 grid grid-cols-1 lg:grid-cols-6 gap-3 md:gap-5">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Search properties..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all text-sm font-bold"
                />
              </div>

              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full pl-12 pr-10 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all text-sm font-bold appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236B7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[position:right_1rem_center] bg-no-repeat"
                >
                  <option value="">All Locations</option>
                  {Object.keys(NIGERIA_STATES_LGA).sort().map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select 
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full pl-12 pr-10 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all text-sm font-bold appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236B7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[position:right_1rem_center] bg-no-repeat"
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
                  className="w-full pl-12 pr-10 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all text-sm font-bold appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236B7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[position:right_1rem_center] bg-no-repeat"
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
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all text-sm font-bold"
                />
              </div>

              <button 
                type="submit"
                className="bg-blue-600 text-white py-3.5 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-95"
              >
                Show Results
              </button>
            </form>
          </div>
        </div>
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
            Error: {error}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-[350px] md:h-[400px] bg-gray-200 rounded-2xl md:rounded-3xl animate-pulse"></div>
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="text-center py-16 md:py-20 bg-white rounded-2xl md:rounded-[3rem] border border-gray-100">
          <p className="text-gray-500 font-bold">No properties found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Properties;
