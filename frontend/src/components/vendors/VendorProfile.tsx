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
interface UIServicePackage {
  id?: number;
  name: string;
  description: string;
  price: number;
  startingPrice?: string;
  photo?: string;
  location?: string;
  phone?: string;
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
  starting_price?: string;
  why_choose_us?: string[];
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
  service_packages: UIServicePackage[];
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
  label, error, register, name, placeholder, type = "text", required = false, disabled = false, className = "", step 
}: { 
  label: string, error?: string, register: any, name: string, placeholder?: string, type?: string, required?: boolean, disabled?: boolean, className?: string, step?: string 
}) => (
  <div className={`space-y-2 ${className}`}>
    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
      {label} {required && '*'}
    </label>
    <input
      type={type}
      step={step}
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
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        </div>

        {/* Starting Price */}
        {vendor?.starting_price && (
          <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              <span className="text-sm font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">Starting Price</span>
            </div>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              ETB {vendor.starting_price}
            </div>
          </div>
        )}

        <div className="md:col-span-2">
           <ViewField label="Description" value={vendor?.description} icon={FileText} />
        </div>

        {/* Why Choose Us */}
        {vendor?.why_choose_us && vendor.why_choose_us.some((reason: string) => reason.trim()) && (
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Why Choose Us</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {vendor.why_choose_us.filter((reason: string) => reason.trim()).map((reason: string, index: number) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span className="text-emerald-800 dark:text-emerald-200 font-medium">{reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}
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

      {/* Starting Price */}
      <InputField 
        label="Starting Price (ETB)" 
        name="starting_price" 
        register={register} 
        placeholder="e.g., 25,000"
        error={errors.starting_price?.message} 
      />

      <TextAreaField label="Description" name="description" register={register} error={errors.description?.message} required />

      {/* Why Choose Us */}
      <div className="space-y-4">
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Why Choose Us? <span className="text-gray-500 font-normal">(4 key reasons)</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((index) => (
            <InputField
              key={index}
              label={`Reason ${index + 1}`}
              name={`why_choose_us.${index}`}
              register={register}
              placeholder={`e.g., "10+ years of experience"`}
            />
          ))}
        </div>
      </div>
    </FormSection>
  );
};

const ContactTab = ({ editing, register, vendor }: any) => {
  if (!editing) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ViewField label="Phone" value={vendor?.phone} icon={Phone} />
          <ViewField label="Email" value={vendor?.email} icon={Mail} />
        </div>
        <div className="md:col-span-2">
          <ViewField label="Website" value={vendor?.website} icon={Globe} />
        </div>
        
        {/* Contact Options */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Contact Options
          </h4>
          <div className="space-y-2">
            {vendor?.phone && (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  Customers can call you at <strong>{vendor.phone}</strong>
                </span>
              </div>
            )}
            {vendor?.email && (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  Customers can email you at <strong>{vendor.email}</strong>
                </span>
              </div>
            )}
            {vendor?.website && (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  Customers can visit your website
                </span>
              </div>
            )}
            {!vendor?.phone && !vendor?.email && !vendor?.website && (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                <span className="text-sm text-amber-700 dark:text-amber-300">
                  Add contact information to help customers reach you
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Primary Contact Highlight */}
        {vendor?.phone && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-green-800 dark:text-green-200 mb-1 flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Primary Contact Number
                </h4>
                <p className="text-green-700 dark:text-green-300 text-sm mb-3">
                  This number will be prominently displayed to potential customers
                </p>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {vendor.phone}
                </div>
              </div>
              <div className="text-right">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-2">
                  <Phone className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">Available</span>
              </div>
            </div>
          </div>
        )}
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
      
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
          <Phone className="w-4 h-4" />
          Contact Preferences
        </h4>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Your phone number will be displayed to potential customers as a primary contact method. 
          Make sure it's a number you actively monitor for business inquiries.
        </p>
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
        <div className="md:col-span-2">
          <ViewField label="Service Area" value={vendor?.service_area} />
        </div>
        {(vendor?.latitude && vendor?.longitude) && (
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Map Location</label>
            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl text-gray-800 dark:text-gray-200 font-medium">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>Lat: {vendor.latitude}, Lng: {vendor.longitude}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  return (
    <FormSection>
      <div className="md:col-span-2">
        <InputField label="Street Address" name="street_address" register={register} placeholder="e.g., Bole Road, near Atlas Hotel" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField label="City" name="city" register={register} placeholder="e.g., Addis Ababa" />
        <InputField label="State/Region" name="state" register={register} placeholder="e.g., Addis Ababa" />
        <InputField label="Postal Code" name="postal_code" register={register} placeholder="e.g., 1000" />
        <InputField label="Country" name="country" register={register} placeholder="e.g., Ethiopia" />
      </div>
      <div className="md:col-span-2">
        <InputField label="Service Area" name="service_area" register={register} placeholder="e.g., Addis Ababa and surrounding areas" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField label="Latitude" name="latitude" type="number" step="any" register={register} placeholder="e.g., 9.0320" />
        <InputField label="Longitude" name="longitude" type="number" step="any" register={register} placeholder="e.g., 38.7469" />
      </div>
      <div className="md:col-span-2">
        <InputField label="Map Address" name="map_address" register={register} placeholder="Full address for map display (optional)" />
      </div>
      
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Location Tips
        </h4>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• Provide accurate address information to help customers find you</li>
          <li>• Service area describes where you provide services</li>
          <li>• Latitude/longitude coordinates improve map accuracy (optional)</li>
        </ul>
      </div>
    </FormSection>
  );
};

const ServicesTab = ({ editing, register, control, vendor, watch, setValue }: any) => {
  const { fields, append, remove, watch, setValue } = useFieldArray({ control, name: 'service_packages' });
  const [uploadingImages, setUploadingImages] = useState<{[key: number]: boolean}>({});
  const [imageInputTypes, setImageInputTypes] = useState<{[key: number]: 'url' | 'upload'}>({});
  const watchedPackages = watch('service_packages');

  const handleImageUpload = async (index: number, file: File) => {
    setUploadingImages(prev => ({ ...prev, [index]: true }));
    
    try {
      const formData = new FormData();
      formData.append('photos', file);
      
      const response = await fetch('/api/vendors/upload-photos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const result = await response.json();
      const imageUrl = result.photos[0];
      
      // Update the form field with the uploaded image URL
      setValue(`service_packages.${index}.photo`, imageUrl);
      
    } catch (error) {
      console.error('Image upload failed:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingImages(prev => ({ ...prev, [index]: false }));
    }
  };

  if (!editing && (!vendor?.service_packages || vendor.service_packages.length === 0)) {
    return <EmptyState icon={Package} message="No service packages listed yet." />;
  }

  if (!editing) {
    return (
      <div className="grid md:grid-cols-2 gap-6 animate-fade-in">
        {vendor.service_packages.map((pkg: any, idx: number) => (
          <div key={idx} className="p-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
            {/* Package Photo */}
            {pkg.photo && (
              <div className="w-full h-48 bg-gray-100 dark:bg-gray-700 rounded-lg mb-4 overflow-hidden">
                <img 
                  src={pkg.photo} 
                  alt={pkg.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div className="space-y-3">
              <h4 className="font-bold text-lg text-gray-900 dark:text-white">{pkg.name}</h4>
              
              {/* Price Display */}
              <div className="flex items-center gap-2">
                <span className="text-rose-600 font-bold text-xl">
                  ETB {(pkg.price || pkg.startingPrice || 0).toLocaleString()}
                </span>
                <span className="text-sm text-gray-500">starting from</span>
              </div>
              
              <p className="text-gray-600 dark:text-gray-300 text-sm">{pkg.description}</p>
              
              {/* Contact Info */}
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
                {pkg.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{pkg.location}</span>
                  </div>
                )}
                {pkg.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    <span>{pkg.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Service Packages</h3>
        <Button type="button" onClick={() => append({ 
          name: '', 
          price: 0, 
          description: '', 
          photo: '', 
          location: '', 
          phone: '' 
        })} size="sm" className="bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400">
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
              <InputField label="Starting Price (ETB)" name={`service_packages.${index}.price`} type="number" register={register} />
              <TextAreaField label="Description" name={`service_packages.${index}.description`} register={register} rows={2} />
              
              {/* Additional Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Service Location" name={`service_packages.${index}.location`} register={register} placeholder="e.g., Addis Ababa" />
                <InputField label="Contact Phone" name={`service_packages.${index}.phone`} register={register} placeholder="+251..." />
              </div>
              
              {/* Package Image Section */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Package Image</label>
                
                {/* Image Input Type Toggle */}
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setImageInputTypes(prev => ({ ...prev, [index]: 'url' }))}
                    className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                      (imageInputTypes[index] || 'url') === 'url'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    Link URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageInputTypes(prev => ({ ...prev, [index]: 'upload' }))}
                    className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                      imageInputTypes[index] === 'upload'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    Upload File
                  </button>
                </div>

                {/* URL Input */}
                {(imageInputTypes[index] || 'url') === 'url' && (
                  <InputField 
                    label="" 
                    name={`service_packages.${index}.photo`} 
                    register={register} 
                    placeholder="https://example.com/image.jpg" 
                  />
                )}

                {/* File Upload */}
                {imageInputTypes[index] === 'upload' && (
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleImageUpload(index, file);
                        }
                      }}
                      className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-rose-500 outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100"
                      disabled={uploadingImages[index]}
                    />
                    {uploadingImages[index] && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <div className="w-4 h-4 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
                        Uploading image...
                      </div>
                    )}
                  </div>
                )}

                {/* Image Preview */}
                {watchedPackages?.[index]?.photo && (
                  <div className="mt-2">
                    <img 
                      src={watchedPackages[index].photo} 
                      alt="Package preview"
                      className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
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

  const { register, handleSubmit, formState: { errors }, reset, control, watch, setValue } = useForm<VendorProfileFormData>({
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
      starting_price: (data as any).starting_price || '',
      why_choose_us: (data as any).why_choose_us || ['', '', '', ''],
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
      service_packages: data.service_packages?.map(pkg => ({
        ...pkg,
        location: (pkg as any).location || data.location || '',
        phone: (pkg as any).phone || data.phone || '',
        photo: (pkg as any).photo || ''
      })) || []
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

  // Get the first business photo for banner background
  const bannerImage = vendor?.business_photos && vendor.business_photos.length > 0 
    ? getImageUrl(vendor.business_photos[0]) 
    : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Banner Background */}
      <div className="relative h-64 overflow-hidden">
        {bannerImage ? (
          <>
            {/* Blurred background image */}
            <div 
              className="absolute inset-0 bg-cover bg-center transform scale-110 filter blur-lg"
              style={{ backgroundImage: `url(${bannerImage})` }}
            />
            {/* Overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/60" />
          </>
        ) : (
          /* Fallback gradient background */
          <div className="absolute inset-0 bg-gradient-to-br from-rose-600 via-purple-600 to-indigo-600" />
        )}
        
        {/* Banner content */}
        <div className="relative z-10 h-full flex items-end">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 w-full">
            <div className="flex items-end gap-6">
              {/* Profile Image */}
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-white p-1 shadow-2xl flex-shrink-0">
                <div className="w-full h-full bg-gradient-to-br from-rose-100 to-purple-100 rounded-xl flex items-center justify-center text-2xl md:text-3xl font-bold text-rose-600 overflow-hidden">
                  {bannerImage ? (
                    <img src={bannerImage} alt="Profile" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    vendor?.business_name?.charAt(0).toUpperCase() || 'V'
                  )}
                </div>
              </div>
              
              {/* Business Info */}
              <div className="flex-1 text-white pb-2">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl md:text-3xl font-bold">
                    {vendor?.business_name || 'Your Business'}
                  </h1>
                  {vendor?.is_verified && (
                    <span className="bg-blue-500/20 backdrop-blur-md border border-blue-400/30 px-3 py-1 rounded-full text-xs font-medium text-blue-200 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Verified
                    </span>
                  )}
                </div>
                <p className="text-white/80 text-sm md:text-base">
                  Manage your presence on WedHabesha
                </p>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 pb-2">
                {!editing ? (
                  <Button onClick={() => setEditing(true)} className="bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30 shadow-lg">
                    <Edit3 className="w-4 h-4 mr-2" /> Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => { setEditing(false); if(vendor) initializeForm(vendor); }}
                      className="bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSubmit(onSubmit)} 
                      loading={saving} 
                      className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
                    >
                      <Save className="w-4 h-4 mr-2" /> Save Changes
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-20 z-30 shadow-sm -mt-8 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
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
                {activeTab === 'services' && <ServicesTab editing={editing} register={register} control={control} vendor={vendor} watch={watch} setValue={setValue} />}
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