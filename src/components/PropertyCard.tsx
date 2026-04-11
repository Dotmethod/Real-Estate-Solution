import React from 'react';
import { Link } from 'react-router-dom';
import { Property } from '../types';
import { Bed, Bath, Square, MapPin, Phone, User, ShieldCheck } from 'lucide-react';
import { formatPrice, cn } from '../lib/utils';
import { motion } from 'motion/react';

interface PropertyCardProps {
  property: any; // Using any to accommodate agent details
  key?: React.Key;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  // Handle Supabase join which might return an array or a single object
  const agent = Array.isArray(property.profiles) ? property.profiles[0] : property.profiles;

  return (
    <Link to={`/properties/${property.id}`} className="block h-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="group bg-white rounded-3xl overflow-hidden border border-gray-100 hover:shadow-2xl transition-all duration-500 flex flex-col h-full"
      >
        <div className="relative h-64 overflow-hidden">
          <img
            src={property.images?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800'}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            referrerPolicy="no-referrer"
          />
          <div className="absolute top-4 left-4">
            <span className={cn(
              "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg bg-blue-600 text-white"
            )}>
              {property.type || 'Property'}
            </span>
          </div>
        </div>
        
        <div className="p-6 flex-1 flex flex-col">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-xl font-black text-gray-900 line-clamp-1 leading-tight">{property.title}</h3>
            <p className="text-blue-600 font-black text-xl">{formatPrice(property.price)}</p>
          </div>
          
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-6">
            <MapPin className="h-4 w-4 text-blue-600" />
            <span className="line-clamp-1 font-medium">{property.location}</span>
          </div>
          
          <div className="grid grid-cols-3 gap-4 py-6 border-y border-gray-50 mb-6">
            <div className="flex flex-col items-center gap-1">
              <div className="h-8 w-8 bg-gray-50 rounded-lg flex items-center justify-center">
                <Bed className="h-4 w-4 text-gray-400" />
              </div>
              <span className="text-xs font-bold text-gray-900">{property.beds || property.bedrooms}</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="h-8 w-8 bg-gray-50 rounded-lg flex items-center justify-center">
                <Bath className="h-4 w-4 text-gray-400" />
              </div>
              <span className="text-xs font-bold text-gray-900">{property.baths || property.bathrooms}</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="h-8 w-8 bg-gray-50 rounded-lg flex items-center justify-center">
                <Square className="h-4 w-4 text-gray-400" />
              </div>
              <span className="text-xs font-bold text-gray-900">{property.sqft || property.area}m²</span>
            </div>
          </div>

          {property.amenities && property.amenities.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {property.amenities.slice(0, 3).map((amenity: string) => (
                <span key={amenity} className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                  {amenity}
                </span>
              ))}
              {property.amenities.length > 3 && (
                <span className="px-2 py-1 bg-gray-50 text-gray-500 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                  +{property.amenities.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}
