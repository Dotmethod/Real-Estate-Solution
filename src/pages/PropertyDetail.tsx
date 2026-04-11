import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Bed, Bath, Square, MapPin, Phone, User, ShieldCheck, ArrowLeft, Calendar, Share2, Heart, MessageSquare, Mail } from 'lucide-react';
import { formatPrice, cn } from '../lib/utils';
import { motion } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet marker icon issue
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchProperty = async () => {
      setIsLoading(true);
      try {
        console.log('Fetching property with ID:', id);
        // Using explicit join syntax to ensure we get the agent profile correctly
        const { data, error } = await supabase
          .from('properties')
          .select('*, agent:agent_id(*)')
          .eq('id', id)
          .single();

        if (error) {
          console.error('Supabase error fetching property:', error);
          throw error;
        }
        
        console.log('Property data fetched:', data);
        if (data && !data.agent) {
          console.warn('Property found but no associated agent profile found for agent_id:', data.agent_id);
        }
        
        setProperty(data);
      } catch (error) {
        console.error('Error fetching property:', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchProperty();
  }, [id]);

  if (isLoading) {
    return (
      <div className="pt-32 pb-20 px-4 max-w-7xl mx-auto min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="pt-32 pb-20 px-4 max-w-7xl mx-auto min-h-screen text-center">
        <h2 className="text-2xl font-black text-gray-900 mb-4">Property not found</h2>
        <Link to="/properties" className="text-blue-600 font-bold hover:underline">Back to listings</Link>
      </div>
    );
  }

  // Extract agent details from the explicit join
  const agent = Array.isArray(property.agent) ? property.agent[0] : property.agent;

  return (
    <div className="pt-24 pb-20 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <Link to="/properties" className="inline-flex items-center gap-2 text-gray-500 hover:text-blue-600 font-bold transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Listings
          </Link>
          <div className="flex items-center gap-3">
            <button className="p-3 bg-white rounded-2xl border border-gray-100 shadow-sm hover:bg-gray-50 transition-colors">
              <Share2 className="h-5 w-5 text-gray-600" />
            </button>
            <button className="p-3 bg-white rounded-2xl border border-gray-100 shadow-sm hover:bg-gray-50 transition-colors">
              <Heart className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            {/* Image Gallery Placeholder */}
            <div className="relative rounded-[3rem] overflow-hidden shadow-2xl aspect-video bg-gray-200">
              <img
                src={property.images?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=1200'}
                alt={property.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-8 left-8">
                <span className={cn(
                  "px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-xl",
                  property.type === 'sale' ? "bg-blue-600 text-white" : "bg-green-600 text-white"
                )}>
                  For {property.type}
                </span>
              </div>
            </div>

            {/* Title & Price */}
            <div className="bg-white rounded-[3rem] p-8 md:p-12 border border-gray-100 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                  <h1 className="text-3xl md:text-5xl font-black text-gray-900 mb-4 leading-tight">
                    {property.title}
                  </h1>
                  <div className="flex items-center gap-2 text-gray-500 font-medium">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    {property.location}
                  </div>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-1">Price</p>
                  <p className="text-4xl md:text-5xl font-black text-blue-600">{formatPrice(property.price)}</p>
                </div>
              </div>

              {/* Key Features */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-10 border-y border-gray-50">
                <div className="flex flex-col gap-2">
                  <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                    <Bed className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Bedrooms</p>
                    <p className="text-xl font-black text-gray-900">{property.beds || property.bedrooms}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                    <Bath className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Bathrooms</p>
                    <p className="text-xl font-black text-gray-900">{property.baths || property.bathrooms}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                    <Square className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Area</p>
                    <p className="text-xl font-black text-gray-900">{property.sqft || property.area}m²</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Listed On</p>
                    <p className="text-xl font-black text-gray-900">{new Date(property.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mt-10">
                <h3 className="text-2xl font-black text-gray-900 mb-6">Description</h3>
                <p className="text-gray-600 leading-relaxed text-lg whitespace-pre-wrap">
                  {property.description || "No description provided for this property."}
                </p>
              </div>

              {/* Amenities */}
              {property.amenities && property.amenities.length > 0 && (
                <div className="mt-12">
                  <h3 className="text-2xl font-black text-gray-900 mb-6">Amenities</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {property.amenities.map((amenity: string) => (
                      <div key={amenity} className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-50 shadow-sm">
                        <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                        <span className="text-sm font-bold text-gray-700">{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Sidebar - Agent Details */}
          <div className="space-y-8">
            <div className="sticky top-24">
              <div className="bg-white rounded-[3rem] p-8 border border-gray-100 shadow-xl overflow-hidden relative">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 blur-2xl opacity-50"></div>
                
                <h3 className="text-xl font-black text-gray-900 mb-8 relative">Listing Agent</h3>
                
                {agent ? (
                  <div className="space-y-8 relative">
                    <div className="flex items-center gap-5">
                      <div className="relative">
                        <div className="h-20 w-20 bg-blue-600 rounded-3xl p-1 shadow-lg">
                          {agent.avatar_url ? (
                            <img 
                              src={agent.avatar_url} 
                              alt={agent.full_name} 
                              className="h-full w-full object-cover rounded-2xl" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="h-full w-full bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-black text-2xl">
                              {(agent.full_name || 'A').charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-green-500 h-6 w-6 rounded-full border-4 border-white flex items-center justify-center">
                          <ShieldCheck className="h-3 w-3 text-white" />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-gray-900">{agent.full_name}</h4>
                        <p className="text-blue-600 text-xs font-black uppercase tracking-widest">Verified Partner</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Phone Number</p>
                        <a href={`tel:${agent.phone}`} className="text-lg font-black text-gray-900 hover:text-blue-600 transition-colors flex items-center gap-2">
                          <Phone className="h-5 w-5 text-blue-600" />
                          {agent.phone || 'Contact for phone'}
                        </a>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Email Address</p>
                        <a href={`mailto:${agent.email}`} className="text-lg font-black text-gray-900 hover:text-blue-600 transition-colors flex items-center gap-2 break-all">
                          <Mail className="h-5 w-5 text-blue-600 shrink-0" />
                          {agent.email || 'Contact for email'}
                        </a>
                      </div>
                      
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Office Address</p>
                        <div className="flex items-start gap-2 text-gray-700 font-bold">
                          <MapPin className="h-5 w-5 text-blue-600 shrink-0" />
                          <span className="text-sm">{agent.address || 'Address provided on request'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 space-y-3">
                      <button className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-3">
                        <MessageSquare className="h-5 w-5" />
                        Send Message
                      </button>
                      <button className="w-full py-5 bg-white text-blue-600 border-2 border-blue-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center justify-center gap-3">
                        <Calendar className="h-5 w-5" />
                        Schedule Tour
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-bold">Agent information unavailable</p>
                  </div>
                )}
              </div>

              {/* Safety Tip */}
              <div className="mt-8 p-6 bg-orange-50 rounded-[2rem] border border-orange-100">
                <h4 className="text-orange-900 font-black text-sm mb-2 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Safety Tip
                </h4>
                <p className="text-orange-800 text-xs font-medium leading-relaxed">
                  Never pay upfront for property inspections. Always meet the agent in person and verify documents before making any payments.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
