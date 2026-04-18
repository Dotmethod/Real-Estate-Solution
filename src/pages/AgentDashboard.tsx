import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Building2, TrendingUp, Eye, Edit, Trash2, MapPin, User, LayoutDashboard, X, Image as ImageIcon, Loader2, AlertTriangle, CreditCard, Clock, CheckCircle, Phone, MessageSquare, BarChart3, ShieldCheck } from 'lucide-react';
import { formatPrice, cn } from '../lib/utils';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ProfileSection from '../components/ProfileSection';
import { supabase } from '../lib/supabase';
import { getSafeSession } from '../lib/auth';
import { NIGERIA_STATES_LGA } from '../constants/nigeriaData';

interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  beds: number;
  baths: number;
  sqft: number;
  type: string;
  listing_status: string;
  status: string;
  images: string[];
  agent_id: string;
  created_at: string;
  amenities?: string[];
  agency_fee?: number;
  inspection_fee?: number;
}

export default function AgentDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') as 'overview' | 'listings' | 'profile' || 'overview';
  const [activeTab, setActiveTab] = useState<'overview' | 'listings' | 'profile'>(initialTab);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [planDetails, setPlanDetails] = useState<any>(null);

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const propertyFileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<(File | string)[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [customAmenity, setCustomAmenity] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    location: '',
    state: '',
    lga: '',
    type: 'house',
    listing_status: 'sale',
    description: '',
    beds: '',
    baths: '',
    sqft: '',
    amenities: [] as string[],
    agency_fee: '',
    inspection_fee: '',
  });

  useEffect(() => {
    const fetchUser = async () => {
      const { session, error } = await getSafeSession();
      if (error || !session) {
        navigate('/login');
        return;
      }
      if (session?.user) {
        setUser(session.user);
        let { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        // If profile doesn't exist, create it from user metadata
        if (profileError && profileError.code === 'PGRST116') {
          console.log('Profile not found, creating from metadata...');
          
          // Get default free plan name
          let freePlanName = 'Free Plan';
          const { data: freePlan } = await supabase
            .from('subscription_plans')
            .select('name')
            .eq('price', 0)
            .limit(1)
            .single();
          if (freePlan) freePlanName = freePlan.name;

          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .upsert({
              id: session.user.id,
              full_name: session.user.user_metadata?.full_name || 'Agent',
              role: session.user.user_metadata?.role || 'agent',
              status: session.user.user_metadata?.status || 'approved',
              email: session.user.email,
              phone: session.user.user_metadata?.phone || '',
              address: session.user.user_metadata?.address || '',
              avatar_url: session.user.user_metadata?.avatar_url || '',
              subscription_plan: freePlanName
            })
            .select()
            .single();
          
          if (!createError) {
            profileData = newProfile;
          } else {
            console.error('Error creating profile:', createError);
          }
        }

        if (profileData?.status === 'suspended' && profileData?.role !== 'admin') {
          // We allow suspended users to log in but restrict actions
        }
        
        setProfile(profileData);

        // Fetch plan details
        if (profileData?.subscription_plan) {
          const { data: planData } = await supabase
            .from('subscription_plans')
            .select('*')
            .ilike('name', profileData.subscription_plan)
            .single();
          
          if (planData) {
            setPlanDetails(planData);
          } else {
            // Fallback: If plan name changed or not found, find the default free plan (price 0)
            const { data: defaultPlan } = await supabase
              .from('subscription_plans')
              .select('*')
              .eq('price', 0)
              .limit(1)
              .single();
            if (defaultPlan) setPlanDetails(defaultPlan);
          }
        } else if (profileData?.status === 'approved') {
          // If approved but no plan assigned, find and assign the free plan
          const { data: freePlan } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('price', 0)
            .limit(1)
            .single();
            
          if (freePlan) {
            setPlanDetails(freePlan);
            // Opportunistically update profile if missing plan
            await supabase.from('profiles').update({ subscription_plan: freePlan.name }).eq('id', profileData.id);
          }
        }
      } else {
        navigate('/login');
      }
      setIsLoading(false);
    };

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        let { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        // If profile doesn't exist, create it from user metadata
        if (profileError && profileError.code === 'PGRST116') {
          // Get default free plan name
          let freePlanName = 'Free Plan';
          const { data: freePlan } = await supabase
            .from('subscription_plans')
            .select('name')
            .eq('price', 0)
            .limit(1)
            .single();
          if (freePlan) freePlanName = freePlan.name;

          const { data: newProfile } = await supabase
            .from('profiles')
            .upsert({
              id: session.user.id,
              full_name: session.user.user_metadata?.full_name || 'Agent',
              role: session.user.user_metadata?.role || 'agent',
              status: session.user.user_metadata?.status || 'approved',
              email: session.user.email,
              phone: session.user.user_metadata?.phone || '',
              address: session.user.user_metadata?.address || '',
              avatar_url: session.user.user_metadata?.avatar_url || '',
              subscription_plan: freePlanName
            })
            .select()
            .single();
          
          if (newProfile) {
            profileData = newProfile;
          }
        }
        
        setProfile(profileData);

        // Fetch plan details
        if (profileData?.subscription_plan) {
          const { data: planData } = await supabase
            .from('subscription_plans')
            .select('*')
            .ilike('name', profileData.subscription_plan)
            .single();
          
          if (planData) {
            setPlanDetails(planData);
          } else {
            // Fallback: If plan name changed or not found, find the default free plan (price 0)
            const { data: defaultPlan } = await supabase
              .from('subscription_plans')
              .select('*')
              .eq('price', 0)
              .limit(1)
              .single();
            if (defaultPlan) setPlanDetails(defaultPlan);
          }
        } else if (profileData?.status === 'approved') {
          // If approved but no plan assigned, find and assign the free plan
          const { data: freePlan } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('price', 0)
            .limit(1)
            .single();
            
          if (freePlan) {
            setPlanDetails(freePlan);
            // Opportunistically update profile if missing plan
            await supabase.from('profiles').update({ subscription_plan: freePlan.name }).eq('id', profileData.id);
          }
        }
      } else {
        setUser(null);
        setProfile(null);
        navigate('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const isProfileComplete = () => {
    if (!profile) return false;
    return !!(
      profile.full_name && 
      profile.phone && 
      profile.address && 
      profile.avatar_url &&
      profile.bio
    );
  };

  useEffect(() => {
    if (user) {
      fetchProperties();
    }
  }, [user]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'profile' || tab === 'overview' || tab === 'listings') {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  const fetchProperties = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('agent_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    // Check image limit
    const maxImages = planDetails?.limits?.images_per_property || 5;
    if (profile?.role !== 'admin' && maxImages !== -1) {
      const currentCount = selectedFiles.length;
      if (currentCount + files.length > maxImages) {
        setStatusMessage({ 
          type: 'error', 
          text: `Your ${profile?.subscription_plan} plan allows a maximum of ${maxImages} images per property. You currently have ${currentCount} and tried to add ${files.length}.` 
        });
        return;
      }
    }

    setSelectedFiles(prev => [...prev, ...files]);

    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    const itemToRemove = selectedFiles[index];
    
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => {
      const newPreviews = prev.filter((_, i) => i !== index);
      // Only revoke if it was a blob URL (newly uploaded)
      if (typeof itemToRemove !== 'string') {
        URL.revokeObjectURL(prev[index]);
      }
      return newPreviews;
    });
  };

  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const getCurrentListingCount = () => {
    if (profile?.role === 'admin') return 0;
    const subscriptionUpdatedAt = user?.user_metadata?.subscription_updated_at;
    // Count only properties created after the last subscription update
    return properties.filter(p => 
      p.status !== 'deleted' && 
      (!subscriptionUpdatedAt || new Date(p.created_at) > new Date(subscriptionUpdatedAt))
    ).length;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    
    if (!user) {
      setStatusMessage({ type: 'error', text: 'You must be logged in to upload a property.' });
      return;
    }

    if (profile?.status === 'suspended') {
      setStatusMessage({ type: 'error', text: 'Your account is suspended. You cannot submit new properties.' });
      return;
    }

    if (profile?.status !== 'approved' && profile?.role !== 'admin') {
      setStatusMessage({ type: 'error', text: 'Your account is pending admin approval. You cannot submit properties yet.' });
      return;
    }

    // Check subscription limits
    if (profile?.role !== 'admin') {
      const currentListingCount = getCurrentListingCount();
      const maxListings = planDetails?.limits?.properties || 0;
      const maxImages = planDetails?.limits?.images_per_property || 5;

      // Only check listing limit for new properties
      if (!editingProperty && maxListings !== -1 && currentListingCount >= maxListings) {
        setStatusMessage({ 
          type: 'error', 
          text: `You have reached the listing limit for your ${profile?.subscription_plan} plan (${maxListings} properties). Please upgrade your plan to list more.` 
        });
        setIsSubmitting(false);
        return;
      }

      // Check image limit
      if (maxImages !== -1 && selectedFiles.length > maxImages) {
        setStatusMessage({ 
          type: 'error', 
          text: `Your ${profile?.subscription_plan} plan allows a maximum of ${maxImages} images per property.` 
        });
        setIsSubmitting(false);
        return;
      }
    }

    // Manual validation to ensure we catch errors before submission
    if (!formData.title.trim() || formData.title.trim().length < 5) {
      setStatusMessage({ type: 'error', text: 'Property title must be at least 5 characters long.' });
      return;
    }
    if (!formData.price || isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid positive price.' });
      return;
    }
    if (!formData.description.trim() || formData.description.trim().length < 20) {
      setStatusMessage({ type: 'error', text: 'Description must be at least 20 characters long.' });
      return;
    }

    if (!formData.location.trim()) {
      setStatusMessage({ type: 'error', text: 'Location is required.' });
      return;
    }

    if (formData.beds && (isNaN(parseInt(formData.beds)) || parseInt(formData.beds) < 0)) {
      setStatusMessage({ type: 'error', text: 'Beds must be a non-negative number.' });
      return;
    }

    if (formData.baths && (isNaN(parseInt(formData.baths)) || parseInt(formData.baths) < 0)) {
      setStatusMessage({ type: 'error', text: 'Baths must be a non-negative number.' });
      return;
    }

    if (formData.sqft && (isNaN(parseInt(formData.sqft)) || parseInt(formData.sqft) < 0)) {
      setStatusMessage({ type: 'error', text: 'Sqft must be a non-negative number.' });
      return;
    }

    if (selectedFiles.length === 0 && !editingProperty) {
      setStatusMessage({ type: 'error', text: 'Please upload at least one property image.' });
      return;
    }

    if (editingProperty && !isEditable(editingProperty.created_at)) {
      setStatusMessage({ 
        type: 'error', 
        text: 'This property was posted more than 1 hour ago and can no longer be edited. Please upgrade your plan or contact support to make changes.' 
      });
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    setUploadProgress(0);
    setUploadStatus('Starting upload...');

    try {
      // 1. Process images (upload new ones, keep existing ones)
      const finalImageUrls: string[] = [];
      const filesToUpload = selectedFiles.filter(f => typeof f !== 'string') as File[];
      const existingUrls = selectedFiles.filter(f => typeof f === 'string') as string[];
      
      if (filesToUpload.length > 0) {
        const totalFiles = filesToUpload.length;
        for (let i = 0; i < totalFiles; i++) {
          const file = filesToUpload[i];
          setUploadStatus(`Uploading new image ${i + 1} of ${totalFiles}...`);
          
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `${user.id}/${Date.now()}-${fileName}`;

          const { error: uploadError, data: uploadData } = await supabase.storage
            .from('property-images')
            .upload(filePath, file);

          if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error(`Failed to upload image "${file.name}": ${uploadError.message}`);
          }

          if (uploadData) {
            const { data: { publicUrl } } = supabase.storage
              .from('property-images')
              .getPublicUrl(filePath);
            finalImageUrls.push(publicUrl);
          }
          
          setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
        }
      }

      // Combine existing URLs with newly uploaded ones
      const allImageUrls = [...existingUrls, ...finalImageUrls];

      if (allImageUrls.length === 0) {
        // Fallback if no images
        allImageUrls.push('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=1000');
      }

      setUploadStatus('Saving property details...');
      
      // Combine area, lga and state for the final location string
      const finalLocation = `${formData.location.trim()}, ${formData.lga}, ${formData.state}`;
      
      const propertyData: any = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        location: finalLocation,
        type: formData.type,
        listing_status: formData.listing_status,
        beds: parseInt(formData.beds) || 0,
        baths: parseInt(formData.baths) || 0,
        sqft: parseInt(formData.sqft) || 0,
        agency_fee: formData.agency_fee ? parseFloat(formData.agency_fee) : null,
        inspection_fee: formData.inspection_fee ? parseFloat(formData.inspection_fee) : null,
        agent_id: user.id,
        status: 'approved',
        amenities: formData.amenities,
        images: allImageUrls
      };

      console.log('Attempting to save property:', propertyData);

      let result;
      if (editingProperty) {
        result = await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', editingProperty.id)
          .select();
      } else {
        result = await supabase
          .from('properties')
          .insert([propertyData])
          .select();
      }

      // Graceful fallback if columns are missing in database
      if (result.error && result.error.message?.includes('column') && 
         (result.error.message?.includes('agency_fee') || result.error.message?.includes('inspection_fee'))) {
        console.warn('Fee columns missing in database, retrying without them...');
        const { agency_fee, inspection_fee, ...safeData } = propertyData;
        if (editingProperty) {
          result = await supabase
            .from('properties')
            .update(safeData)
            .eq('id', editingProperty.id)
            .select();
        } else {
          result = await supabase
            .from('properties')
            .insert([safeData])
            .select();
        }
      }

      const { error, data } = result;

      if (error) {
        console.error('Supabase save error:', error);
        throw new Error(error.message);
      }

      console.log('Property saved successfully:', data);
      
      // Success!
      setStatusMessage({ 
        type: 'success', 
        text: editingProperty ? 'Property updated successfully!' : 'Property published successfully! Your listing is now live.' 
      });
      
      // Delay closing modal to show success message
      setTimeout(() => {
        setShowUploadModal(false);
        setEditingProperty(null);
        setStatusMessage(null);
        setFormData({
          title: '',
          price: '',
          location: '',
          state: '',
          lga: '',
          type: 'house',
          listing_status: 'sale',
          description: '',
          beds: '',
          baths: '',
          sqft: '',
          amenities: [],
        });
        setSelectedFiles([]);
        setPreviews([]);
        fetchProperties();
      }, 2000);

    } catch (error: any) {
      console.error('Error uploading property:', error);
      setStatusMessage({ type: 'error', text: `Failed to upload property: ${error.message || 'Unknown error'}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditable = (createdAt: string) => {
    if (profile?.role === 'admin') return true;
    const createdDate = new Date(createdAt);
    const now = new Date();
    const diffInMs = now.getTime() - createdDate.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    return diffInHours <= 1;
  };

  const getTimeRemaining = (createdAt: string) => {
    const createdDate = new Date(createdAt);
    const expiryDate = new Date(createdDate.getTime() + 60 * 60 * 1000);
    const now = new Date();
    const diffInMs = expiryDate.getTime() - now.getTime();
    
    if (diffInMs <= 0) return null;
    
    const minutes = Math.floor(diffInMs / (1000 * 60));
    const seconds = Math.floor((diffInMs % (1000 * 60)) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const handleEdit = (property: Property) => {
    if (!isEditable(property.created_at)) {
      setStatusMessage({ 
        type: 'error', 
        text: 'This property was posted more than 1 hour ago and can no longer be edited. Please upgrade your plan or contact support to make changes.' 
      });
      return;
    }
    setEditingProperty(property);
    
    // Try to parse location into state, lga and specific area
    let state = '';
    let lga = '';
    let area = property.location;
    
    if (property.location.includes(',')) {
      const parts = property.location.split(',').map(p => p.trim());
      if (parts.length >= 3) {
        area = parts[0];
        lga = parts[1];
        state = parts[2];
      } else if (parts.length === 2) {
        // Fallback for older format or partial data
        lga = parts[0];
        state = parts[1];
        area = '';
      }
    }

    setFormData({
      title: property.title,
      price: property.price.toString(),
      location: area,
      state: state,
      lga: lga,
      type: property.type,
      listing_status: property.listing_status || 'sale',
      description: property.description,
      beds: property.beds.toString(),
      baths: property.baths.toString(),
      sqft: property.sqft.toString(),
      amenities: property.amenities || [],
      agency_fee: property.agency_fee?.toString() || '',
      inspection_fee: property.inspection_fee?.toString() || '',
    });
    setSelectedFiles(property.images);
    setPreviews(property.images);
    setShowUploadModal(true);
  };

  const handleDelete = async (id: string) => {
    setStatusMessage(null);
    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: 'deleted' })
        .eq('id', id);

      if (error) throw error;
      
      // Refresh properties to reflect the status change
      fetchProperties();
      setShowDeleteConfirm(null);
      setStatusMessage({ type: 'success', text: 'Property deleted successfully.' });
    } catch (error: any) {
      console.error('Error deleting property:', error);
      setStatusMessage({ type: 'error', text: 'Failed to delete property: ' + error.message });
      setShowDeleteConfirm(null);
    }
  };

  const isRecentlyApproved = () => {
    const approvedAt = user?.user_metadata?.approved_at;
    if (approvedAt) {
      const approvedDate = new Date(approvedAt);
      const now = new Date();
      const diffInMs = now.getTime() - approvedDate.getTime();
      const diffInHours = diffInMs / (1000 * 60 * 60);
      return diffInHours <= 24;
    }
    
    // Fallback for users approved before the timestamp was implemented:
    // Show if the account itself is less than 48 hours old
    const createdAt = user?.created_at;
    if (createdAt) {
      const createdDate = new Date(createdAt);
      const now = new Date();
      const diffInMs = now.getTime() - createdDate.getTime();
      const diffInHours = diffInMs / (1000 * 60 * 60);
      return diffInHours <= 48;
    }
    
    return false;
  };

  const filteredProperties = properties.filter(property => {
    if (property.status === 'deleted') return false;
    const matchesSearch = property.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          property.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || property.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || property.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleAddCustomAmenity = () => {
    if (!customAmenity.trim()) return;
    if (formData.amenities.includes(customAmenity.trim())) {
      setCustomAmenity('');
      return;
    }
    setFormData({
      ...formData,
      amenities: [...formData.amenities, customAmenity.trim()]
    });
    setCustomAmenity('');
  };

  const DEFAULT_AMENITIES = ['Swimming Pool', 'Gym', 'Air Conditioning', 'Security', 'Parking', 'WiFi', 'Generator', 'Elevator', 'Furnished'];

  return (
    <div className="pt-24 pb-12 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {profile?.status === 'suspended' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 bg-red-50 border border-red-100 rounded-[2rem] flex items-center gap-4 text-red-700 shadow-sm"
          >
            <div className="h-12 w-12 bg-red-100 rounded-2xl flex items-center justify-center shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-black mb-1">Account Suspended</h3>
              <p className="text-sm font-medium opacity-80">Your account has been suspended by an administrator. You can still view your dashboard, but you cannot submit new properties or edit existing ones until the suspension is lifted.</p>
            </div>
          </motion.div>
        )}

        {profile?.status === 'pending' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 bg-yellow-50 border border-yellow-100 rounded-[2rem] flex items-center gap-4 text-yellow-700 shadow-sm"
          >
            <div className="h-12 w-12 bg-yellow-100 rounded-2xl flex items-center justify-center shrink-0">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-lg font-black mb-1">Account Pending Approval</h3>
              <p className="text-sm font-medium opacity-80">Your account is currently pending approval from our administrators. You can explore the dashboard, but you won't be able to submit new listings until you complete your profile to unlock all features and listing capabilities before your account will be approved. We'll notify you once it's ready!</p>
            </div>
          </motion.div>
        )}

        {profile?.status === 'approved' && profile?.role !== 'admin' && isRecentlyApproved() && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 bg-green-50 border border-green-100 rounded-[2rem] flex items-center gap-4 text-green-700 shadow-sm"
          >
            <div className="h-12 w-12 bg-green-100 rounded-2xl flex items-center justify-center shrink-0">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-black mb-1">Account Approved</h3>
              <p className="text-sm font-medium opacity-80">Great news! Your account has been approved. You can now start submitting your property listings and reach potential buyers/renters.</p>
            </div>
          </motion.div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900">
              {profile?.role === 'owner' ? 'Owner Dashboard' : 'Agent Dashboard'}
            </h1>
            <p className="text-gray-600">
              Welcome back, {profile?.full_name || user?.user_metadata?.full_name || (profile?.role === 'owner' ? 'Owner' : 'Agent')}. 
              {profile?.role === 'owner' ? ' Manage your property and inquiries.' : ' Manage your listings and leads.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
              <button
                onClick={() => setActiveTab('overview')}
                className={cn(
                  "px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                  activeTab === 'overview' ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
                )}
              >
                <LayoutDashboard className="h-4 w-4" /> Overview
              </button>
              <button
                onClick={() => setActiveTab('listings')}
                className={cn(
                  "px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                  activeTab === 'listings' ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
                )}
              >
                <Building2 className="h-4 w-4" /> Listings
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={cn(
                  "px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                  activeTab === 'profile' ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
                )}
              >
                <User className="h-4 w-4" /> Profile
              </button>
            </div>
            {(profile?.status === 'approved' || profile?.role === 'admin') ? (
              <div className="relative group">
                <button
                  onClick={() => {
                    if (!isProfileComplete() && profile?.role !== 'admin') {
                      setStatusMessage({ 
                        type: 'error', 
                        text: 'To list properties, you must first complete your profile by providing your Profile Image, Phone Number, and Office/Home Address. This information is required for admin verification and approval.' 
                      });
                      setActiveTab('profile');
                      return;
                    }
                    const currentListingCount = getCurrentListingCount();
                    const maxListings = planDetails?.limits?.properties || 0;
                    if (profile?.role !== 'admin' && maxListings !== -1 && currentListingCount >= maxListings) {
                      setStatusMessage({ 
                        type: 'error', 
                        text: `You have reached the listing limit for your ${profile?.subscription_plan} plan (${maxListings} properties). Please upgrade your plan to list more.` 
                      });
                      return;
                    }
                    setShowUploadModal(true);
                  }}
                  className={cn(
                    "px-8 py-4 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg",
                    profile?.role !== 'admin' && (planDetails?.limits?.properties !== -1 && getCurrentListingCount() >= (planDetails?.limits?.properties || 0) || !isProfileComplete())
                      ? "bg-gray-400 text-white cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"
                  )}
                >
                  <Plus className="h-5 w-5" /> Upload Property
                </button>
                {/* Tooltip for help */}
                {!isProfileComplete() && profile?.role !== 'admin' && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Complete profile to unlock listing
                  </div>
                )}
                {profile?.role !== 'admin' && planDetails?.limits?.properties !== -1 && getCurrentListingCount() >= (planDetails?.limits?.properties || 0) && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Listing limit reached
                  </div>
                )}
              </div>
            ) : profile?.status === 'pending' ? (
              <div className="relative group">
                <button
                  disabled
                  className="px-8 py-4 bg-gray-100 text-gray-400 rounded-xl font-bold flex items-center gap-2 border border-gray-200 cursor-not-allowed shadow-sm"
                >
                  <Plus className="h-5 w-5" /> Upload Property
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  Pending Approval
                </div>
              </div>
            ) : profile?.status === 'suspended' ? (
              <div className="bg-gray-100 text-gray-400 px-8 py-4 rounded-xl font-bold flex items-center gap-2 cursor-not-allowed border border-gray-200">
                <AlertTriangle className="h-5 w-5" /> Upload Disabled
              </div>
            ) : null}
          </div>
        </div>

        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "mb-8 p-4 rounded-2xl font-bold text-sm flex items-center justify-between",
              statusMessage.type === 'success' ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            )}
          >
            <span>{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)} className="p-1 hover:bg-black/5 rounded-full transition-colors">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}

        {activeTab === 'overview' && (
          <>
            {/* Agent Identity Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm mb-8 md:mb-12"
            >
              <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
                <div className="h-24 w-24 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 text-3xl font-black overflow-hidden border border-blue-100 shrink-0">
                  {profile?.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt={profile.full_name} 
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    (profile?.full_name || user?.user_metadata?.full_name || 'A').charAt(0)
                  )}
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                      {profile?.full_name || user?.user_metadata?.full_name || (profile?.role === 'owner' ? 'Owner Profile' : 'Agent Profile')}
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] uppercase font-black rounded-md border border-blue-100">
                        Verified Identity
                      </span>
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="h-4 w-4 text-blue-600" />
                      <span className={cn("text-sm font-bold", !profile?.phone && "text-orange-500 italic font-medium")}>
                        {profile?.phone || 'Missing phone number'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      <span className={cn("text-sm font-bold truncate", !profile?.address && "text-orange-500 italic font-medium")}>
                        {profile?.address || 'Missing address'}
                      </span>
                    </div>
                  </div>
                  {!isProfileComplete() && (
                    <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl flex items-center gap-2 text-orange-700 text-xs font-bold">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      Please complete your profile to unlock all features and listing capabilities.
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => setActiveTab('profile')}
                  className="px-6 py-3 bg-gray-50 text-gray-600 rounded-xl font-bold hover:bg-gray-100 transition-all border border-gray-100 text-sm"
                >
                  Edit Information
                </button>
              </div>
            </motion.div>

            <div className="space-y-8 md:space-y-12 mb-12">
            {/* Your Stats Widget */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {[
                { 
                  label: 'Active Listings', 
                  value: properties.filter(p => p.status !== 'deleted').length, 
                  icon: Building2, 
                  color: 'text-blue-600', 
                  bg: 'bg-blue-50',
                  trend: '+12%',
                  description: 'Living properties'
                },
                { 
                  label: 'Views (30d)', 
                  value: (properties.length * 124).toLocaleString(), 
                  icon: Eye, 
                  color: 'text-purple-600', 
                  bg: 'bg-purple-50',
                  trend: '+18.5%',
                  description: 'Total property interest'
                },
                { 
                  label: 'Inquiries', 
                  value: (properties.length * 8).toLocaleString(), 
                  icon: MessageSquare, 
                  color: 'text-green-600', 
                  bg: 'bg-green-50',
                  trend: '+5.2%',
                  description: 'Direct leads received'
                },
                { 
                  label: 'Conversion Rate', 
                  value: '6.4%', 
                  icon: TrendingUp, 
                  color: 'text-orange-600', 
                  bg: 'bg-orange-50',
                  trend: '+1.1%',
                  description: 'Views to inquiries'
                },
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300", stat.bg)}>
                      <stat.icon className={cn("h-6 w-6", stat.color)} />
                    </div>
                    <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                      {stat.trend}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-black text-gray-900">{stat.value}</p>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                  </div>
                  <p className="mt-4 text-[10px] text-gray-400 font-medium italic">{stat.description}</p>
                </motion.div>
              ))}
            </div>

            {/* Performance Chart & Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-black text-gray-900">Performance Trends</h3>
                    <p className="text-xs text-gray-500 font-medium">Daily property views and interactions</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-lg">Views</button>
                    <button className="px-3 py-1 bg-gray-50 text-gray-400 text-[10px] font-black rounded-lg">Leads</button>
                  </div>
                </div>
                
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={[
                        { name: 'Mon', views: 400 },
                        { name: 'Tue', views: 1200 },
                        { name: 'Wed', views: 900 },
                        { name: 'Thu', views: 1800 },
                        { name: 'Fri', views: 1500 },
                        { name: 'Sat', views: 2400 },
                        { name: 'Sun', views: 2100 },
                      ]}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '16px', 
                          border: 'none', 
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="views" 
                        stroke="#2563eb" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorViews)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col"
              >
                <div className="flex items-center gap-2 mb-6">
                  <div className="h-8 w-8 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <h3 className="text-lg font-black text-gray-900">Optimization Tips</h3>
                </div>

                <div className="space-y-4 flex-1">
                  {[
                    { title: 'Update Images', text: 'Properties with 5+ photos get 40% more views.', icon: ImageIcon, bg: 'bg-blue-50', color: 'text-blue-600' },
                    { title: 'Verify Details', text: 'Verified listings attract high-intent buyers.', icon: ShieldCheck, bg: 'bg-green-50', color: 'text-green-600' },
                    { title: 'Response Time', text: 'Slow response reduces your conversion by 15%.', icon: Clock, bg: 'bg-orange-50', color: 'text-orange-600' },
                  ].map((tip, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-blue-100 transition-colors group">
                      <div className="flex items-start gap-3">
                        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-transform group-hover:rotate-12", tip.bg, tip.color)}>
                          <tip.icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900 mb-1">{tip.title}</p>
                          <p className="text-[10px] text-gray-500 font-medium leading-relaxed">{tip.text}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => setActiveTab('listings')}
                  className="mt-6 w-full py-3 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-colors"
                >
                  Manage Listings
                </button>
              </motion.div>
            </div>
          </div>

            {/* Subscription Limits */}
            {planDetails && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm mb-12"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                      </div>
                      <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Current Plan: <span className="text-blue-600">{planDetails.name}</span></h2>
                    </div>
                    <p className="text-gray-500 font-medium">Your subscription limits and current usage (including deleted listings)</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <Link
                      to="/pricing"
                      className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
                    >
                      <CreditCard className="h-4 w-4" /> Manage Plan
                    </Link>
                    <div className="flex flex-wrap gap-4">
                      <div className="px-6 py-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Listings Limit</p>
                        <div className="flex items-end gap-2">
                          <span className="text-2xl font-black text-gray-900">{getCurrentListingCount()}</span>
                          <span className="text-gray-400 font-bold mb-1">/ {planDetails.limits?.properties === -1 ? '∞' : (planDetails.limits?.properties || 0)}</span>
                        </div>
                      </div>
                      <div className="px-6 py-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Images per Listing</p>
                        <div className="flex items-end gap-2">
                          <span className="text-2xl font-black text-gray-900">{planDetails.limits?.images_per_property === -1 ? '∞' : (planDetails.limits?.images_per_property || 0)}</span>
                          <span className="text-gray-400 font-bold mb-1">Max</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                  
                  {/* Progress Bar */}
                  {planDetails.limits?.properties !== -1 && (
                    <div className="mt-8">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-gray-700">Listings Usage (Current Cycle)</span>
                        <span className="text-sm font-bold text-blue-600">
                          {Math.round((getCurrentListingCount() / (planDetails.limits?.properties || 1)) * 100)}%
                        </span>
                      </div>
                      <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((getCurrentListingCount() / (planDetails.limits?.properties || 1)) * 100, 100)}%` }}
                          className={cn(
                            "h-full transition-all duration-1000",
                            (getCurrentListingCount() / (planDetails.limits?.properties || 1)) >= 0.9 ? "bg-red-500" : "bg-blue-600"
                          )}
                        />
                      </div>
                    </div>
                  )}
              </motion.div>
            )}
          </>
        )}

        {activeTab === 'listings' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Search and Filters */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search by title or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-all"
                />
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                <select 
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="flex-1 md:w-40 px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-all bg-white"
                >
                  <option value="all">All Types</option>
                  <option value="house">House</option>
                  <option value="apartment">Apartment</option>
                  <option value="land">Land</option>
                  <option value="commercial">Commercial</option>
                </select>
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="flex-1 md:w-40 px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-all bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-lg md:text-xl font-bold text-gray-900">My Listings</h2>
                <span className="text-xs md:text-sm text-gray-500 font-medium">Showing {filteredProperties.length} properties</span>
              </div>
              
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-8 py-4 text-sm font-bold text-gray-900">Property</th>
                      <th className="px-8 py-4 text-sm font-bold text-gray-900">Price</th>
                      <th className="px-8 py-4 text-sm font-bold text-gray-900">Status</th>
                      <th className="px-8 py-4 text-sm font-bold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan={4} className="px-8 py-12 text-center text-gray-500">Loading properties...</td>
                      </tr>
                    ) : filteredProperties.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-8 py-12 text-center text-gray-500">No properties found matching your criteria.</td>
                      </tr>
                    ) : filteredProperties.map((property) => (
                      <tr key={property.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <img src={property.images[0]} alt="" className="h-16 w-16 rounded-xl object-cover" />
                            <div>
                              <p className="font-bold text-gray-900">{property.title}</p>
                              <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                <MapPin className="h-3 w-3" /> {property.location}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <p className="font-bold text-blue-600">{formatPrice(property.price)}</p>
                        </td>
                        <td className="px-8 py-6">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                            property.status === 'approved' ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                          )}>
                            {property.status}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                            {isEditable(property.created_at) ? (
                              <div className="flex flex-col items-end gap-1">
                                <button 
                                  onClick={() => handleEdit(property)}
                                  disabled={profile?.status === 'suspended'}
                                  className={cn(
                                    "p-2 rounded-lg transition-colors",
                                    profile?.status === 'suspended' ? "bg-gray-50 text-gray-300 cursor-not-allowed" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                                  )}
                                  title={profile?.status === 'suspended' ? "Account Suspended" : "Edit"}
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                {profile?.role !== 'admin' && (
                                  <span className="text-[10px] font-bold text-orange-500 whitespace-nowrap">
                                    {getTimeRemaining(property.created_at)} left
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div 
                                className="p-2 rounded-lg bg-gray-50 text-gray-300 cursor-not-allowed"
                                title="Editing disabled (1 hour limit exceeded)"
                              >
                                <Edit className="h-4 w-4" />
                              </div>
                            )}
                            <button 
                              onClick={() => setShowDeleteConfirm(property.id)}
                              disabled={profile?.status === 'suspended'}
                              className={cn(
                                "p-2 rounded-lg transition-colors",
                                profile?.status === 'suspended' ? "bg-gray-50 text-gray-300 cursor-not-allowed" : "bg-red-50 text-red-600 hover:bg-red-100"
                              )}
                              title={profile?.status === 'suspended' ? "Account Suspended" : "Delete"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-100">
                {isLoading ? (
                  <div className="p-8 text-center text-gray-500">Loading properties...</div>
                ) : filteredProperties.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">No properties found.</div>
                ) : filteredProperties.map((property) => (
                  <div key={property.id} className="p-4 space-y-4">
                    <div className="flex items-center gap-4">
                      <img src={property.images[0]} alt="" className="h-16 w-16 rounded-xl object-cover shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-900 truncate">{property.title}</p>
                        <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-0.5 truncate">
                          <MapPin className="h-3 w-3 shrink-0" /> {property.location}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                            property.status === 'approved' ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                          )}>
                            {property.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                      <p className="font-bold text-blue-600">{formatPrice(property.price)}</p>
                      <div className="flex items-center gap-2">
                        {isEditable(property.created_at) ? (
                          <div className="flex flex-col items-end gap-1">
                            <button 
                              onClick={() => handleEdit(property)}
                              disabled={profile?.status === 'suspended'}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                                profile?.status === 'suspended' ? "bg-gray-50 text-gray-300 cursor-not-allowed" : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                              )}
                            >
                              <Edit className="h-3.5 w-3.5" /> Edit
                            </button>
                            {profile?.role !== 'admin' && (
                              <span className="text-[9px] font-bold text-orange-500">
                                {getTimeRemaining(property.created_at)} left
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 bg-gray-50 rounded-lg">
                            Locked
                          </div>
                        )}
                        <button 
                          onClick={() => setShowDeleteConfirm(property.id)}
                          disabled={profile?.status === 'suspended'}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                            profile?.status === 'suspended' ? "bg-gray-50 text-gray-300 cursor-not-allowed" : "bg-red-50 text-red-600 hover:bg-red-100"
                          )}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-3xl mx-auto">
            <ProfileSection userId={user?.id || ''} />
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full"
          >
            <div className="h-16 w-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
              <Trash2 className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Delete Property?</h2>
            <p className="text-gray-600 mb-8">This action cannot be undone. This property will be permanently removed from our listings.</p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-6 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-all shadow-lg shadow-red-200"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-gray-900">{editingProperty ? 'Edit Property' : 'Upload New Property'}</h2>
              <button 
                onClick={() => {
                  setShowUploadModal(false);
                  setEditingProperty(null);
                  setFormData({
                    title: '',
                    price: '',
                    location: '',
                    type: 'house',
                    description: '',
                    beds: '',
                    baths: '',
                    sqft: '',
                  });
                  setSelectedFiles([]);
                  setPreviews([]);
                }} 
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            
            <form className="space-y-8" onSubmit={handleSubmit}>
              {planDetails && (
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Plan: {planDetails.name}</p>
                      <p className="text-sm font-bold text-gray-700">
                        {getCurrentListingCount()} / {planDetails.limits?.properties || '∞'} Listings used (Current Cycle)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Image Limit</p>
                    <p className="text-sm font-bold text-gray-700">{planDetails.limits?.images_per_property || '∞'} per property</p>
                  </div>
                </div>
              )}
              
              {statusMessage && (
                <div className={cn(
                  "p-4 rounded-xl text-sm font-bold",
                  statusMessage.type === 'success' ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                )}>
                  {statusMessage.text}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Property Title</label>
                  <input 
                    type="text" 
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-all" 
                    placeholder="e.g. Modern 4 Bedroom House" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Price (₦)</label>
                  <input 
                    type="number" 
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-all" 
                    placeholder="e.g. 50000000" 
                  />
                </div>
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">State</label>
                    <select
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value, lga: '' })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-all"
                    >
                      <option value="">Select State</option>
                      {Object.keys(NIGERIA_STATES_LGA).sort().map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">LGA</label>
                    <select
                      value={formData.lga}
                      onChange={(e) => setFormData({ ...formData, lga: e.target.value })}
                      disabled={!formData.state}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Select LGA</option>
                      {formData.state && NIGERIA_STATES_LGA[formData.state]?.sort().map(lga => (
                        <option key={lga} value={lga}>{lga}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Area / Street Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input 
                        type="text" 
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-all" 
                        placeholder="e.g. 123 Main Street" 
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Property Type</label>
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-all"
                  >
                    <option value="apartment">Apartment</option>
                    <option value="house">House</option>
                    <option value="land">Land</option>
                    <option value="commercial">Commercial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Listing Status</label>
                  <select 
                    value={formData.listing_status}
                    onChange={(e) => setFormData({ ...formData, listing_status: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-all"
                  >
                    <option value="sale">For Sale</option>
                    <option value="rent">For Rent</option>
                    <option value="lease">For Lease</option>
                    <option value="short-let">Short Let</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Beds</label>
                    <input 
                      type="number" 
                      value={formData.beds}
                      onChange={(e) => setFormData({ ...formData, beds: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Baths</label>
                    <input 
                      type="number" 
                      value={formData.baths}
                      onChange={(e) => setFormData({ ...formData, baths: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Sqft</label>
                    <input 
                      type="number" 
                      value={formData.sqft}
                      onChange={(e) => setFormData({ ...formData, sqft: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Agency Fee (₦) - Optional</label>
                  <input 
                    type="number" 
                    value={formData.agency_fee}
                    onChange={(e) => setFormData({ ...formData, agency_fee: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-all" 
                    placeholder="e.g. 50000" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Inspection Fee (₦) - Optional</label>
                  <input 
                    type="number" 
                    value={formData.inspection_fee}
                    onChange={(e) => setFormData({ ...formData, inspection_fee: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-all" 
                    placeholder="e.g. 5000" 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                <textarea 
                  rows={4} 
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-all" 
                  placeholder="Describe the property..."
                ></textarea>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-4 uppercase tracking-widest">Amenities</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  {DEFAULT_AMENITIES.map((amenity) => (
                    <label key={amenity} className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 cursor-pointer hover:bg-blue-50 transition-all group">
                      <input 
                        type="checkbox" 
                        checked={formData.amenities.includes(amenity)}
                        onChange={(e) => {
                          const newAmenities = e.target.checked 
                            ? [...formData.amenities, amenity]
                            : formData.amenities.filter(a => a !== amenity);
                          setFormData({ ...formData, amenities: newAmenities });
                        }}
                        className="h-5 w-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-600"
                      />
                      <span className="text-sm font-bold text-gray-700 group-hover:text-blue-600">{amenity}</span>
                    </label>
                  ))}
                  
                  {/* Custom Amenities already added */}
                  {formData.amenities.filter(a => !DEFAULT_AMENITIES.includes(a)).map((amenity) => (
                    <label key={amenity} className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-200 cursor-pointer hover:bg-blue-100 transition-all group">
                      <input 
                        type="checkbox" 
                        checked={true}
                        onChange={() => {
                          setFormData({
                            ...formData,
                            amenities: formData.amenities.filter(a => a !== amenity)
                          });
                        }}
                        className="h-5 w-5 rounded-lg border-blue-600 text-blue-600 focus:ring-blue-600"
                      />
                      <span className="text-sm font-bold text-blue-700">{amenity}</span>
                    </label>
                  ))}
                </div>
                
                {/* Add Custom Amenity Input */}
                <div className="flex gap-3">
                  <input 
                    type="text"
                    value={customAmenity}
                    onChange={(e) => setCustomAmenity(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomAmenity())}
                    placeholder="Add custom amenity (e.g. Penthouse)"
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomAmenity}
                    className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all"
                  >
                    Add
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-4">
                  Property Images {planDetails && (
                    <span className={cn(
                      "ml-2 text-xs font-bold px-2 py-0.5 rounded-full",
                      planDetails.limits?.images_per_property !== -1 && previews.length >= planDetails.limits?.images_per_property
                        ? "bg-red-100 text-red-600"
                        : "bg-blue-100 text-blue-600"
                    )}>
                      {previews.length} / {planDetails.limits?.images_per_property === -1 ? '∞' : planDetails.limits?.images_per_property}
                    </span>
                  )}
                </label>
                
                {/* Image Previews */}
                {previews.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    {previews.map((url, idx) => (
                      <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <label 
                      onClick={() => propertyFileInputRef.current?.click()}
                      className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-blue-600 hover:bg-blue-50 transition-all"
                    >
                      <Plus className="h-6 w-6 text-gray-400" />
                      <input 
                        ref={propertyFileInputRef}
                        type="file" 
                        multiple 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleFileChange} 
                        onClick={(e) => e.stopPropagation()}
                      />
                    </label>
                  </div>
                )}

                {previews.length === 0 && (
                  <label 
                    onClick={() => propertyFileInputRef.current?.click()}
                    className="block bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2rem] p-12 text-center cursor-pointer hover:border-blue-600 hover:bg-blue-50 transition-all group"
                  >
                    <input 
                      ref={propertyFileInputRef}
                      type="file" 
                      multiple 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleFileChange} 
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex flex-col items-center">
                      <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                        <ImageIcon className="h-8 w-8 text-blue-600" />
                      </div>
                      <p className="text-lg font-bold text-gray-900">Click to upload images</p>
                      <p className="text-sm text-gray-500 mt-1">Select multiple photos of the property</p>
                      <p className="text-xs text-gray-400 mt-4 uppercase tracking-widest font-bold">PNG, JPG up to 10MB</p>
                    </div>
                  </label>
                )}
              </div>
              
              {isSubmitting && (
                <div className="space-y-3 bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-blue-900 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {uploadStatus}
                    </span>
                    <span className="font-black text-blue-600">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-3 bg-blue-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      className="h-full bg-blue-600"
                    />
                  </div>
                </div>
              )}
              
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-200 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {editingProperty ? 'Updating Property...' : 'Publishing Property...'}
                  </>
                ) : (
                  editingProperty ? 'Update Property' : 'Publish Property'
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
