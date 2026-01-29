import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { 
  Building2, MapPin, Tag, FileText, CheckCircle, AlertCircle, 
  Edit3, Save, Camera, Plus, Trash2, Phone, Mail, 
  Globe, Clock, Package, Upload, Verified
} from 'lucide-react';
import { VendorResponse, VendorCategoryResponse, VendorCategory, vendorApi } from '../../lib/api';

// --- Types ---
interface ServicePackage {
  id?: number;
  name: string;
  description: string;
  price: number;
  duration?: string;
  features: string[];
}

interface BusinessHours {
  day: string;
  open: string;
  close: string;
  closed: boolean;
}

interface VendorProfileFormData {
  business_name: string;
  category: VendorCategory;
  location: string;
  description: string;
  phone?: string;
  email?: string;
  website?: string;
  street_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  years_in_business?: number;
  team_size?: number;
  service_area?: string;
  business_photos?: string | string[];
  portfolio_photos?: string | string[];
  service_packages: ServicePackage[];
  business_hours: BusinessHours[];
}

// --- Helper Components ---

const FormSection = ({ title, children, className = "" }: { title?: string, children: React.ReactNode, className?: string }) => (
  <div className={`space-y-6 ${className}`}>
    {title && <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{title}</h3>}
    {children}
  </div>
);

const InputField = ({ 
  label, error, register, name, placeholder, type = "text", required = false, disabled = false, className = "" 
}: { 
  label: string, error?: string, register: any, name: string, placeholder?: string, type?: string, required?: boolean, disabled?: boolean, className?: string 
}) => (
  <div className={`space-y-2 ${className}`}>
    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
      {label} {required && '*'}
    </label>
    <input
      type={type}
      disabled={disabled}
      {...register(name, { required: required ? 'Required' : false })}
      className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-rose-500 outline-none transition-all disabled:opacity-60"
      placeholder={placeholder}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

const TextAreaField = ({ 
  label, error, register, name, placeholder, required = false, rows = 4 
}: { 
  label: string, error?: string, register: any, name: string, placeholder?: string, required?: boolean, rows?: number 
}) => (
  <div className="space-y-2">
    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
      {label} {required && '*'}
    </label>
    <textarea
      rows={rows}
      {...register(name, { required: required ? 'Required' : false })}
      className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-rose-500 outline-none transition-all resize-none"
      placeholder={placeholder}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

const ViewField = ({ label, value, icon: Icon }: { label?: string, value: string | number | undefined, icon?: any }) => (
  <div className="space-y-1">
    {label && <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>}
    <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl text-gray-800 dark:text-gray-200 font-medium">
      {Icon && <Icon className="w-4 h-4 text-gray-400" />}
      {value || <span className="text-gray-400 italic">Not set</span>}
    </div>
  </div>
);

const getImageUrl = (photo: string) => {
  if (photo.startsWith('http://') || photo.startsWith('https://') || photo.startsWith('data:')) {
    return photo;
  }
  return photo;
};

// --- Sub-components for Tabs ---

const BasicInfoTab = ({ editing, register, errors, categories, vendor }: any) => {
  if (!editing) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
        {/* Custom ViewField for Business Name to include Verified icon */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Business Name</label>
          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl text-gray-800 dark:text-gray-200 font-medium">
            <Building2 className="w-4 h-4 text-gray-400" />
            <span>{vendor?.business_name || <span className="text-gray-400 italic">Not set</span>}</span>
            {vendor?.is_verified && <Verified className="w-4 h-4 text-blue-500" />}
          </div>
        </div>
        
        <ViewField label="Category" value={categories.find((c: any) => c.value === vendor?.category)?.label || vendor?.category} icon={Tag} />
        <div className="md:col-span-2">
           <ViewField label="Description" value={vendor?.description} icon={FileText} />
        </div>
      </div>
    );
  }
  return (
    <FormSection>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField label="Business Name" name="business_name" register={register} error={errors.business_name?.message} required />
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Category *</label>
          <select {...register('category', { required: 'Required' })} className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-rose-500 outline-none">
            <option value="">Select Category</option>
            {categories.map((c: any) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>
      <TextAreaField label="Description" name="description" register={register} error={errors.description?.message} required />
    </FormSection>
  );
};

const ContactTab = ({ editing, register, vendor }: any) => {
  if (!editing) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
        <ViewField label="Phone" value={vendor?.phone} icon={Phone} />
        <ViewField label="Email" value={vendor?.email} icon={Mail} />
        <div className="md:col-span-2">
          <ViewField label="Website" value={vendor?.website} icon={Globe} />
        </div>
      </div>
    );
  }
  return (
    <FormSection>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField label="Phone" name="phone" register={register} placeholder="+251..." />
        <InputField label="Email" name="email" type="email" register={register} placeholder="contact@business.com" />
        <div className="md:col-span-2">
          <InputField label="Website" name="website" type="url" register={register} placeholder="https://..." />
        </div>
      </div>
    </FormSection>
  );
};

const AddressTab = ({ editing, register, vendor }: any) => {
  if (!editing) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
        <div className="md:col-span-2">
          <ViewField label="Street Address" value={vendor?.street_address} icon={MapPin} />
        </div>
        <ViewField label="City" value={vendor?.city} />
        <ViewField label="State/Region" value={vendor?.state} />
        <ViewField label="Postal Code" value={vendor?.postal_code} />
        <ViewField label="Country" value={vendor?.country} />
      </div>
    );
  }
  return (
    <FormSection>
      <InputField label="Street Address" name="street_address" register={register} className="md:col-span-2" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField label="City" name="city" register={register} />
        <InputField label="State/Region" name="state" register={register} />
        <InputField label="Postal Code" name="postal_code" register={register} />
        <InputField label="Country" name="country" register={register} />
      </div>
    </FormSection>
  );
};

