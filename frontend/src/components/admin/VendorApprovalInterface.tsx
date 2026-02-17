import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, VendorApplicationResponse, VendorApplicationStatus } from '../../lib/api';
import { Button } from '../ui/Button';

// Modern icons matching the admin dashboard design
const Icons = {
  CheckCircle: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  XCircle: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Clock: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Building: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  MapPin: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Mail: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Calendar: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  FileText: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
};

interface VendorApprovalInterfaceProps {
  className?: string;
}

export const VendorApprovalInterface: React.FC<VendorApprovalInterfaceProps> = ({ className }) => {
  const [selectedApplication, setSelectedApplication] = useState<VendorApplicationResponse | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [adminMessage, setAdminMessage] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;

  const queryClient = useQueryClient();

  // Fetch pending applications
  const { data: applicationsData, isLoading, error } = useQuery({
    queryKey: ['vendor-applications', currentPage],
    queryFn: () => adminApi.getVendorApplications(currentPage * pageSize, pageSize)
  });

  // Approve application mutation
  const approveMutation = useMutation({
    mutationFn: ({ applicationId, adminMessage, notes }: { applicationId: number; adminMessage?: string; notes?: string }) =>
      adminApi.approveVendorApplication(applicationId, adminMessage, notes),
    onSuccess: () => {
      // Invalidate and refetch the applications list
      queryClient.invalidateQueries({ queryKey: ['vendor-applications'] });
      setSelectedApplication(null);
      setReviewNotes('');
      setAdminMessage('');
    },
    onError: (error) => {
      console.error('Failed to approve application:', error);
    }
  });

  // Reject application mutation
  const rejectMutation = useMutation({
    mutationFn: ({ applicationId, reason, additionalNotes, notes }: { applicationId: number; reason: string; additionalNotes?: string; notes?: string }) =>
      adminApi.rejectVendorApplication(applicationId, reason, additionalNotes, notes),
    onSuccess: () => {
      // Invalidate and refetch the applications list
      queryClient.invalidateQueries({ queryKey: ['vendor-applications'] });
      setSelectedApplication(null);
      setRejectionReason('');
      setAdditionalNotes('');
      setReviewNotes('');
      setShowRejectModal(false);
    },
    onError: (error) => {
      console.error('Failed to reject application:', error);
    }
  });

  const handleApprove = (application: VendorApplicationResponse) => {
    setSelectedApplication(application);
  };

  const handleReject = (application: VendorApplicationResponse) => {
    setSelectedApplication(application);
    setShowRejectModal(true);
  };

  const confirmApproval = () => {
    if (selectedApplication) {
      approveMutation.mutate({
        applicationId: selectedApplication.id,
        adminMessage: adminMessage || undefined,
        notes: reviewNotes || undefined
      });
    }
  };

  const confirmRejection = () => {
    if (selectedApplication && rejectionReason.trim()) {
      rejectMutation.mutate({
        applicationId: selectedApplication.id,
        reason: rejectionReason,
        additionalNotes: additionalNotes || undefined,
        notes: reviewNotes || undefined
      });
    }
  };

  const getStatusBadge = (status: VendorApplicationStatus) => {
    const statusConfig = {
      pending: { 
        bg: 'bg-amber-50 dark:bg-amber-900/20', 
        text: 'text-amber-700 dark:text-amber-300',
        border: 'border-amber-200 dark:border-amber-800',
        icon: Icons.Clock,
        label: 'Pending Review'
      },
      under_review: { 
        bg: 'bg-blue-50 dark:bg-blue-900/20', 
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-200 dark:border-blue-800',
        icon: Icons.Clock,
        label: 'Under Review'
      },
      approved: { 
        bg: 'bg-emerald-50 dark:bg-emerald-900/20', 
        text: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-200 dark:border-emerald-800',
        icon: Icons.CheckCircle,
        label: 'Approved'
      },
      rejected: { 
        bg: 'bg-red-50 dark:bg-red-900/20', 
        text: 'text-red-700 dark:text-red-300',
        border: 'border-red-200 dark:border-red-800',
        icon: Icons.XCircle,
        label: 'Rejected'
      }
    };

    const config = statusConfig[status];
    const IconComponent = config.icon;

    return (
      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
        <IconComponent className="w-3.5 h-3.5" />
        {config.label}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-12 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading vendor applications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center p-12 ${className}`}>
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icons.XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Failed to Load Applications</h3>
        <p className="text-slate-600 dark:text-slate-400 mb-4">There was an error loading vendor applications.</p>
        <Button onClick={() => window.location.reload()} className="bg-indigo-600 hover:bg-indigo-700">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Icons.CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Vendor Applications</h2>
            <p className="text-slate-600 dark:text-slate-400">Review and approve vendor applications</p>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {applicationsData?.total || 0}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Pending Review</div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {applicationsData?.applications.length || 0}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Showing Now</div>
            </div>
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-6 mb-8">
        {applicationsData?.applications.map((application) => (
          <div key={application.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/40 dark:to-indigo-800/40 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Icons.Building className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                    {application.business_name}
                  </h3>
                  {getStatusBadge(application.status)}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center">
                  <Icons.Building className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Category</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{application.category}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg flex items-center justify-center">
                  <Icons.MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Location</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{application.location}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex items-center justify-center">
                  <Icons.Mail className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Email</p>
                  <p className="font-semibold text-slate-900 dark:text-white text-sm">{application.vendor_email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex items-center justify-center">
                  <Icons.Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Submitted</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {new Date(application.submitted_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Icons.FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Business Description</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <p className="text-slate-900 dark:text-white leading-relaxed">{application.description}</p>
              </div>
            </div>

            {application.status === 'pending' && (
              <div className="flex gap-3">
                <Button
                  onClick={() => handleApprove(application)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-200"
                >
                  <Icons.CheckCircle className="w-4 h-4 mr-2" />
                  Approve Application
                </Button>
                <Button
                  onClick={() => handleReject(application)}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all duration-200"
                >
                  <Icons.XCircle className="w-4 h-4 mr-2" />
                  Reject Application
                </Button>
              </div>
            )}

            {application.rejection_reason && (
              <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Icons.XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <p className="text-sm font-semibold text-red-800 dark:text-red-200">Rejection Reason</p>
                </div>
                <p className="text-sm text-red-700 dark:text-red-300">{application.rejection_reason}</p>
              </div>
            )}

            {application.notes && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Icons.FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">Review Notes</p>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300">{application.notes}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {applicationsData?.applications.length === 0 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icons.CheckCircle className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Applications Found</h3>
          <p className="text-slate-600 dark:text-slate-400">There are no vendor applications to review at this time.</p>
        </div>
      )}

      {/* Pagination */}
      {applicationsData && applicationsData.total > pageSize && (
        <div className="flex items-center justify-between p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Showing {currentPage * pageSize + 1} to{' '}
            {Math.min((currentPage + 1) * pageSize, applicationsData.total)} of{' '}
            {applicationsData.total} applications
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
            >
              Previous
            </Button>
            <Button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={!applicationsData.has_more}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {selectedApplication && !showRejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40 rounded-xl flex items-center justify-center">
                <Icons.CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Approve Application
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {selectedApplication.business_name}
                </p>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                Message to Vendor (Optional)
              </label>
              <textarea
                value={adminMessage}
                onChange={(e) => setAdminMessage(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 transition-colors"
                rows={3}
                placeholder="Congratulations! Your vendor application has been approved..."
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                This message will be sent to the vendor in their notification.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                Internal Notes (Optional)
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 transition-colors"
                rows={2}
                placeholder="Add any internal notes about this approval..."
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={confirmApproval}
                disabled={approveMutation.isPending}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {approveMutation.isPending ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Approving...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Icons.CheckCircle className="w-4 h-4" />
                    Confirm Approval
                  </div>
                )}
              </Button>
              <Button
                onClick={() => {
                  setSelectedApplication(null);
                  setReviewNotes('');
                  setAdminMessage('');
                }}
                className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-semibold transition-colors"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {selectedApplication && showRejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/40 dark:to-red-800/40 rounded-xl flex items-center justify-center">
                <Icons.XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Reject Application
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {selectedApplication.business_name}
                </p>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 transition-colors"
                rows={3}
                placeholder="Please provide a reason for rejection..."
                required
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                This will be sent to the vendor in their notification.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                Additional Notes (Optional)
              </label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 transition-colors"
                rows={2}
                placeholder="Add any additional notes for the vendor..."
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                These notes will also be included in the notification.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                Internal Notes (Optional)
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 transition-colors"
                rows={2}
                placeholder="Add any internal notes..."
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={confirmRejection}
                disabled={rejectMutation.isPending || !rejectionReason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rejectMutation.isPending ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Rejecting...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Icons.XCircle className="w-4 h-4" />
                    Confirm Rejection
                  </div>
                )}
              </Button>
              <Button
                onClick={() => {
                  setSelectedApplication(null);
                  setRejectionReason('');
                  setAdditionalNotes('');
                  setReviewNotes('');
                  setShowRejectModal(false);
                }}
                className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-semibold transition-colors"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};