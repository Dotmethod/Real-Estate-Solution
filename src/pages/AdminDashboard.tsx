import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Building2, Users, CreditCard, CheckCircle, XCircle, Clock, Eye, User, Edit2, Save, X, MapPin, Trash2, Plus, Image as ImageIcon, Loader2, Phone, AlertTriangle, Mail, ShieldCheck, Search } from 'lucide-react';
import { formatPrice, cn } from '../lib/utils';
import { motion } from 'motion/react';
import ProfileSection from '../components/ProfileSection';
import { supabase } from '../lib/supabase';
import { NIGERIA_STATES_LGA } from '../constants/nigeriaData';
import axios from 'axios';

interface UserProfile {
  id: string;
  full_name: string;
  email?: string;
  role: string;
  subscription_plan: string;
  status: string;
  phone?: string;
  address?: string;
  avatar_url?: string;
  bio?: string;
  company?: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  limits: {
    properties: number;
    images_per_property: number;
  };
  created_at?: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') as 'users' | 'properties' | 'stats' | 'profile' | 'plans' || 'users';
  const [activeTab, setActiveTab] = useState<'users' | 'properties' | 'stats' | 'profile' | 'plans' | 'settings'>(initialTab as any);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
  
  // SMTP Test State
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpTestEmail, setSmtpTestEmail] = useState('');
  const [smtpTestResult, setSmtpTestResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  // Plan Management State
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [planForm, setPlanForm] = useState<Partial<SubscriptionPlan>>({
    name: '',
    price: 0,
    features: [],
    limits: { properties: 5, images_per_property: 5 }
  });
  const [newFeature, setNewFeature] = useState('');
  
  // Property Management State
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<any | null>(null);
  const [propertyForm, setPropertyForm] = useState<any>({
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
    images: [],
    amenities: [] as string[],
    agency_fee: '',
    inspection_fee: '',
  });
  const [isSubmittingProperty, setIsSubmittingProperty] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [customAmenity, setCustomAmenity] = useState('');
  const [propertyStatusMessage, setPropertyStatusMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const [isFeaturedOnly, setIsFeaturedOnly] = useState(false);
  const [propertySearchTerm, setPropertySearchTerm] = useState('');
  const [adminStatusMessage, setAdminStatusMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  // User Details Modal State
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'warning'
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' = 'warning') => {
    setConfirmModal({ isOpen: true, title, message, onConfirm, type });
  };

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }

      // Check the profiles table directly for the most accurate role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profile?.role !== 'admin') {
        navigate('/dashboard');
      } else {
        setUser(session.user);
      }
    };

    checkAdmin();
  }, [navigate]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'profile' || tab === 'users' || tab === 'properties' || tab === 'stats' || tab === 'plans') {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'properties') {
      fetchProperties();
    } else if (activeTab === 'plans') {
      fetchPlans();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProperties = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          agent:profiles(full_name, email)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isProfileComplete = (user: UserProfile) => {
    return !!(user.full_name && user.phone && user.address && user.avatar_url && user.bio);
  };

  const updateUserStatus = async (id: string, status: string) => {
    try {
      const user = users.find(u => u.id === id);
      const oldStatus = user?.status;

      if (status === 'approved' && user && !isProfileComplete(user)) {
        setAdminStatusMessage({ 
          type: 'error', 
          text: `Cannot approve ${user.full_name} because their profile is incomplete (requires photo, phone, and address).` 
        });
        return;
      }

      const updateData: any = { status };
      
      // If approving and user has no plan or is on Starter Plan, assign the default Free Plan from DB if available
      if (status === 'approved' && (!user?.subscription_plan || user?.subscription_plan === 'Starter Plan')) {
        const freePlan = plans.find(p => p.price === 0);
        if (freePlan) {
          updateData.subscription_plan = freePlan.name;
        } else {
          updateData.subscription_plan = 'Free Plan';
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;

      // Send approval email if status changed to approved
      if (status === 'approved' && oldStatus !== 'approved' && user?.email) {
        try {
          await axios.post('/api/send-approval-email', {
            userId: id,
            email: user.email,
            name: user.full_name
          });
        } catch (emailError) {
          console.error('Failed to send approval email:', emailError);
        }
      }

      setUsers(users.map(u => u.id === id ? { ...u, ...updateData } : u));
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const handleEditClick = (user: UserProfile) => {
    // Get free plan name from current plans list as fallback
    const freePlanName = plans.find(p => p.price === 0)?.name || 'Free Plan';
    
    setEditingUserId(user.id);
    setEditForm({ 
      full_name: user.full_name,
      email: user.email,
      phone: user.phone || '',
      address: user.address || '',
      role: user.role, 
      subscription_plan: user.subscription_plan || freePlanName,
      status: user.status || 'pending'
    });
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const user = users.find(u => u.id === id);
      const oldStatus = user?.status;

      const updatedForm = { ...editForm };
      
      // If approving and user has no plan or is on Starter Plan, assign default Free Plan from DB if available
      if (updatedForm.status === 'approved' && (!updatedForm.subscription_plan || updatedForm.subscription_plan === 'Starter Plan')) {
        const freePlan = plans.find(p => p.price === 0);
        if (freePlan) {
          updatedForm.subscription_plan = freePlan.name;
        } else {
          updatedForm.subscription_plan = 'Free Plan';
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update(updatedForm)
        .eq('id', id);
      
      if (error) throw error;

      // Send approval email if status changed to approved
      if (updatedForm.status === 'approved' && oldStatus !== 'approved' && user?.email) {
        try {
          await axios.post('/api/send-approval-email', {
            userId: id,
            email: user.email,
            name: user.full_name
          });
        } catch (emailError) {
          console.error('Failed to send approval email:', emailError);
        }
      }

      setUsers(users.map(u => u.id === id ? { ...u, ...updatedForm } : u));
      setEditingUserId(null);
      setAdminStatusMessage({ type: 'success', text: 'User profile updated successfully.' });
    } catch (error) {
      console.error('Error saving user edits:', error);
      setAdminStatusMessage({ type: 'error', text: 'Failed to update user profile.' });
    }
  };

  const approveProperty = async (id: string) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: 'approved' })
        .eq('id', id);
      
      if (error) throw error;
      setProperties(properties.map(p => p.id === id ? { ...p, status: 'approved' } : p));
    } catch (error) {
      console.error('Error approving property:', error);
    }
  };

  const rejectProperty = async (id: string) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: 'rejected' })
        .eq('id', id);
      
      if (error) throw error;
      setProperties(properties.map(p => p.id === id ? { ...p, status: 'rejected' } : p));
    } catch (error) {
      console.error('Error rejecting property:', error);
    }
  };

  const toggleFeatured = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ is_featured: !currentStatus })
        .eq('id', id);
      
      if (error) throw error;
      setProperties(properties.map(p => p.id === id ? { ...p, is_featured: !currentStatus } : p));
    } catch (error) {
      console.error('Error toggling featured status:', error);
      setAdminStatusMessage({ 
        type: 'error', 
        text: 'Failed to update featured status. Please ensure the "is_featured" column exists in your properties table.' 
      });
    }
  };

  const deleteProperty = async (id: string) => {
    showConfirm(
      'Delete Property',
      'Are you sure you want to delete this property? It will be marked as deleted.',
      async () => {
        try {
          const { error } = await supabase
            .from('properties')
            .update({ status: 'deleted' })
            .eq('id', id);
          
          if (error) throw error;
          setProperties(properties.map(p => p.id === id ? { ...p, status: 'deleted' } : p));
          setAdminStatusMessage({ type: 'success', text: 'Property marked as deleted.' });
        } catch (error) {
          console.error('Error deleting property:', error);
          setAdminStatusMessage({ type: 'error', text: 'Failed to delete property.' });
        }
      }
    );
  };

  const permanentlyDeleteUser = async (id: string) => {
    showConfirm(
      'Permanently Delete User',
      'Are you sure you want to PERMANENTLY delete this user? This will remove them from the system entirely and cannot be undone.',
      async () => {
        try {
          const response = await axios.post('/api/admin/delete-user', {
            userId: id,
            adminId: user.id
          });
          
          if (response.data.success) {
            setUsers(users.filter(u => u.id !== id));
            setAdminStatusMessage({ type: 'success', text: 'User permanently deleted.' });
          }
        } catch (error: any) {
          console.error('Error deleting user:', error);
          setAdminStatusMessage({ type: 'error', text: error.response?.data?.error || 'Failed to delete user' });
        }
      },
      'danger'
    );
  };

  const permanentlyDeleteProperty = async (id: string) => {
    showConfirm(
      'Permanently Delete Property',
      'Are you sure you want to PERMANENTLY delete this property? This action cannot be undone.',
      async () => {
        try {
          const response = await axios.post('/api/admin/delete-property', {
            propertyId: id,
            adminId: user.id
          });
          
          if (response.data.success) {
            setProperties(properties.filter(p => p.id !== id));
            setAdminStatusMessage({ type: 'success', text: 'Property permanently deleted.' });
          }
        } catch (error: any) {
          console.error('Error deleting property:', error);
          setAdminStatusMessage({ type: 'error', text: error.response?.data?.error || 'Failed to delete property' });
        }
      },
      'danger'
    );
  };

  const fetchPlans = async () => {
    setIsLoading(true);
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

  const savePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPlan) {
        const { error } = await supabase
          .from('subscription_plans')
          .update(planForm)
          .eq('id', editingPlan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('subscription_plans')
          .insert([planForm]);
        if (error) throw error;
      }
      
      setShowPlanModal(false);
      setEditingPlan(null);
      setPlanForm({
        name: '',
        price: 0,
        features: [],
        limits: { properties: 5, images_per_property: 5 }
      });
      fetchPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
    }
  };

  const deletePlan = async (id: string) => {
    showConfirm(
      'Delete Plan',
      'Are you sure you want to delete this plan?',
      async () => {
        try {
          const { error } = await supabase
            .from('subscription_plans')
            .delete()
            .eq('id', id);
          if (error) throw error;
          fetchPlans();
          setAdminStatusMessage({ type: 'success', text: 'Plan deleted successfully.' });
        } catch (error) {
          console.error('Error deleting plan:', error);
          setAdminStatusMessage({ type: 'error', text: 'Failed to delete plan.' });
        }
      }
    );
  };

  const addFeature = () => {
    if (!newFeature.trim()) return;
    setPlanForm({
      ...planForm,
      features: [...(planForm.features || []), newFeature.trim()]
    });
    setNewFeature('');
  };

  const removeFeature = (index: number) => {
    setPlanForm({
      ...planForm,
      features: (planForm.features || []).filter((_, i) => i !== index)
    });
  };

  // Property Management Functions
  const handleCreateProperty = () => {
    setEditingProperty(null);
    setPropertyForm({
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
      images: [],
      amenities: [] as string[],
      agency_fee: '',
      inspection_fee: '',
    });
    setSelectedFiles([]);
    setPreviews([]);
    setPropertyStatusMessage(null);
    setShowPropertyModal(true);
  };

  const handleEditProperty = (property: any) => {
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
        lga = parts[0];
        state = parts[1];
        area = '';
      }
    }

    setPropertyForm({
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
      images: property.images || [],
      amenities: property.amenities || [],
      agency_fee: property.agency_fee?.toString() || '',
      inspection_fee: property.inspection_fee?.toString() || ''
    });
    setSelectedFiles([]);
    setPreviews([]);
    setPropertyStatusMessage(null);
    setShowPropertyModal(true);
  };

  const handlePropertyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    setSelectedFiles(prev => [...prev, ...files]);
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeExistingImage = (index: number) => {
    setPropertyForm({
      ...propertyForm,
      images: propertyForm.images.filter((_: any, i: number) => i !== index)
    });
  };

  const removeNewImage = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => {
      const newPreviews = prev.filter((_, i) => i !== index);
      URL.revokeObjectURL(prev[index]);
      return newPreviews;
    });
  };

  const saveProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingProperty(true);
    setPropertyStatusMessage(null);

    try {
      // 1. Upload new images if any
      const newImageUrls: string[] = [];
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `admin-uploads/${Date.now()}-${fileName}`;

          const { error: uploadError, data: uploadData } = await supabase.storage
            .from('property-images')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          if (uploadData) {
            const { data: { publicUrl } } = supabase.storage
              .from('property-images')
              .getPublicUrl(filePath);
            newImageUrls.push(publicUrl);
          }
        }
      }

      // 2. Combine existing and new images
      const finalImages = [...propertyForm.images, ...newImageUrls];

      if (finalImages.length === 0) {
        throw new Error('At least one image is required.');
      }

      // 3. Save property to database
      const finalLocation = `${propertyForm.location.trim()}, ${propertyForm.lga}, ${propertyForm.state}`;

      const propertyData: any = {
        title: propertyForm.title,
        price: parseFloat(propertyForm.price),
        location: finalLocation,
        type: propertyForm.type,
        listing_status: propertyForm.listing_status,
        description: propertyForm.description,
        beds: parseInt(propertyForm.beds) || 0,
        baths: parseInt(propertyForm.baths) || 0,
        sqft: parseInt(propertyForm.sqft) || 0,
        images: finalImages,
        amenities: propertyForm.amenities,
        agency_fee: propertyForm.agency_fee ? parseFloat(propertyForm.agency_fee) : null,
        inspection_fee: propertyForm.inspection_fee ? parseFloat(propertyForm.inspection_fee) : null,
        status: 'approved'
      };

      let result;
      if (editingProperty) {
        result = await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', editingProperty.id);
      } else {
        result = await supabase
          .from('properties')
          .insert([{ ...propertyData, agent_id: user.id }]);
      }

      let { error } = result;

      // Graceful fallback if columns are missing
      if (error && error.message?.includes('column') && 
         (error.message?.includes('agency_fee') || error.message?.includes('inspection_fee'))) {
        console.warn('Fee columns missing in database, retrying without them...');
        const { agency_fee, inspection_fee, ...safeData } = propertyData;
        
        if (editingProperty) {
          result = await supabase
            .from('properties')
            .update(safeData)
            .eq('id', editingProperty.id);
        } else {
          result = await supabase
            .from('properties')
            .insert([{ ...safeData, agent_id: user.id }]);
        }
        error = result.error;
      }

      if (error) throw error;

      setPropertyStatusMessage({ 
        type: 'success', 
        text: editingProperty ? 'Property updated successfully!' : 'Property listed successfully!' 
      });
      setTimeout(() => {
        setShowPropertyModal(false);
        setEditingProperty(null);
        fetchProperties();
      }, 1500);

    } catch (error: any) {
      console.error('Error saving property:', error);
      setPropertyStatusMessage({ type: 'error', text: error.message || 'Failed to update property' });
    } finally {
      setIsSubmittingProperty(false);
    }
  };

  const handleAddCustomAmenity = () => {
    if (!customAmenity.trim()) return;
    if (propertyForm.amenities.includes(customAmenity.trim())) {
      setCustomAmenity('');
      return;
    }
    setPropertyForm({
      ...propertyForm,
      amenities: [...(propertyForm.amenities || []), customAmenity.trim()]
    });
    setCustomAmenity('');
  };

  const testSmtp = async () => {
    if (!smtpTestEmail) {
      setSmtpTestResult({ type: 'error', message: 'Please enter a test email address.' });
      return;
    }

    setIsTestingSmtp(true);
    setSmtpTestResult(null);

    try {
      const response = await axios.post('/api/test-smtp', { email: smtpTestEmail });
      if (response.data.success) {
        setSmtpTestResult({ type: 'success', message: 'Test email sent successfully! Please check your inbox.' });
      }
    } catch (error: any) {
      console.error('SMTP Test Error:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Failed to send test email.';
      setSmtpTestResult({ type: 'error', message: `SMTP Error: ${errorMsg}` });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const DEFAULT_AMENITIES = ['Swimming Pool', 'Gym', 'Air Conditioning', 'Security', 'Parking', 'WiFi', 'Generator', 'Elevator', 'Furnished'];

  return (
    <div className="pt-24 pb-12 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Admin Platform</h1>
            <p className="text-gray-600">Manage agents, property owners, and listings.</p>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm min-w-max">
            <button
              onClick={() => setActiveTab('users')}
              className={cn(
                "px-4 md:px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
                activeTab === 'users' ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
              )}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab('properties')}
              className={cn(
                "px-4 md:px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
                activeTab === 'properties' ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
              )}
            >
              Properties
            </button>
            <button
              onClick={() => setActiveTab('plans')}
              className={cn(
                "px-4 md:px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
                activeTab === 'plans' ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
              )}
            >
              Plans
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={cn(
                "px-4 md:px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
                activeTab === 'stats' ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
              )}
            >
              Stats
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={cn(
                "px-4 md:px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
                activeTab === 'profile' ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
              )}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={cn(
                "px-4 md:px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
                activeTab === 'settings' ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
              )}
            >
              Settings
            </button>
          </div>
        </div>
      </div>

      {adminStatusMessage && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8"
        >
          <div className={cn(
            "p-4 rounded-2xl font-bold text-sm flex items-center justify-between",
            adminStatusMessage.type === 'success' ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          )}>
            <span>{adminStatusMessage.text}</span>
            <button onClick={() => setAdminStatusMessage(null)} className="p-1 hover:bg-black/5 rounded-full transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}

      {activeTab === 'properties' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 flex-1">
              <button
                onClick={() => setIsFeaturedOnly(!isFeaturedOnly)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all border shrink-0",
                  isFeaturedOnly ? "bg-yellow-50 border-yellow-200 text-yellow-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                )}
              >
                {isFeaturedOnly ? "Showing Featured Only" : "Show All Properties"}
              </button>
              
              <div className="flex-1 max-w-md w-full relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                <input
                  type="text"
                  placeholder="Search agent name or email..."
                  value={propertySearchTerm}
                  onChange={(e) => setPropertySearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all shadow-sm"
                />
              </div>
            </div>
            <button
              onClick={handleCreateProperty}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100 shrink-0"
            >
              <Plus className="h-5 w-5" /> List New Property
            </button>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white md:rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
          >
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-wider">User Details</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-wider">Plan</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading users...</td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No users found.</td>
                    </tr>
                  ) : users.map((user) => (
                    <tr 
                      key={user.id} 
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest('button') || target.closest('select') || target.closest('input')) return;
                        setSelectedUser(user);
                        setShowUserDetailsModal(true);
                      }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="h-14 w-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-bold overflow-hidden border border-blue-100 shadow-sm shrink-0">
                            {user.avatar_url ? (
                              <img 
                                src={user.avatar_url} 
                                alt={user.full_name} 
                                className="h-full w-full object-cover" 
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              (user.full_name || 'U').charAt(0)
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            {editingUserId === user.id ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={editForm.full_name}
                                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                  className="text-sm font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded px-2 py-1 w-full focus:outline-none focus:border-blue-600"
                                  placeholder="Full Name"
                                />
                                <div className="flex gap-2">
                                  <input
                                    type="email"
                                    value={editForm.email}
                                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-2 py-1 flex-1 focus:outline-none focus:border-blue-600"
                                    placeholder="Email"
                                  />
                                  <select
                                    value={editForm.role}
                                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                    className="text-xs font-bold bg-gray-50 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-blue-600"
                                  >
                                    <option value="owner">Owner</option>
                                    <option value="agent">Agent</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p className="text-sm font-black text-gray-900 truncate">{user.full_name || 'Anonymous'}</p>
                                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black uppercase rounded-md border border-blue-100">
                                    {user.role}
                                  </span>
                                  {(isProfileComplete(user) && (user.role === 'agent' || user.role === 'owner') && (user.status === 'pending' || user.status === 'review_requested')) && (
                                    <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] font-black uppercase rounded-md border border-green-100 flex items-center gap-1">
                                      <CheckCircle className="h-2 w-2" /> Profile Completed
                                    </span>
                                  )}
                                  {!isProfileComplete(user) && (user.role === 'agent' || user.role === 'owner') && (
                                    <span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-[10px] font-black uppercase rounded-md border border-orange-100 flex items-center gap-1">
                                      <AlertTriangle className="h-2 w-2" /> Incomplete
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 flex items-center gap-1 mb-1.5">
                                  <Mail className="h-3 w-3" /> {user.email || 'No email'}
                                </p>
                              </>
                            )}
                            
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              {editingUserId === user.id ? (
                                <>
                                  <div className="flex items-center gap-1 flex-1 min-w-[120px]">
                                    <Phone className="h-2.5 w-2.5 text-blue-600" />
                                    <input
                                      type="text"
                                      value={editForm.phone}
                                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                      className="text-[10px] text-blue-600 font-bold bg-gray-50 border border-gray-200 rounded px-1 py-0.5 w-full focus:outline-none focus:border-blue-600"
                                      placeholder="Phone"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1 flex-1 min-w-[120px]">
                                    <MapPin className="h-2.5 w-2.5 text-gray-400" />
                                    <input
                                      type="text"
                                      value={editForm.address}
                                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                      className="text-[10px] text-gray-400 bg-gray-50 border border-gray-200 rounded px-1 py-0.5 w-full focus:outline-none focus:border-blue-600"
                                      placeholder="Address"
                                    />
                                  </div>
                                </>
                              ) : (
                                <>
                                  {user.phone && (
                                    <p className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                                      <Phone className="h-2.5 w-2.5" /> {user.phone}
                                    </p>
                                  )}
                                  {user.address && (
                                    <p className="text-[10px] text-gray-400 flex items-center gap-1 max-w-[200px] truncate">
                                      <MapPin className="h-2.5 w-2.5 shrink-0" /> {user.address}
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {editingUserId === user.id ? (
                          <select
                            value={editForm.subscription_plan}
                            onChange={(e) => setEditForm({ ...editForm, subscription_plan: e.target.value })}
                            className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-600"
                          >
                            {plans.map(plan => (
                              <option key={plan.id} value={plan.name}>{plan.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-sm text-gray-600 capitalize">{user.subscription_plan || 'Starter Plan'}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingUserId === user.id ? (
                          <select
                            value={editForm.status}
                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                            className="text-xs font-bold bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-600"
                          >
                            <option value="pending">Pending</option>
                            <option value="review_requested">Review Requested</option>
                            <option value="approved">Approved</option>
                            <option value="suspended">Suspended</option>
                          </select>
                        ) : (
                          <span className={cn(
                            "px-3 py-1 rounded-full text-xs font-bold capitalize",
                            user.status === 'approved' ? "bg-green-100 text-green-700" :
                            user.status === 'pending' ? "bg-yellow-100 text-yellow-700" :
                            user.status === 'review_requested' ? "bg-blue-100 text-blue-700" :
                            user.status === 'suspended' ? "bg-red-100 text-red-700" :
                            "bg-gray-100 text-gray-700"
                          )}>
                            {(user.status || 'pending').replace('_', ' ')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {editingUserId === user.id ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(user.id)}
                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                title="Save"
                              >
                                <Save className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setEditingUserId(null)}
                                className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowUserDetailsModal(true);
                                }}
                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {(user.status === 'pending' || user.status === 'review_requested') && (
                                <>
                                  <button
                                    onClick={() => updateUserStatus(user.id, 'approved')}
                                    className={cn(
                                      "p-2 rounded-lg transition-colors",
                                      isProfileComplete(user) || (user.role !== 'agent' && user.role !== 'owner')
                                        ? "bg-green-50 text-green-600 hover:bg-green-100"
                                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    )}
                                    title={isProfileComplete(user) || (user.role !== 'agent' && user.role !== 'owner') ? "Approve" : "Profile Incomplete - Cannot Approve"}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => updateUserStatus(user.id, 'rejected')}
                                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                    title="Reject"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleEditClick(user)}
                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              {user.status === 'approved' && (
                                <button
                                  onClick={() => updateUserStatus(user.id, 'suspended')}
                                  className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                  title="Suspend User"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              )}
                              {user.status === 'suspended' && (
                                <button
                                  onClick={() => updateUserStatus(user.id, 'approved')}
                                  className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                                  title="Activate User"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => permanentlyDeleteUser(user.id)}
                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                title="Permanently Delete User"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
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
                <div className="p-8 text-center text-gray-500">Loading users...</div>
              ) : users.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No users found.</div>
              ) : users.map((user) => (
                <div 
                  key={user.id} 
                  className="p-4 space-y-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('button') || target.closest('select') || target.closest('input')) return;
                    setSelectedUser(user);
                    setShowUserDetailsModal(true);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold overflow-hidden shrink-0">
                        {user.avatar_url ? (
                          <img 
                            src={user.avatar_url} 
                            alt={user.full_name} 
                            className="h-full w-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          (user.full_name || 'U').charAt(0)
                        )}
                      </div>
                      <div>
                        {editingUserId === user.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editForm.full_name}
                              onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                              className="w-full text-sm font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-blue-600"
                              placeholder="Full Name"
                            />
                            <input
                              type="email"
                              value={editForm.email}
                              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                              className="w-full text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-blue-600"
                              placeholder="Email"
                            />
                          </div>
                        ) : (
                          <>
                            <p className="font-bold text-gray-900">{user.full_name || 'Anonymous'}</p>
                            <p className="text-xs text-gray-500 mb-1">{user.email || 'No email'}</p>
                            <div className="flex flex-wrap gap-1">
                              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black uppercase rounded border border-blue-100">
                                {user.role}
                              </span>
                              {isProfileComplete(user) && (user.role === 'agent' || user.role === 'owner') && (user.status === 'pending' || user.status === 'review_requested') && (
                                <span className="px-1.5 py-0.5 bg-green-50 text-green-600 text-[8px] font-black uppercase rounded border border-green-100 flex items-center gap-0.5">
                                  <CheckCircle className="h-1.5 w-1.5" /> Ready
                                </span>
                              )}
                              {!isProfileComplete(user) && (user.role === 'agent' || user.role === 'owner') && (
                                <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 text-[8px] font-black uppercase rounded border border-orange-100 flex items-center gap-0.5">
                                  <AlertTriangle className="h-1.5 w-1.5" /> Incomplete
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-black uppercase",
                      user.status === 'approved' ? "bg-green-100 text-green-700" :
                      user.status === 'pending' ? "bg-yellow-100 text-yellow-700" :
                      user.status === 'suspended' ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-700"
                    )}>
                      {user.status || 'pending'}
                    </span>
                  </div>

                  {editingUserId === user.id && (
                    <div className="grid grid-cols-1 gap-3 bg-blue-50/50 p-3 rounded-2xl border border-blue-100">
                      <div>
                        <p className="text-[10px] text-blue-600 uppercase font-bold mb-1">Phone</p>
                        <input
                          type="text"
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          className="w-full text-xs font-bold bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-600"
                          placeholder="Phone Number"
                        />
                      </div>
                      <div>
                        <p className="text-[10px] text-blue-600 uppercase font-bold mb-1">Address</p>
                        <input
                          type="text"
                          value={editForm.address}
                          onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                          className="w-full text-xs font-bold bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-600"
                          placeholder="Address"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-2xl">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Role</p>
                      {editingUserId === user.id ? (
                        <select
                          value={editForm.role}
                          onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                          className="w-full text-xs font-bold bg-white border border-gray-200 rounded-lg px-2 py-1"
                        >
                          <option value="owner">Owner</option>
                          <option value="agent">Agent</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">{user.role}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Plan</p>
                      {editingUserId === user.id ? (
                        <select
                          value={editForm.subscription_plan}
                          onChange={(e) => setEditForm({ ...editForm, subscription_plan: e.target.value })}
                          className="w-full text-xs font-bold bg-white border border-gray-200 rounded-lg px-2 py-1"
                        >
                          {plans.map(plan => (
                            <option key={plan.id} value={plan.name}>{plan.name}</option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-xs font-bold text-gray-700">{user.subscription_plan || 'Starter Plan'}</p>
                      )}
                    </div>
                  </div>

                  {editingUserId === user.id && (
                    <div className="space-y-2">
                      <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Status</p>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        className="w-full text-xs font-bold bg-white border border-gray-200 rounded-lg px-2 py-1"
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    {editingUserId === user.id ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(user.id)}
                          className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                        >
                          <Save className="h-3 w-3" /> Save Changes
                        </button>
                        <button
                          onClick={() => setEditingUserId(null)}
                          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowUserDetailsModal(true);
                          }}
                          className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                        >
                          <Eye className="h-3 w-3" /> View Details
                        </button>
                        <button
                          onClick={() => handleEditClick(user)}
                          className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                        >
                          <Edit2 className="h-3 w-3" /> Edit User
                        </button>
                        {user.status === 'pending' && (
                          <button
                            onClick={() => updateUserStatus(user.id, 'approved')}
                            className="p-2 bg-green-50 text-green-600 rounded-xl"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        {(user.status === 'approved' || user.status === 'pending') && (
                          <button
                            onClick={() => updateUserStatus(user.id, 'suspended')}
                            className="p-2 bg-red-50 text-red-600 rounded-xl"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                        {user.status === 'suspended' && (
                          <button
                            onClick={() => updateUserStatus(user.id, 'approved')}
                            className="p-2 bg-green-50 text-green-600 rounded-xl"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => permanentlyDeleteUser(user.id)}
                          className="p-2 bg-red-50 text-red-600 rounded-xl"
                          title="Permanently Delete User"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'properties' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {properties
              .filter(p => !isFeaturedOnly || p.is_featured)
              .filter(p => {
                if (!propertySearchTerm) return true;
                const search = propertySearchTerm.toLowerCase();
                const agentName = p.agent?.full_name?.toLowerCase() || '';
                const agentEmail = p.agent?.email?.toLowerCase() || '';
                return agentName.includes(search) || agentEmail.includes(search);
              })
              .map((property) => (
              <div key={property.id} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm flex flex-col">
                <div className="relative h-48">
                  <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover" />
                  <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold uppercase",
                      property.status === 'approved' ? "bg-green-600 text-white" : 
                      property.status === 'pending' ? "bg-yellow-600 text-white" :
                      property.status === 'deleted' ? "bg-gray-600 text-white" :
                      "bg-red-600 text-white"
                    )}>
                      {property.status}
                    </span>
                    {property.is_featured && (
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-yellow-400 text-yellow-900 flex items-center gap-1">
                        Featured
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  {property.agent && (
                    <div className="flex items-center gap-2 mb-3 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="h-6 w-6 bg-blue-100 rounded-lg flex items-center justify-center text-[10px] font-black text-blue-600 shrink-0">
                        {(property.agent.full_name || 'A').charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-gray-900 truncate uppercase tracking-wider">{property.agent.full_name}</p>
                        <p className="text-[9px] text-gray-500 truncate leading-none">{property.agent.email}</p>
                      </div>
                    </div>
                  )}
                  <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">{property.title}</h3>
                  <p className="text-blue-600 font-bold mb-2">{formatPrice(property.price)}</p>
                  <p className="text-xs text-gray-500 mb-4 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {property.location}
                  </p>
                  
            <div className="mt-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={() => handleEditProperty(property)}
                      className="py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all text-xs flex items-center justify-center gap-2 sm:col-span-2"
                    >
                      <Edit2 className="h-3.5 w-3.5" /> Edit Property Details
                    </button>
                    <button
                      onClick={() => toggleFeatured(property.id, property.is_featured)}
                      className={cn(
                        "py-2.5 rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-2 sm:col-span-2 border",
                        property.is_featured 
                          ? "bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100" 
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                      )}
                    >
                      {property.is_featured ? "Remove from Featured" : "Mark as Featured"}
                    </button>
                    {property.status !== 'approved' && (
                      <button
                        onClick={() => approveProperty(property.id)}
                        className="py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all text-xs flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> Approve
                      </button>
                    )}
                    {property.status !== 'rejected' && (
                      <button
                        onClick={() => rejectProperty(property.id)}
                        className="py-2.5 bg-yellow-600 text-white rounded-xl font-bold hover:bg-yellow-700 transition-all text-xs flex items-center justify-center gap-2"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </button>
                    )}
                    {property.status !== 'deleted' && (
                      <button
                        onClick={() => deleteProperty(property.id)}
                        className="py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all text-xs flex items-center justify-center gap-2 sm:col-span-2"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete Property
                      </button>
                    )}
                    <button
                      onClick={() => permanentlyDeleteProperty(property.id)}
                      className="py-2.5 bg-red-900 text-white rounded-xl font-bold hover:bg-red-950 transition-all text-xs flex items-center justify-center gap-2 sm:col-span-2"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> PERMANENTLY Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'plans' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Subscription Plans</h2>
              <button
                onClick={() => {
                  setEditingPlan(null);
                  setPlanForm({
                    name: '',
                    price: 0,
                    features: [],
                    limits: { properties: 5, images_per_property: 5 }
                  });
                  setShowPlanModal(true);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
              >
                <CreditCard className="h-4 w-4" /> Create New Plan
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {plans.map((plan) => (
                <div key={plan.id} className={cn(
                  "bg-white rounded-3xl border p-8 shadow-sm flex flex-col relative overflow-hidden",
                  plan.price === 0 ? "border-green-200 bg-green-50/10" : "border-gray-100"
                )}>
                  {plan.price === 0 && (
                    <div className="absolute top-0 right-0 bg-green-600 text-white px-4 py-1 rounded-bl-xl text-[10px] font-black uppercase tracking-wider">
                      Default Plan
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                      <p className="text-3xl font-bold text-blue-600 mt-2">
                        {formatPrice(plan.price)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingPlan(plan);
                          setPlanForm(plan);
                          setShowPlanModal(true);
                        }}
                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deletePlan(plan.id)}
                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="text-sm font-bold text-gray-900 uppercase tracking-wider">Limits</div>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>• {plan.limits.properties === -1 ? 'Unlimited' : plan.limits.properties} Properties</li>
                      <li>• {plan.limits.images_per_property === -1 ? 'Unlimited' : plan.limits.images_per_property} Images per property</li>
                    </ul>

                    <div className="text-sm font-bold text-gray-900 uppercase tracking-wider">Features</div>
                    <ul className="space-y-2">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { label: 'Total Users', value: users.length.toString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Active Listings', value: properties.filter(p => p.status === 'approved').length.toString(), icon: Building2, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Total Properties', value: properties.length.toString(), icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Pending Approvals', value: (users.filter(u => u.status === 'pending').length + properties.filter(p => p.status === 'pending').length).toString(), icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' }
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm"
              >
                <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center mb-6", stat.bg)}>
                  <stat.icon className={cn("h-6 w-6", stat.color)} />
                </div>
                <p className="text-sm text-gray-500 font-medium mb-1">{stat.label}</p>
                <p className="text-3xl font-black text-gray-900">{stat.value}</p>
              </motion.div>
            ))}
          </div>
        )}

        {activeTab === 'profile' && user && (
          <div className="max-w-3xl mx-auto">
            <ProfileSection userId={user.id} />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-3xl mx-auto space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Email Configuration (SMTP)</h2>
                  <p className="text-sm text-gray-500">Test your email delivery settings.</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <p className="text-xs text-blue-800 leading-relaxed">
                    <strong>Note:</strong> SMTP settings are managed via the environment variables (SMTP_HOST, SMTP_PORT, etc.). Use this tool to verify if the current configuration is working.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Test Recipient Email</label>
                    <div className="flex gap-3">
                      <input
                        type="email"
                        value={smtpTestEmail}
                        onChange={(e) => setSmtpTestEmail(e.target.value)}
                        className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="your-email@example.com"
                      />
                      <button
                        onClick={testSmtp}
                        disabled={isTestingSmtp}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {isTestingSmtp ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Testing...
                          </>
                        ) : (
                          'Send Test Email'
                        )}
                      </button>
                    </div>
                  </div>

                  {smtpTestResult && (
                    <div className={cn(
                      "p-4 rounded-xl text-sm font-bold",
                      smtpTestResult.type === 'success' ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                    )}>
                      {smtpTestResult.message}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">System Information</h2>
                  <p className="text-sm text-gray-500">Overview of system status and configuration.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">App URL</p>
                  <p className="text-sm font-bold text-gray-900 truncate">{process.env.APP_URL || window.location.origin}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Environment</p>
                  <p className="text-sm font-bold text-gray-900 uppercase">{process.env.NODE_ENV || 'development'}</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {showPlanModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingPlan ? 'Edit Plan' : 'Create New Plan'}
              </h2>
              <button onClick={() => setShowPlanModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={savePlan} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Plan Name</label>
                  <input
                    type="text"
                    required
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Professional"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Price</label>
                  <input
                    type="number"
                    required
                    value={planForm.price}
                    onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Plan Limits</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Property Limit</label>
                    <input
                      type="number"
                      required
                      value={planForm.limits?.properties}
                      onChange={(e) => setPlanForm({ 
                        ...planForm, 
                        limits: { ...planForm.limits!, properties: Number(e.target.value) } 
                      })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <p className="text-xs text-gray-500">Use -1 for unlimited</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Images per Property</label>
                    <input
                      type="number"
                      required
                      value={planForm.limits?.images_per_property}
                      onChange={(e) => setPlanForm({ 
                        ...planForm, 
                        limits: { ...planForm.limits!, images_per_property: Number(e.target.value) } 
                      })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <p className="text-xs text-gray-500">Use -1 for unlimited</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Features</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Add a feature..."
                  />
                  <button
                    type="button"
                    onClick={addFeature}
                    className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {planForm.features?.map((feature, idx) => (
                    <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm flex items-center gap-2">
                      {feature}
                      <button type="button" onClick={() => removeFeature(idx)} className="hover:text-blue-800">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
              >
                {editingPlan ? 'Update Plan' : 'Create Plan'}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* User Details Modal */}
      {showUserDetailsModal && selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
          >
            <button 
              onClick={() => setShowUserDetailsModal(false)} 
              className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-6 w-6 text-gray-400" />
            </button>

            <div className="flex flex-col md:flex-row gap-8">
              <div className="shrink-0">
                <div className="h-48 w-48 bg-blue-50 rounded-[2rem] overflow-hidden border-4 border-white shadow-xl">
                  {selectedUser.avatar_url ? (
                    <img 
                      src={selectedUser.avatar_url} 
                      alt={selectedUser.full_name} 
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-4xl font-black text-blue-600">
                      {(selectedUser.full_name || 'U').charAt(0)}
                    </div>
                  )}
                </div>
                <div className="mt-6 space-y-2">
                  <span className={cn(
                    "block w-full text-center py-2 rounded-xl text-xs font-black uppercase tracking-wider",
                    selectedUser.status === 'approved' ? "bg-green-100 text-green-700" :
                    selectedUser.status === 'pending' ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-700"
                  )}>
                    {selectedUser.status || 'pending'}
                  </span>
                  <span className="block w-full text-center py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-black uppercase tracking-wider">
                    {selectedUser.role}
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-6">
                <div>
                  <h2 className="text-3xl font-black text-gray-900 mb-1">{selectedUser.full_name || 'Anonymous'}</h2>
                  <p className="text-blue-600 font-bold flex items-center gap-2">
                    <Mail className="h-4 w-4" /> {selectedUser.email || 'No email provided'}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Phone Number</p>
                    <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <Phone className="h-4 w-4 text-blue-600" /> {selectedUser.phone || 'Not provided'}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Office/Home Address</p>
                    <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" /> {selectedUser.address || 'Not provided'}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Subscription Plan</p>
                    <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-purple-600" /> {selectedUser.subscription_plan || 'Starter Plan'}
                    </p>
                  </div>
                  {selectedUser.company && (
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Company/Agency</p>
                      <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-orange-600" /> {selectedUser.company}
                      </p>
                    </div>
                  )}
                  {selectedUser.bio && (
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Bio</p>
                      <p className="text-sm text-gray-600 leading-relaxed italic">
                        "{selectedUser.bio}"
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  {selectedUser.status === 'pending' && (
                    <>
                      <button
                        onClick={() => {
                          updateUserStatus(selectedUser.id, 'approved');
                          setShowUserDetailsModal(false);
                        }}
                        className="flex-1 py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="h-5 w-5" /> Approve Agent
                      </button>
                      <button
                        onClick={() => {
                          updateUserStatus(selectedUser.id, 'rejected');
                          setShowUserDetailsModal(false);
                        }}
                        className="flex-1 py-4 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                      >
                        <XCircle className="h-5 w-5" /> Reject
                      </button>
                    </>
                  )}
                  {selectedUser.status === 'approved' && (
                    <button
                      onClick={() => {
                        updateUserStatus(selectedUser.id, 'suspended');
                        setShowUserDetailsModal(false);
                      }}
                      className="flex-1 py-4 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                    >
                      <XCircle className="h-5 w-5" /> Suspend Account
                    </button>
                  )}
                  {selectedUser.status === 'suspended' && (
                    <button
                      onClick={() => {
                        updateUserStatus(selectedUser.id, 'approved');
                        setShowUserDetailsModal(false);
                      }}
                      className="flex-1 py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="h-5 w-5" /> Reactivate Account
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Property Edit Modal */}
      {showPropertyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-gray-900">{editingProperty ? 'Edit Property Details' : 'List New Property'}</h2>
              <button 
                onClick={() => setShowPropertyModal(false)} 
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            
            <form className="space-y-8" onSubmit={saveProperty}>
              {propertyStatusMessage && (
                <div className={cn(
                  "p-4 rounded-xl text-sm font-bold",
                  propertyStatusMessage.type === 'success' ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                )}>
                  {propertyStatusMessage.text}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">Property Title</label>
                  <input
                    type="text"
                    required
                    value={propertyForm.title}
                    onChange={(e) => setPropertyForm({ ...propertyForm, title: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-600 transition-all"
                    placeholder="e.g. Modern Villa with Pool"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">Price ($)</label>
                  <input
                    type="number"
                    required
                    value={propertyForm.price}
                    onChange={(e) => setPropertyForm({ ...propertyForm, price: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-600 transition-all"
                    placeholder="e.g. 500000"
                  />
                </div>
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-sm font-bold text-gray-700 ml-1">State</label>
                    <select
                      value={propertyForm.state}
                      onChange={(e) => setPropertyForm({ ...propertyForm, state: e.target.value, lga: '' })}
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-600 transition-all"
                    >
                      <option value="">Select State</option>
                      {Object.keys(NIGERIA_STATES_LGA).sort().map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-gray-700 ml-1">LGA</label>
                    <select
                      value={propertyForm.lga}
                      onChange={(e) => setPropertyForm({ ...propertyForm, lga: e.target.value })}
                      disabled={!propertyForm.state}
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-600 transition-all disabled:opacity-50"
                    >
                      <option value="">Select LGA</option>
                      {propertyForm.state && NIGERIA_STATES_LGA[propertyForm.state]?.sort().map(lga => (
                        <option key={lga} value={lga}>{lga}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-gray-700 ml-1">Area / Street Address</label>
                    <input
                      type="text"
                      required
                      value={propertyForm.location}
                      onChange={(e) => setPropertyForm({ ...propertyForm, location: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-600 transition-all"
                      placeholder="e.g. 123 Main Street"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">Property Type</label>
                  <select
                    value={propertyForm.type}
                    onChange={(e) => setPropertyForm({ ...propertyForm, type: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-600 transition-all"
                  >
                    <option value="apartment">Apartment</option>
                    <option value="house">House</option>
                    <option value="land">Land</option>
                    <option value="commercial">Commercial</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">Listing Status</label>
                  <select
                    value={propertyForm.listing_status}
                    onChange={(e) => setPropertyForm({ ...propertyForm, listing_status: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-600 transition-all"
                  >
                    <option value="sale">For Sale</option>
                    <option value="rent">For Rent</option>
                    <option value="lease">For Lease</option>
                    <option value="short-let">Short Let</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">Agency Fee (₦) - Optional</label>
                  <input
                    type="number"
                    value={propertyForm.agency_fee}
                    onChange={(e) => setPropertyForm({ ...propertyForm, agency_fee: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-600 transition-all"
                    placeholder="e.g. 50000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">Inspection Fee (₦) - Optional</label>
                  <input
                    type="number"
                    value={propertyForm.inspection_fee}
                    onChange={(e) => setPropertyForm({ ...propertyForm, inspection_fee: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-600 transition-all"
                    placeholder="e.g. 5000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Description</label>
                <textarea
                  required
                  rows={4}
                  value={propertyForm.description}
                  onChange={(e) => setPropertyForm({ ...propertyForm, description: e.target.value })}
                  className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-600 transition-all resize-none"
                  placeholder="Describe the property..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">Beds</label>
                  <input
                    type="number"
                    value={propertyForm.beds}
                    onChange={(e) => setPropertyForm({ ...propertyForm, beds: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-600 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">Baths</label>
                  <input
                    type="number"
                    value={propertyForm.baths}
                    onChange={(e) => setPropertyForm({ ...propertyForm, baths: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-600 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">Sqft</label>
                  <input
                    type="number"
                    value={propertyForm.sqft}
                    onChange={(e) => setPropertyForm({ ...propertyForm, sqft: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-600 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-bold text-gray-700 ml-1 uppercase tracking-widest">Amenities</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  {DEFAULT_AMENITIES.map((amenity) => (
                    <label key={amenity} className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 cursor-pointer hover:bg-blue-50 transition-all group">
                      <input 
                        type="checkbox" 
                        checked={propertyForm.amenities?.includes(amenity)}
                        onChange={(e) => {
                          const currentAmenities = propertyForm.amenities || [];
                          const newAmenities = e.target.checked 
                            ? [...currentAmenities, amenity]
                            : currentAmenities.filter((a: string) => a !== amenity);
                          setPropertyForm({ ...propertyForm, amenities: newAmenities });
                        }}
                        className="h-5 w-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-600"
                      />
                      <span className="text-sm font-bold text-gray-700 group-hover:text-blue-600">{amenity}</span>
                    </label>
                  ))}
                  
                  {/* Custom Amenities already added */}
                  {(propertyForm.amenities || []).filter((a: string) => !DEFAULT_AMENITIES.includes(a)).map((amenity: string) => (
                    <label key={amenity} className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-200 cursor-pointer hover:bg-blue-100 transition-all group">
                      <input 
                        type="checkbox" 
                        checked={true}
                        onChange={() => {
                          setPropertyForm({
                            ...propertyForm,
                            amenities: propertyForm.amenities.filter((a: string) => a !== amenity)
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
                    className="flex-1 px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-600 transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomAmenity}
                    className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-bold text-gray-700 ml-1">Property Images</label>
                
                {/* Existing Images */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {propertyForm.images.map((url: string, index: number) => (
                    <div key={`existing-${index}`} className="relative group aspect-square rounded-2xl overflow-hidden border-2 border-gray-100">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(index)}
                        className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  
                  {/* New Previews */}
                  {previews.map((url, index) => (
                    <div key={`new-${index}`} className="relative group aspect-square rounded-2xl overflow-hidden border-2 border-blue-200">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">NEW</div>
                      <button
                        type="button"
                        onClick={() => removeNewImage(index)}
                        className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                  <label className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group">
                    <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-100 transition-all">
                      <Plus className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />
                    </div>
                    <span className="text-xs font-bold text-gray-400 group-hover:text-blue-600">Add More</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handlePropertyFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPropertyModal(false)}
                  className="flex-1 px-8 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProperty}
                  className="flex-1 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingProperty ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {editingProperty ? 'Saving Changes...' : 'Listing Property...'}
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      {editingProperty ? 'Save Changes' : 'List Property'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className={cn(
                "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0",
                confirmModal.type === 'danger' ? "bg-red-100" : "bg-yellow-100"
              )}>
                <AlertTriangle className={cn(
                  "h-6 w-6",
                  confirmModal.type === 'danger' ? "text-red-600" : "text-yellow-600"
                )} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{confirmModal.title}</h2>
                <p className="text-sm text-gray-500">{confirmModal.message}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal({ ...confirmModal, isOpen: false });
                }}
                className={cn(
                  "flex-1 px-6 py-3 text-white rounded-xl font-bold transition-all shadow-lg",
                  confirmModal.type === 'danger' ? "bg-red-600 hover:bg-red-700 shadow-red-200" : "bg-yellow-600 hover:bg-yellow-700 shadow-yellow-200"
                )}
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
