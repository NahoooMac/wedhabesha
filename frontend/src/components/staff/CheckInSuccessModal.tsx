import React, { useEffect, useState } from 'react';
import { CheckCircle, UserCheck, Clock, X } from 'lucide-react';

interface CheckInSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  guestName: string;
  isDuplicate: boolean;
  checkedInAt?: string;
}

const CheckInSuccessModal: React.FC<CheckInSuccessModalProps> = ({
  isOpen,
  onClose,
  guestName,
  isDuplicate,
  checkedInAt
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Auto close after 4 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300); // Wait for animation to complete
  };

  if (!isOpen) return null;

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return new Date().toLocaleTimeString();
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black transition-opacity duration-300 ${
          isVisible ? 'opacity-50' : 'opacity-0'
        }`}
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div 
        className={`relative bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 transition-colors z-10"
        >
          <X size={24} />
        </button>

        {/* Content */}
        <div className="p-8 text-center">
          {/* Success Icon with Animation */}
          <div className="relative mb-6">
            <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 ${
              isDuplicate 
                ? 'bg-orange-100 text-orange-600' 
                : 'bg-green-100 text-green-600'
            }`}>
              {isDuplicate ? (
                <UserCheck size={48} className="animate-pulse" />
              ) : (
                <CheckCircle size={48} className="animate-bounce" />
              )}
            </div>
            
            {/* Ripple Effect */}
            {!isDuplicate && (
              <div className="absolute inset-0 rounded-full bg-green-400 opacity-20 animate-ping"></div>
            )}
          </div>

          {/* Status Message */}
          <div className="mb-6">
            <h2 className={`text-2xl font-bold mb-2 ${
              isDuplicate ? 'text-orange-800' : 'text-green-800'
            }`}>
              {isDuplicate ? 'Already Checked In!' : 'Check-In Successful!'}
            </h2>
            
            <p className="text-slate-600 text-lg">
              {isDuplicate ? 'Guest was previously checked in' : 'Welcome to the wedding!'}
            </p>
          </div>

          {/* Guest Info */}
          <div className={`p-6 rounded-2xl mb-6 ${
            isDuplicate ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'
          }`}>
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className={`p-2 rounded-full ${
                isDuplicate ? 'bg-orange-200 text-orange-700' : 'bg-green-200 text-green-700'
              }`}>
                <UserCheck size={20} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">
                {guestName}
              </h3>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-slate-600">
              <Clock size={16} />
              <span className="text-sm font-medium">
                {formatTime(checkedInAt)}
              </span>
            </div>
          </div>

          {/* Status Badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
            isDuplicate 
              ? 'bg-orange-100 text-orange-800 border border-orange-200' 
              : 'bg-green-100 text-green-800 border border-green-200'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isDuplicate ? 'bg-orange-500' : 'bg-green-500'
            }`}></div>
            {isDuplicate ? 'Duplicate Check-In' : 'New Check-In'}
          </div>
        </div>

        {/* Bottom Action */}
        <div className="px-8 pb-8">
          <button
            onClick={handleClose}
            className={`w-full py-3 px-6 rounded-xl font-medium transition-colors ${
              isDuplicate
                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            Continue Scanning
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckInSuccessModal;