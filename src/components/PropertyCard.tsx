import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Property } from '../types';
import { Bed, Bath, Square, MapPin, Phone, User, ShieldCheck, Share2, Video } from 'lucide-react';
import { formatPrice, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface PropertyCardProps {
  property: any; // Using any to accommodate agent details
  key?: React.Key;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = property.images && property.images.length > 0 
    ? property.images 
    : ['https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800'];

  // Handle Supabase join which might return an array or a single object
  const agent = Array.isArray(property.profiles) ? property.profiles[0] : property.profiles;

  const handleThumbnailClick = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex(index);
  };

  const [showShareToast, setShowShareToast] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const url = `${window.location.origin}/properties/${property.id}`;
    const shareData = {
      title: property.title,
      text: property.description?.substring(0, 100) + '...',
      url: url,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 2000);
      }
    } catch (err) {
      console.error('Error sharing:', err);
      try {
        await navigator.clipboard.writeText(url);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 2000);
      } catch (copyErr) {
        console.error('Clipboard error:', copyErr);
      }
    }
  };

  return (
    <div className="block h-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="group bg-white rounded-3xl overflow-hidden border border-gray-200 hover:shadow-2xl transition-all duration-500 flex flex-col h-full shadow-sm"
      >
        <div className="relative h-64 overflow-hidden">
          <Link to={`/properties/${property.id}`} className="block h-full">
            <AnimatePresence mode="wait">
              <motion.img
                key={currentImageIndex}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                src={images[currentImageIndex]}
                alt={property.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
            </AnimatePresence>
          </Link>
          
          <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
            <span className={cn(
              "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg bg-blue-600 text-white"
            )}>
              {property.type || 'Property'}
            </span>
            {property.is_featured && (
              <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg bg-yellow-400 text-yellow-900 flex items-center gap-1">
                Featured
              </span>
            )}
            {property.video_url && (
              <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg bg-red-600 text-white flex items-center gap-1 animate-pulse">
                <Video className="h-3 w-3" />
                Video
              </span>
            )}
          </div>
            {property.listing_status && (
              <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                <span className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg",
                  property.listing_status === 'sale' ? "bg-green-600 text-white" :
                  property.listing_status === 'rent' ? "bg-orange-500 text-white" :
                  property.listing_status === 'lease' ? "bg-purple-600 text-white" :
                  "bg-gray-900 text-white"
                )}>
                  For {property.listing_status}
                </span>
                <button
                  onClick={handleShare}
                  className="p-2 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 hover:bg-white transition-all group relative"
                  title="Share Property"
                >
                  <Share2 className="h-4 w-4 text-gray-700 group-hover:text-blue-600 transition-colors" />
                  <AnimatePresence>
                    {showShareToast && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl z-50 pointer-events-none"
                      >
                        Copied!
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            )}

          {/* Thumbnails Overlay */}
          {images.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 px-4">
              {images.map((img: string, idx: number) => (
                <button
                  key={idx}
                  onClick={(e) => handleThumbnailClick(e, idx)}
                  className={cn(
                    "w-10 h-10 rounded-lg border-2 overflow-hidden transition-all duration-300 shadow-lg",
                    currentImageIndex === idx ? "border-blue-600 scale-110 z-10" : "border-white/50 hover:border-white opacity-70 hover:opacity-100"
                  )}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}
        </div>
        
        <Link to={`/properties/${property.id}`} className="p-5 flex-1 flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-black text-gray-900 line-clamp-1 leading-tight">{property.title}</h3>
            <p className="text-blue-600 font-black text-lg">{formatPrice(property.price)}</p>
          </div>
          
          <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-3">
            <MapPin className="h-3.5 w-3.5 text-blue-600 shrink-0" />
            <span className="line-clamp-1 font-medium">{property.location}</span>
          </div>

          {property.description && (
            <p className="text-gray-500 text-[11px] line-clamp-2 mb-4 leading-relaxed">
              {property.description}
            </p>
          )}
          
          <div className="grid grid-cols-3 gap-2 py-3 border-y border-gray-50 mb-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                <Bed className="h-3.5 w-3.5 text-gray-400" />
              </div>
              <span className="text-[11px] font-bold text-gray-900">{property.beds || property.bedrooms}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                <Bath className="h-3.5 w-3.5 text-gray-400" />
              </div>
              <span className="text-[11px] font-bold text-gray-900">{property.baths || property.bathrooms}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                <Square className="h-3.5 w-3.5 text-gray-400" />
              </div>
              <span className="text-[11px] font-bold text-gray-900">{property.sqft || property.area}m²</span>
            </div>
          </div>

          {property.amenities && property.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {property.amenities.slice(0, 2).map((amenity: string) => (
                <span key={amenity} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-bold rounded-md uppercase tracking-wider">
                  {amenity}
                </span>
              ))}
              {property.amenities.length > 2 && (
                <span className="px-2 py-0.5 bg-gray-50 text-gray-500 text-[9px] font-bold rounded-md uppercase tracking-wider">
                  +{property.amenities.length - 2}
                </span>
              )}
            </div>
          )}
        </Link>
      </motion.div>
    </div>
  );
}
