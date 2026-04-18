import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Bed, Bath, Square, MapPin, Phone, User, ShieldCheck, ArrowLeft, Calendar, Share2, Heart, MessageSquare, Mail, Map as MapIcon, ExternalLink } from 'lucide-react';
import { formatPrice, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';

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
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const [coordinates, setCoordinates] = React.useState<[number, number] | null>(null);
  const [isGeocoding, setIsGeocoding] = React.useState(false);

  React.useEffect(() => {
    const geocodeAddress = async () => {
      if (!property?.location) return;
      setIsGeocoding(true);
      try {
        // Try 1: Full address
        let response = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(property.location)}&limit=1`);
        
        if (response.data && response.data.length > 0) {
          const lat = parseFloat(response.data[0].lat);
          const lon = parseFloat(response.data[0].lon);
          if (!isNaN(lat) && !isNaN(lon)) {
            setCoordinates([lat, lon]);
            return;
          }
        }

        // Try 2: Fallback to LGA and State (assuming format is "Area, LGA, State")
        const parts = property.location.split(',').map((p: string) => p.trim());
        if (parts.length >= 2) {
          const lgaState = parts.slice(-2).join(', ');
          response = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(lgaState)}&limit=1`);
          if (response.data && response.data.length > 0) {
            const lat = parseFloat(response.data[0].lat);
            const lon = parseFloat(response.data[0].lon);
            if (!isNaN(lat) && !isNaN(lon)) {
              setCoordinates([lat, lon]);
              return;
            }
          }
        }

        // Try 3: Fallback to just State
        if (parts.length >= 1) {
          const state = parts[parts.length - 1];
          response = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(state)}&limit=1`);
          if (response.data && response.data.length > 0) {
            const lat = parseFloat(response.data[0].lat);
            const lon = parseFloat(response.data[0].lon);
            if (!isNaN(lat) && !isNaN(lon)) {
              setCoordinates([lat, lon]);
              return;
            }
          }
        }
      } catch (error) {
        console.error('Geocoding error:', error);
      } finally {
        setIsGeocoding(false);
      }
    };

    if (property) {
      geocodeAddress();
    }
  }, [property?.location]);

  React.useEffect(() => {
    const fetchProperty = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        console.log('Fetching property with ID:', id);
        
        // Fetch property first
        const { data: propertyData, error: propertyError } = await supabase
          .from('properties')
          .select('*')
          .eq('id', id)
          .single();

        if (propertyError) {
          console.error('Supabase error fetching property:', propertyError);
          throw propertyError;
        }
        
        if (propertyData) {
          // Fetch agent separately for robustness
          const { data: agentData, error: agentError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', propertyData.agent_id)
            .single();
          
          if (agentError) {
            console.warn('Error fetching agent profile:', agentError);
          }
          
          setProperty({ ...propertyData, agent: agentData });
        }
      } catch (error) {
        console.error('Error in fetchProperty:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProperty();
  }, [id]);

  const [showShareToast, setShowShareToast] = React.useState(false);

  const handleShare = async () => {
    const shareData = {
      title: property.title,
      text: property.description?.substring(0, 100) + '...',
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 3000);
      }
    } catch (err) {
      console.error('Error sharing:', err);
      // Fallback to clipboard if share was cancelled or failed
      try {
        await navigator.clipboard.writeText(window.location.href);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 3000);
      } catch (copyErr) {
        console.error('Clipboard error:', copyErr);
      }
    }
  };

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

  // Extract agent details
  const agent = property?.agent || null;

  const price = typeof property.price === 'number' ? property.price : parseFloat(property.price) || 0;
  const agencyFee = property.agency_fee ? (typeof property.agency_fee === 'number' ? property.agency_fee : parseFloat(property.agency_fee) || 0) : null;
  const inspectionFee = property.inspection_fee ? (typeof property.inspection_fee === 'number' ? property.inspection_fee : parseFloat(property.inspection_fee) || 0) : null;

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
            <button 
              onClick={handleShare}
              className="p-3 bg-white rounded-2xl border border-gray-100 shadow-sm hover:bg-gray-50 transition-colors group relative"
              title="Share Property"
            >
              <Share2 className="h-5 w-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
              <AnimatePresence>
                {showShareToast && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, x: '-50%' }}
                    animate={{ opacity: 1, y: 0, x: '-50%' }}
                    exit={{ opacity: 0, y: 10, x: '-50%' }}
                    className="absolute bottom-full mb-3 left-1/2 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg whitespace-nowrap shadow-xl z-50 pointer-events-none"
                  >
                    Link Copied!
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
            <button className="p-3 bg-white rounded-2xl border border-gray-100 shadow-sm hover:bg-gray-50 transition-colors">
              <Heart className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8 md:space-y-12">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="relative rounded-2xl md:rounded-[3rem] overflow-hidden shadow-2xl aspect-video bg-gray-200">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentImageIndex}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    src={property.images?.[currentImageIndex] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=1200'}
                    alt={property.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700 cursor-zoom-in"
                    referrerPolicy="no-referrer"
                  />
                </AnimatePresence>
                <div className="absolute top-4 left-4 md:top-8 md:left-8 flex flex-wrap gap-2 md:gap-3 pointer-events-none">
                  <span className={cn(
                    "px-4 md:px-6 py-1.5 md:py-2 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest shadow-xl bg-blue-600 text-white"
                  )}>
                    {property.type || 'Property'}
                  </span>
                  {property.listing_status && (
                    <span className={cn(
                      "px-4 md:px-6 py-1.5 md:py-2 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest shadow-xl",
                      property.listing_status === 'sale' ? "bg-green-600 text-white" :
                      property.listing_status === 'rent' ? "bg-orange-500 text-white" :
                      property.listing_status === 'lease' ? "bg-purple-600 text-white" :
                      "bg-gray-900 text-white"
                    )}>
                      For {property.listing_status}
                    </span>
                  )}
                </div>
              </div>

              {/* Thumbnails */}
              {property.images && property.images.length > 1 && (
                <div className="flex flex-wrap gap-3 md:gap-4">
                  {property.images.map((img: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={cn(
                        "w-20 h-20 md:w-32 md:h-32 rounded-xl md:rounded-3xl overflow-hidden border-4 transition-all duration-300 shadow-md",
                        currentImageIndex === idx ? "border-blue-600 scale-105" : "border-white hover:border-blue-200"
                      )}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Title & Price */}
            <div className="bg-white rounded-2xl md:rounded-[3rem] p-6 md:p-12 border border-gray-100 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                  <h1 className="text-2xl md:text-5xl font-black text-gray-900 mb-4 leading-tight">
                    {property.title}
                  </h1>
                  <div className="flex items-center gap-2 text-gray-500 font-medium text-sm md:text-base">
                    <MapPin className="h-5 w-5 text-blue-600 shrink-0" />
                    {property.location}
                  </div>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-gray-400 text-[10px] md:text-sm font-bold uppercase tracking-widest mb-1">Price</p>
                  <p className="text-3xl md:text-5xl font-black text-blue-600">{formatPrice(price)}</p>
                  {(agencyFee || inspectionFee) && (
                    <div className="mt-3 flex flex-col gap-1">
                      {agencyFee && (
                        <p className="text-xs md:text-sm font-bold text-gray-600">
                          Agency Fee: <span className="text-blue-600">{formatPrice(agencyFee)}</span>
                        </p>
                      )}
                      {inspectionFee && (
                        <p className="text-xs md:text-sm font-bold text-gray-600">
                          Inspection Fee: <span className="text-blue-600">{formatPrice(inspectionFee)}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Key Features */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6 py-8 md:py-10 border-y border-gray-50">
                <div className="flex flex-col gap-2">
                  <div className="h-10 w-10 md:h-12 md:w-12 bg-blue-50 rounded-xl md:rounded-2xl flex items-center justify-center">
                    <Bed className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest">Bedrooms</p>
                    <p className="text-lg md:text-xl font-black text-gray-900">{property.beds || property.bedrooms}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="h-10 w-10 md:h-12 md:w-12 bg-blue-50 rounded-xl md:rounded-2xl flex items-center justify-center">
                    <Bath className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest">Bathrooms</p>
                    <p className="text-lg md:text-xl font-black text-gray-900">{property.baths || property.bathrooms}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="h-10 w-10 md:h-12 md:w-12 bg-blue-50 rounded-xl md:rounded-2xl flex items-center justify-center">
                    <Square className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest">Area</p>
                    <p className="text-lg md:text-xl font-black text-gray-900">{property.sqft || property.area}m²</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="h-10 w-10 md:h-12 md:w-12 bg-blue-50 rounded-xl md:rounded-2xl flex items-center justify-center">
                    <Calendar className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest">Listed On</p>
                    <p className="text-lg md:text-xl font-black text-gray-900">{new Date(property.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mt-8 md:mt-10">
                <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-4 md:mb-6">Description</h3>
                <p className="text-gray-600 leading-relaxed text-base md:text-lg whitespace-pre-wrap">
                  {property.description || "No description provided for this property."}
                </p>
              </div>

              {/* Amenities */}
              {property.amenities && property.amenities.length > 0 && (
                <div className="mt-10 md:mt-12">
                  <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-4 md:mb-6">Amenities</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    {property.amenities.map((amenity: string) => (
                      <div key={amenity} className="flex items-center gap-3 p-3 md:p-4 bg-white rounded-xl md:rounded-2xl border border-gray-50 shadow-sm">
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
          <div className="space-y-6 md:space-y-8">
            {/* Map View */}
            <div className="bg-white rounded-2xl md:rounded-[3rem] p-6 md:p-8 border border-gray-100 shadow-xl overflow-hidden relative">
              <div className="flex items-center gap-2 mb-6">
                <div className="h-8 w-8 bg-blue-50 rounded-lg flex items-center justify-center">
                  <MapIcon className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="text-lg md:text-xl font-black text-gray-900">Property Location</h3>
              </div>
              
              <div className="h-[400px] rounded-2xl md:rounded-[2rem] overflow-hidden border border-gray-100 relative z-0">
                {coordinates ? (
                  <MapContainer 
                    key={`${coordinates[0]}-${coordinates[1]}`}
                    center={coordinates} 
                    zoom={16} 
                    scrollWheelZoom={false}
                    className="h-full w-full"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={coordinates}>
                      <Popup minWidth={200}>
                        <div className="p-1">
                          <img 
                            src={property.images?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=400'} 
                            alt={property.title}
                            className="w-full h-24 object-cover rounded-lg mb-2"
                            referrerPolicy="no-referrer"
                          />
                          <div className="font-black text-gray-900 text-sm mb-1">{property.title}</div>
                          <div className="text-blue-600 font-bold text-xs mb-2">{formatPrice(price)}</div>
                          <div className="flex items-center gap-1 text-gray-500 text-[10px] mb-3">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{property.location}</span>
                          </div>
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.location)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Open in Google Maps
                          </a>
                        </div>
                      </Popup>
                    </Marker>
                  </MapContainer>
                ) : isGeocoding ? (
                  <div className="h-full w-full bg-gray-50 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Locating Property...</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full w-full bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
                    <div className="flex flex-col items-center gap-3 mb-6">
                      <MapPin className="h-8 w-8 text-gray-300" />
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Map location unavailable for this address</p>
                    </div>
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-4 bg-white border-2 border-blue-600 text-blue-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-50 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Try Google Maps
                    </a>
                  </div>
                )}
              </div>
              
              <div className="mt-4 flex items-start gap-2 text-gray-500">
                <MapPin className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <span className="text-xs font-medium">{property.location}</span>
              </div>
            </div>

            <div className="sticky top-24">
              <div className="bg-white rounded-2xl md:rounded-[3rem] p-6 md:p-8 border border-gray-100 shadow-xl overflow-hidden relative">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 blur-2xl opacity-50"></div>
                
                <h3 className="text-lg md:text-xl font-black text-gray-900 mb-6 md:mb-8 relative">
                  {agent?.role === 'owner' ? 'Property Owner' : 'Listing Agent'}
                </h3>
                
                {agent ? (
                  <div className="space-y-6 md:space-y-8 relative">
                    <div className="flex items-center gap-4 md:gap-5">
                      <div className="relative">
                        <div className="h-16 w-16 md:h-20 md:w-20 bg-blue-600 rounded-2xl md:rounded-3xl p-1 shadow-lg">
                          {agent.avatar_url ? (
                            <img 
                              src={agent.avatar_url} 
                              alt={agent.full_name} 
                              className="h-full w-full object-cover rounded-xl md:rounded-2xl" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="h-full w-full bg-blue-50 rounded-xl md:rounded-2xl flex items-center justify-center text-blue-600 font-black text-xl md:text-2xl">
                              {(agent.full_name || 'A').charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 bg-green-500 h-5 w-5 md:h-6 md:w-6 rounded-full border-2 md:border-4 border-white flex items-center justify-center">
                          <ShieldCheck className="h-2.5 w-2.5 md:h-3 md:w-3 text-white" />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-lg md:text-xl font-black text-gray-900">{agent.full_name}</h4>
                        <p className="text-blue-600 text-[10px] md:text-xs font-black uppercase tracking-widest">Verified Partner</p>
                      </div>
                    </div>

                    <div className="space-y-3 md:space-y-4">
                      <div className="p-3 md:p-4 bg-gray-50 rounded-xl md:rounded-2xl border border-gray-100">
                        <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Phone Number</p>
                        <a href={`tel:${agent.phone}`} className="text-base md:text-lg font-black text-gray-900 hover:text-blue-600 transition-colors flex items-center gap-2">
                          <Phone className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                          {agent.phone || 'Contact for phone'}
                        </a>
                      </div>

                      <div className="p-3 md:p-4 bg-gray-50 rounded-xl md:rounded-2xl border border-gray-100">
                        <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Office Address</p>
                        <div className="flex items-start gap-2 text-gray-700 font-bold">
                          <MapPin className="h-4 w-4 md:h-5 md:w-5 text-blue-600 shrink-0" />
                          <span className="text-xs md:text-sm">{agent.address || 'Address provided on request'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 md:pt-4 space-y-3">
                      <button className="w-full py-4 md:py-5 bg-blue-600 text-white rounded-xl md:rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-3">
                        <MessageSquare className="h-4 w-4 md:h-5 md:w-5" />
                        Send Message
                      </button>
                      <button className="w-full py-4 md:py-5 bg-white text-blue-600 border-2 border-blue-600 rounded-xl md:rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center justify-center gap-3">
                        <Calendar className="h-4 w-4 md:h-5 md:w-5" />
                        Schedule Tour
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 md:py-8">
                    <User className="h-10 w-10 md:h-12 md:w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-bold text-sm">Agent information unavailable</p>
                  </div>
                )}
              </div>

              {/* Safety Tip */}
              <div className="mt-6 md:mt-8 p-5 md:p-6 bg-orange-50 rounded-2xl md:rounded-[2rem] border border-orange-100">
                <h4 className="text-orange-900 font-black text-xs md:text-sm mb-2 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Safety Tip
                </h4>
                <p className="text-orange-800 text-[10px] md:text-xs font-medium leading-relaxed">
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