const ServicesTab = ({ editing, register, control, vendor }: any) => {
  const { fields, append, remove } = useFieldArray({ control, name: 'service_packages' });

  if (!editing && (!vendor?.service_packages || vendor.service_packages.length === 0)) {
    return <EmptyState icon={Package} message="No service packages listed yet." />;
  }

  if (!editing) {
    return (
      <div className="grid md:grid-cols-2 gap-6 animate-fade-in">
        {vendor.service_packages.map((pkg: any, idx: number) => (
          <div key={idx} className="p-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
            <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-2">{pkg.name}</h4>
            <p className="text-rose-600 font-bold text-xl mb-4">ETB {pkg.price?.toLocaleString()}</p>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{pkg.description}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Packages</h3>
        <Button type="button" onClick={() => append({ name: '', price: 0, description: '' })} size="sm" className="bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400">
          <Plus className="w-4 h-4 mr-2" /> Add Package
        </Button>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        {fields.map((field, index) => (
          <div key={field.id} className="relative p-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
            <button type="button" onClick={() => remove(index)} className="absolute top-4 right-4 text-red-500 hover:text-red-700 bg-white dark:bg-gray-800 p-1.5 rounded-full shadow-sm">
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="space-y-4">
              <InputField label="Package Name" name={`service_packages.${index}.name`} register={register} required />
              <InputField label="Price (ETB)" name={`service_packages.${index}.price`} type="number" register={register} />
              <TextAreaField label="Description" name={`service_packages.${index}.description`} register={register} rows={2} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PhotosTab = ({ editing, register, vendor }: any) => {
  const renderPhotoGrid = (photos: string[] | undefined) => {
    if (!photos || photos.length === 0) return <EmptyState icon={Camera} message="No photos added yet." />;
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
        {photos.map((photo, i) => (
          <div key={i} className="aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 relative group">
            <img src={getImageUrl(photo)} alt="Gallery" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
          </div>
        ))}
      </div>
    );
  };

  if (!editing) {
    return (
      <div className="space-y-8">
        <div>
          <h4 className="font-bold text-gray-900 dark:text-white mb-4">Business Photos</h4>
          {renderPhotoGrid(vendor?.business_photos)}
        </div>
        <div>
          <h4 className="font-bold text-gray-900 dark:text-white mb-4">Portfolio</h4>
          {renderPhotoGrid(vendor?.portfolio_photos)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h4 className="font-bold text-gray-900 dark:text-white mb-4">Business Photos</h4>
        <div className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-900/50">
          <textarea {...register('business_photos')} rows={3} className="w-full bg-transparent border-none focus:ring-0 text-sm resize-none" placeholder="Enter image URLs (one per line)..." />
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500"><Upload className="w-3 h-3" /> URL Upload Only</div>
        </div>
      </div>
      <div>
        <h4 className="font-bold text-gray-900 dark:text-white mb-4">Portfolio Photos</h4>
        <div className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-900/50">
          <textarea {...register('portfolio_photos')} rows={3} className="w-full bg-transparent border-none focus:ring-0 text-sm resize-none" placeholder="Enter image URLs (one per line)..." />
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500"><Upload className="w-3 h-3" /> URL Upload Only</div>
        </div>
      </div>
    </div>
  );
};

const HoursTab = ({ editing, register, vendor }: any) => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  if (!editing) {
    if (!vendor?.business_hours?.length) return <EmptyState icon={Clock} message="Business hours not set." />;
    return (
      <div className="grid gap-3 animate-fade-in max-w-lg">
        {vendor.business_hours.map((h: any, i: number) => (
          <div key={i} className="flex justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <span className="font-medium">{h.day}</span>
            <span className={h.closed ? "text-red-500" : "text-gray-600 dark:text-gray-300"}>
              {h.closed ? 'Closed' : `${h.open} - ${h.close}`}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {days.map((day, index) => (
        <div key={day} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
          <span className="w-24 font-medium text-gray-900 dark:text-white">{day}</span>
          <div className="flex items-center gap-3 flex-1">
            <input type="checkbox" {...register(`business_hours.${index}.closed`)} className="w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500" />
            <span className="text-sm text-gray-500 w-12">Closed</span>
            <div className="flex items-center gap-2 flex-1">
              <input type="time" {...register(`business_hours.${index}.open`)} className="p-2 border rounded-lg text-sm bg-white dark:bg-gray-800 w-full" />
              <span>-</span>
              <input type="time" {...register(`business_hours.${index}.close`)} className="p-2 border rounded-lg text-sm bg-white dark:bg-gray-800 w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const EmptyState = ({ icon: Icon, message }: { icon: any, message: string }) => (
  <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
    <Icon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
    <p className="text-gray-500 dark:text-gray-400">{message}</p>
  </div>
);

// --- Main Component ---

const VendorProfile: React.FC = () => {
  const [vendor, setVendor] = useState<VendorResponse | null>(null);
  const [categories, setCategories] = useState<VendorCategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'contact' | 'address' | 'services' | 'photos' | 'hours'>('basic');

  const { register, handleSubmit, formState: { errors }, reset, control } = useForm<VendorProfileFormData>({
    defaultValues: { service_packages: [], business_hours: [] }
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profile, cats] = await Promise.all([vendorApi.getMyProfile(), vendorApi.getCategories()]);
      setVendor(profile);
      setCategories(cats);
      initializeForm(profile);
    } catch (err: any) {
      if (err.message?.includes('404')) {
        setEditing(true); // New profile
      } else {
        setError('Failed to load profile data.');
      }
    } finally {
      setLoading(false);
    }
  };

  const initializeForm = (data: VendorResponse) => {
    const defaultHours = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => ({
      day, open: '09:00', close: '17:00', closed: day === 'Sunday'
    }));

    reset({
      ...data,
      business_hours: data.business_hours?.length ? data.business_hours : defaultHours,
      business_photos: Array.isArray(data.business_photos) ? data.business_photos.join('\n') : '',
      portfolio_photos: Array.isArray(data.portfolio_photos) ? data.portfolio_photos.join('\n') : '',
      phone: data.phone || '',
      email: data.email || '',
      website: data.website || '',
      street_address: data.street_address || '',
      city: data.city || '',
      state: data.state || '',
      postal_code: data.postal_code || '',
      country: data.country || 'Ethiopia',
    });
  };

  const onSubmit = async (data: VendorProfileFormData) => {
    setSaving(true);
    setError(null);
    try {
      const processPhotos = (input: string | string[]) => 
        (typeof input === 'string' ? input.split('\n') : input).map(s => s.trim()).filter(Boolean);

      const submitData = {
        ...data,
        business_photos: processPhotos(data.business_photos || []),
        portfolio_photos: processPhotos(data.portfolio_photos || []),
      };

      const updated = vendor 
        ? await vendorApi.updateProfile(submitData)
        : await vendorApi.createProfile(submitData);
      
      setVendor(updated);
      setEditing(false);
      initializeForm(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="w-8 h-8 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"/></div>;

  const tabs = [
    { id: 'basic', label: 'Overview', icon: Building2 },
    { id: 'services', label: 'Services', icon: Package },
    { id: 'photos', label: 'Gallery', icon: Camera },
    { id: 'hours', label: 'Hours', icon: Clock },
    { id: 'contact', label: 'Contact', icon: Phone },
    { id: 'address', label: 'Location', icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 pt-24">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-20 z-30 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Business Profile
                {vendor?.is_verified && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Verified</span>}
              </h1>
              <p className="text-sm text-gray-500">Manage your presence on WedHabesha</p>
            </div>
            <div className="flex gap-3">
              {!editing ? (
                <Button onClick={() => setEditing(true)} className="bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/20">
                  <Edit3 className="w-4 h-4 mr-2" /> Edit Profile
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => { setEditing(false); if(vendor) initializeForm(vendor); }}>Cancel</Button>
                  <Button onClick={handleSubmit(onSubmit)} loading={saving} className="bg-green-600 hover:bg-green-700 text-white">
                    <Save className="w-4 h-4 mr-2" /> Save Changes
                  </Button>
                </>
              )}
            </div>
          </div>
          
          <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-300">
            <AlertCircle className="w-5 h-5" /> {error}
          </div>
        )}

        {(!vendor || !vendor.is_verified) && (
          <div className="mb-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg flex justify-between items-center">
            <div className="flex gap-4 items-center">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm"><AlertCircle className="w-6 h-6" /></div>
              <div><h3 className="font-bold">Complete Your Profile</h3><p className="text-sm opacity-90">Get verified to boost visibility.</p></div>
            </div>
            <div className="text-2xl font-bold opacity-90">80%</div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-4">
            <Card className="border-0 shadow-xl bg-white dark:bg-gray-800 rounded-2xl overflow-hidden min-h-[500px]">
              <div className="p-6 md:p-8">
                {activeTab === 'basic' && <BasicInfoTab editing={editing} register={register} errors={errors} categories={categories} vendor={vendor} />}
                {activeTab === 'contact' && <ContactTab editing={editing} register={register} vendor={vendor} />}
                {activeTab === 'address' && <AddressTab editing={editing} register={register} vendor={vendor} />}
                {activeTab === 'services' && <ServicesTab editing={editing} register={register} control={control} vendor={vendor} />}
                {activeTab === 'photos' && <PhotosTab editing={editing} register={register} vendor={vendor} />}
                {activeTab === 'hours' && <HoursTab editing={editing} register={register} vendor={vendor} />}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorProfile;