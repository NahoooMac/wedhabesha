import React from 'react';
import { CheckCircle2, Clock, XCircle, AlertTriangle, Calendar } from 'lucide-react';
import VerificationBadge from './VerificationBadge';

interface VerificationStatusProps {
  status: 'pending' | 'verified' | 'rejected';
  verificationDate?: string;
  verificationHistory?: Array<{
    status: string;
    date: string;
    reason?: string;
    notes?: string;
  }>;
  rejectionReason?: string;
}

const VerificationStatus: React.FC<VerificationStatusProps> = ({
  status,
  verificationDate,
  verificationHistory = [],
  rejectionReason
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'verified':
        return {
          icon: CheckCircle2,
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800',
          title: 'Account Verified',
          message: 'Your account has been verified. You are now visible to customers.',
          actionMessage: 'You can now receive leads and bookings from couples!'
        };
      case 'rejected':
        return {
          icon: XCircle,
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          title: 'Verification Rejected',
          message: rejectionReason || 'Your verification was not approved.',
          actionMessage: 'Please update your profile and resubmit for verification.'
        };
      default:
        return {
          icon: Clock,
          color: 'text-amber-600 dark:text-amber-400',
          bgColor: 'bg-amber-50 dark:bg-amber-900/20',
          borderColor: 'border-amber-200 dark:border-amber-800',
          title: 'Verification Pending',
          message: 'Your profile is under review by our team.',
          actionMessage: 'Complete your profile to speed up the verification process.'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className={`p-6 rounded-2xl border-2 ${config.borderColor} ${config.bgColor}`}>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full ${config.bgColor} ${config.color}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className={`text-lg font-semibold ${config.color}`}>
                {config.title}
              </h3>
              {status === 'verified' && <VerificationBadge isVerified={true} size="lg" />}
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              {config.message}
            </p>
            <p className={`text-sm font-medium ${config.color}`}>
              {config.actionMessage}
            </p>
            {verificationDate && (
              <div className="flex items-center gap-2 mt-3 text-sm text-gray-500 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>
                  {status === 'verified' ? 'Verified on' : 'Last updated'}: {formatDate(verificationDate)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Success Message for Verified Status */}
      {status === 'verified' && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-2xl border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h4 className="text-lg font-semibold text-green-800 dark:text-green-300">
              🎉 Congratulations!
            </h4>
          </div>
          <p className="text-green-700 dark:text-green-300 font-medium mb-2">
            Your account has been verified. You are now visible to customers.
          </p>
          <p className="text-green-600 dark:text-green-400 text-sm">
            Start receiving leads and grow your wedding business with WedHabesha!
          </p>
        </div>
      )}

      {/* Rejection Details */}
      {status === 'rejected' && rejectionReason && (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800 dark:text-red-300 mb-1">
                Rejection Reason
              </h4>
              <p className="text-red-700 dark:text-red-300 text-sm">
                {rejectionReason}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Verification History */}
      {verificationHistory.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Verification History
          </h4>
          <div className="space-y-3">
            {verificationHistory.map((entry, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  entry.status === 'verified' ? 'bg-green-500' :
                  entry.status === 'rejected' ? 'bg-red-500' : 'bg-amber-500'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 dark:text-white capitalize">
                      {entry.status}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(entry.date)}
                    </span>
                  </div>
                  {entry.reason && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {entry.reason}
                    </p>
                  )}
                  {entry.notes && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Notes: {entry.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationStatus;