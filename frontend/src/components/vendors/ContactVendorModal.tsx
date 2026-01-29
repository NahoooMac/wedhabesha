import React, { useState } from 'react';
import { X, MessageCircle, Calendar, DollarSign, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { VendorResponse, LeadCreateRequest, vendorApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

interface ContactVendorModalProps {
  vendor: VendorResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ContactVendorModal: React.FC<ContactVendorModalProps> = ({
  vendor,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<LeadCreateRequest>({
    message: '',
    budget_range: '',
    event_date: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successStep, setSuccessStep] = useState(false);

  if (!isOpen || !vendor) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor || !user) return;
    
    if (user.user_type !== 'COUPLE') {
      setError('Only couples registered on the platform can contact vendors.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await vendorApi.contactVendor(vendor.id, {
        message: formData.message.trim(),
        budget_range: formData.budget_range || undefined,
        event_date: formData.event_date || undefined
      });
      setSuccessStep(true);
      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccessStep(false); // Reset for next time
      }, 2000);
    } catch (error) {
      console.error('Failed to contact vendor:', error);
      setError('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof LeadCreateRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
        {successStep ? (
           <div className="p-12 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                 <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Message Sent!</h3>
              <p className="text-gray-600 dark:text-gray-300">
                 Your inquiry has been sent to <span className="font-semibold">{vendor.business_name}</span>. They will be in touch shortly.
              </p>
           </div>
        ) : (
          <>
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Contact Vendor</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                   Send a message to <span className="font-medium text-rose-600">{vendor.business_name}</span>
                </p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                 <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6">
               {!user ? (
                 <div className="text-center py-8">
                   <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageCircle className="w-8 h-8 text-rose-500" />
                   </div>
                   <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Login Required</h3>
                   <p className="text-gray-600 mb-6 text-sm">Please sign in to your account to send inquiries to vendors.</p>
                   <Button onClick={onClose} className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-xl">Close</Button>
                 </div>
               ) : (
                 <form onSubmit={handleSubmit} className="space-y-5">
                   {error && (
                     <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
                     </div>
                   )}

                   <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Your Message</label>
                      <textarea
                        required
                        rows={4}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all resize-none"
                        placeholder="Hi, I'm interested in your services for my wedding..."
                        value={formData.message}
                        onChange={(e) => handleInputChange('message', e.target.value)}
                      />
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Wedding Date</label>
                         <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="date"
                              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                              value={formData.event_date}
                              onChange={(e) => handleInputChange('event_date', e.target.value)}
                            />
                         </div>
                      </div>
                      <div className="space-y-2">
                         <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Budget Range</label>
                         <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select
                               className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none appearance-none"
                               value={formData.budget_range}
                               onChange={(e) => handleInputChange('budget_range', e.target.value)}
                            >
                               <option value="">Select Range</option>
                               <option value="Under 10k">Under 10k ETB</option>
                               <option value="10k - 50k">10k - 50k ETB</option>
                               <option value="50k - 100k">50k - 100k ETB</option>
                               <option value="100k+">100k+ ETB</option>
                            </select>
                         </div>
                      </div>
                   </div>

                   <div className="pt-2">
                      <Button 
                        type="submit" 
                        loading={loading}
                        className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-lg shadow-rose-500/20 font-medium"
                      >
                         Send Inquiry
                      </Button>
                   </div>
                 </form>
               )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ContactVendorModal;