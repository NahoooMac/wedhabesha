import React, { useState, useRef } from 'react';
import { 
  X, Check, ChevronLeft, ChevronRight, Download, CalendarCheck, 
  ImageIcon, Move, Save
} from 'lucide-react';
import { InvitationEngine, RSVPInvitationData, TEMPLATE_METADATA } from './InvitationEngine';
import { weddingApi } from '../../lib/api';
import html2canvas from 'html2canvas';

interface TemplateCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateId: string;
  weddingId: number;
  initialData?: RSVPInvitationData;
  onSave?: (data: RSVPInvitationData) => void;
}

const TemplateCustomizerModal: React.FC<TemplateCustomizerModalProps> = ({
  isOpen, onClose, templateId, weddingId, initialData, onSave
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<RSVPInvitationData>(initialData || {
    bride: "Alice",
    groom: "Bob",
    ceremony_date: "2024-12-25",
    ceremony_time: "14:00",
    venue_name: "Grand Hotel",
    venue_address: "123 Main St",
    custom_message: "Join us for our wedding",
    imageSettings: { x: 0, y: 0, scale: 1 }
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const invitationRef = useRef<HTMLDivElement>(null);

  const totalSteps = 5;
  const activeTemplate = TEMPLATE_METADATA.find(t => t.id === templateId);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Show preview immediately
      const reader = new FileReader();
      reader.onloadend = () => handleInputChange('imageUrl', reader.result);
      reader.readAsDataURL(file);
      
      // Upload to server
      try {
        const response = await weddingApi.uploadInvitationImage(weddingId, file);
        console.log('Image uploaded successfully:', response);
        // Store the server URL as well
        handleInputChange('serverImageUrl', response.image_url);
      } catch (error) {
        console.error('Failed to upload image:', error);
        alert('Failed to upload image to server. The image will only be visible in preview.');
      }
    }
  };

  const handleUpdateImageSettings = (newSettings: any) => {
    handleInputChange('imageSettings', newSettings);
  };

  const handleSaveDesign = async () => {
    try {
      setIsSaving(true);
      setSaveError(null);

      // Prepare customization data for the API
      const customization = {
        wedding_title: `${formData.bride} & ${formData.groom}`,
        ceremony_date: formData.ceremony_date,
        ceremony_time: formData.ceremony_time,
        venue_name: formData.venue_name,
        venue_address: formData.venue_address,
        custom_message: formData.custom_message || '',
        text_color: '#000000',
        font_size: 'medium' as const,
        text_position: 'center' as const,
        qr_position: 'bottom-center' as const,
      };

      // Save template selection and customization
      await weddingApi.updateWeddingTemplate(weddingId, templateId, customization);
      
      // Save image settings if image exists
      if (formData.imageSettings && formData.imageUrl) {
        await weddingApi.updateImageSettings(weddingId, formData.imageSettings);
      }

      // Call the onSave callback if provided
      if (onSave) {
        onSave(formData);
      }

      // Show success message
      alert('Design saved successfully!');
      
    } catch (error: any) {
      console.error('Error saving design:', error);
      
      // Provide more detailed error message
      let errorMessage = 'Failed to save design. Please try again.';
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setSaveError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadImage = async () => {
    try {
      setIsDownloading(true);
      
      if (!invitationRef.current) {
        throw new Error('Invitation preview not found');
      }

      // Store original image settings to restore later
      const originalImageSettings = formData.imageSettings || { x: 0, y: 0, scale: 1 };
      
      // Reset image transformations for download (center and fit the image properly)
      if (formData.imageUrl && activeTemplate?.isPhotoTemplate) {
        setFormData(prev => ({
          ...prev,
          imageSettings: { x: 0, y: 0, scale: 1 }
        }));
        
        // Wait for React to update the DOM
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Hide all elements with class 'hide-on-download' before capturing
      const elementsToHide = invitationRef.current.querySelectorAll('.hide-on-download');
      elementsToHide.forEach((el) => {
        (el as HTMLElement).style.display = 'none';
      });

      // Get the original dimensions
      const originalWidth = invitationRef.current.offsetWidth;
      const originalHeight = invitationRef.current.offsetHeight;

      // Capture the invitation as canvas with high quality
      const canvas = await html2canvas(invitationRef.current, {
        useCORS: true,
        allowTaint: true,
        width: originalWidth,
        height: originalHeight,
        logging: false,
      });

      // Show hidden elements again
      elementsToHide.forEach((el) => {
        (el as HTMLElement).style.display = '';
      });

      // Restore original image settings
      if (formData.imageUrl && activeTemplate?.isPhotoTemplate) {
        setFormData(prev => ({
          ...prev,
          imageSettings: originalImageSettings
        }));
      }

      // Create a higher resolution canvas
      const highResCanvas = document.createElement('canvas');
      const scale = 3; // 3x resolution for better quality
      highResCanvas.width = originalWidth * scale;
      highResCanvas.height = originalHeight * scale;
      
      const ctx = highResCanvas.getContext('2d');
      if (ctx) {
        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw the original canvas scaled up
        ctx.drawImage(canvas, 0, 0, originalWidth * scale, originalHeight * scale);
      }

      // Convert to blob and download with high quality
      highResCanvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          const fileName = `wedding-invitation-${formData.bride?.replace(/\s+/g, '-') || 'bride'}-${formData.groom?.replace(/\s+/g, '-') || 'groom'}.png`;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }, 'image/png', 1.0); // 1.0 = maximum quality

    } catch (error) {
      console.error('Error downloading image:', error);
      alert('Failed to download image. Please try again.');
      
      // Make sure to show hidden elements even if there's an error
      if (invitationRef.current) {
        const elementsToHide = invitationRef.current.querySelectorAll('.hide-on-download');
        elementsToHide.forEach((el) => {
          (el as HTMLElement).style.display = '';
        });
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const nextStep = () => { if (currentStep < totalSteps) setCurrentStep(curr => curr + 1); };
  const prevStep = () => { if (currentStep > 1) setCurrentStep(curr => curr - 1); };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-50 shadow-sm h-16 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
          <span className="font-bold text-gray-700">Customizing: {activeTemplate?.name}</span>
        </div>
        <div className="flex gap-3">
             <button className="text-xs font-bold text-gray-500 uppercase tracking-wider px-4 py-2 hover:bg-gray-100 rounded-full transition-colors" onClick={onClose}>Cancel</button>
             <button onClick={() => onSave && onSave(formData)} className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2 rounded-full text-xs font-bold tracking-wider shadow-lg hover:shadow-xl transition-all">Save Design</button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL: Wizard Form */}
        <aside className="w-full max-w-[480px] bg-white border-r border-gray-200 flex flex-col z-20 shadow-2xl">
          {/* Step Indicator */}
          <div className="px-8 pt-8 pb-6">
            <div className="flex items-center justify-between relative">
              <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-gray-100 -z-0 -translate-y-1/2">
                <div className="h-full bg-rose-600 transition-all duration-500" style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }} />
              </div>
              {[...Array(totalSteps)].map((_, i) => {
                const stepNum = i + 1;
                const isActive = stepNum === currentStep;
                const isCompleted = stepNum < currentStep;
                return (
                  <div key={stepNum} className="flex flex-col items-center relative z-10 bg-white px-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2 ${isActive ? 'bg-rose-600 text-white border-rose-600' : isCompleted ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-400 border-gray-200'}`}>
                      {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-center mt-4 font-bold text-rose-600 uppercase text-xs tracking-widest">
              {currentStep === 1 ? 'Design' : currentStep === 2 ? 'The Couple' : currentStep === 3 ? 'Details' : currentStep === 4 ? 'Photo' : 'Review'}
            </div>
          </div>

          <div className="flex-1 px-8 overflow-y-auto">
            {currentStep === 2 && (
              <div className="animate-fadeIn">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 font-serif">The Happy Couple</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Bride / Partner 1</label>
                    <input type="text" value={formData.bride || formData.partner_1 || ''} onChange={(e) => handleInputChange('bride', e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Groom / Partner 2</label>
                    <input type="text" value={formData.groom || formData.partner_2 || ''} onChange={(e) => handleInputChange('groom', e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500" />
                  </div>
                </div>
              </div>
            )}
            
            {currentStep === 3 && (
              <div className="animate-fadeIn">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 font-serif">Event Details</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Date</label>
                      <input type="date" value={formData.ceremony_date} onChange={(e) => handleInputChange('ceremony_date', e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Time</label>
                       <input type="text" value={formData.ceremony_time} onChange={(e) => handleInputChange('ceremony_time', e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Venue Name</label>
                    <input type="text" value={formData.venue_name} onChange={(e) => handleInputChange('venue_name', e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Address</label>
                    <input type="text" value={formData.venue_address} onChange={(e) => handleInputChange('venue_address', e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Message / Subheader</label>
                     <textarea value={formData.custom_message || ''} onChange={(e) => handleInputChange('custom_message', e.target.value)} rows={3} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Guest Name (Optional)</label>
                     <input type="text" value={formData.guest_name || ''} onChange={(e) => handleInputChange('guest_name', e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" placeholder="Leave blank for generic" />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="animate-fadeIn">
                 <h3 className="text-2xl font-bold text-gray-900 mb-6 font-serif">Add a Photo</h3>
                 <div className="border-2 border-dashed border-gray-300 rounded-2xl p-10 flex flex-col items-center justify-center bg-gray-50 hover:bg-rose-50 hover:border-rose-300 transition-all text-center group cursor-pointer relative">
                   <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleImageUpload} />
                   {formData.imageUrl ? (
                     <div className="relative w-full">
                        <img src={formData.imageUrl} alt="Preview" className="w-40 h-40 object-cover rounded-xl mx-auto shadow-lg mb-4" />
                        <span className="text-rose-600 text-sm font-bold bg-white px-3 py-1 rounded-full shadow-sm">Click to Change</span>
                     </div>
                   ) : (
                     <>
                        <div className="w-16 h-16 bg-white text-rose-600 rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform"><ImageIcon className="w-8 h-8" /></div>
                        <span className="text-gray-900 font-bold text-lg">Click to upload</span>
                        <span className="text-xs text-gray-400 mt-2">JPG, PNG up to 5MB</span>
                     </>
                   )}
                </div>
                {activeTemplate?.isPhotoTemplate && (
                   <p className="text-xs text-rose-600 mt-4 text-center font-medium bg-rose-50 py-2 rounded-lg">
                    <Move className="w-3 h-3 inline-block mr-1" /> You can drag and resize your photo in the preview!
                  </p>
                )}
              </div>
            )}

            {currentStep === 5 && (
              <div className="animate-fadeIn text-center py-10">
                <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm"><Check className="w-12 h-12" /></div>
                <h3 className="text-3xl font-bold text-gray-900 mb-3 font-serif">Almost There!</h3>
                <p className="text-gray-500 mb-10">Your invitation is ready. Save your design or download it as an image.</p>
                
                {saveError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {saveError}
                  </div>
                )}
                
                <div className="space-y-4">
                  <button 
                    onClick={handleSaveDesign}
                    disabled={isSaving}
                    className="w-full py-4 bg-rose-600 text-white rounded-xl font-bold shadow-lg hover:bg-rose-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-colors"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" /> Save Design to Database
                      </>
                    )}
                  </button>
                  
                  <button 
                    onClick={handleDownloadImage}
                    disabled={isDownloading}
                    className="w-full py-4 bg-white border-2 border-rose-600 text-rose-600 rounded-xl font-bold hover:bg-rose-50 disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-colors"
                  >
                    {isDownloading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-rose-600"></div>
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" /> Download as Image
                      </>
                    )}
                  </button>
                  
                  <button 
                    className="w-full py-4 bg-white border-2 border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 flex items-center justify-center gap-3 transition-colors"
                    onClick={onClose}
                  >
                    <CalendarCheck className="w-5 h-5" /> Close
                  </button>
                </div>
              </div>
            )}
            
            {currentStep === 1 && (
               <div className="animate-fadeIn text-center py-10">
                  <p className="text-gray-500">You are editing {activeTemplate?.name}. Click Next to start customizing.</p>
               </div>
            )}
          </div>

          <div className="p-6 border-t border-gray-100 bg-white flex justify-between items-center">
             <button onClick={prevStep} disabled={currentStep === 1} className={`flex items-center gap-2 text-sm font-bold px-6 py-3 rounded-full transition-colors ${currentStep === 1 ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'}`}><ChevronLeft className="w-4 h-4" /> Back</button>
             {currentStep < totalSteps && (
               <button onClick={nextStep} className="flex items-center gap-2 bg-rose-600 text-white px-8 py-3 rounded-full text-sm font-bold shadow-lg hover:bg-rose-700 transition-all">Next Step <ChevronRight className="w-4 h-4" /></button>
             )}
          </div>
        </aside>

        {/* RIGHT PANEL: Live Preview */}
        <section className="flex-1 bg-gray-100/50 relative flex items-center justify-center p-8 overflow-y-auto">
          <div className="flex flex-col items-center justify-center w-full h-full">
            <div 
               ref={invitationRef}
               data-invitation-preview
               className="relative w-full max-w-[400px] bg-white shadow-2xl shadow-slate-400/20 rounded-sm overflow-hidden" 
               style={{ aspectRatio: activeTemplate?.aspectRatio || '5/7', containerType: 'size' }}
            >
              <InvitationEngine 
                templateId={templateId} 
                data={formData} 
                onUpdateImageSettings={activeTemplate?.isPhotoTemplate ? handleUpdateImageSettings : undefined}
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default TemplateCustomizerModal;