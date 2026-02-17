import React, { useState, useEffect } from 'react';
import { Guest, guestApi } from '../../lib/api';
import { Button } from '../ui/Button';
import GuestInvitationInterface from './GuestInvitationInterface';
import BulkCommunicationInterface from './BulkCommunicationInterface';
import CommunicationHistory from './CommunicationHistory';
import CommunicationAnalytics from './CommunicationAnalytics';

interface CommunicationCenterProps {
  weddingId: number;
}

type ActiveView = 'overview' | 'invitations' | 'bulk' | 'history' | 'analytics' | 'templates';

const CommunicationCenter: React.FC<CommunicationCenterProps> = ({ weddingId }) => {
  const [activeView, setActiveView] = useState<ActiveView>('overview');
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load guests
  useEffect(() => {
    const loadGuests = async () => {
      try {
        setIsLoading(true);
        const guestData = await guestApi.getGuests(weddingId);
        setGuests(guestData);
      } catch (error) {
        console.error('Failed to load guests:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadGuests();
  }, [weddingId]);

  const guestsWithPhone = guests.filter(guest => guest.phone);
  const guestsWithoutPhone = guests.filter(guest => !guest.phone);
  const checkedInGuests = guests.filter(guest => guest.is_checked_in);
  const pendingGuests = guests.filter(guest => !guest.is_checked_in);

  const handleCloseModal = () => {
    setActiveView('overview');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (activeView === 'invitations') {
    return (
      <GuestInvitationInterface
        weddingId={weddingId}
        guests={guests}
        onClose={handleCloseModal}
      />
    );
  }

  if (activeView === 'bulk') {
    return (
      <BulkCommunicationInterface
        weddingId={weddingId}
        guests={guests}
        onClose={handleCloseModal}
      />
    );
  }

  if (activeView === 'history') {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => setActiveView('overview')}
          >
            ← Back to Overview
          </Button>
        </div>
        <CommunicationHistory weddingId={weddingId} />
      </div>
    );
  }

  if (activeView === 'templates') {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => setActiveView('overview')}
          >
            ← Back to Overview
          </Button>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-12 text-center shadow-sm">
          <svg className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-600 dark:text-slate-400">Message template management coming soon.</p>
        </div>
      </div>
    );
  }

  if (activeView === 'analytics') {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => setActiveView('overview')}
          >
            ← Back to Overview
          </Button>
        </div>
        <CommunicationAnalytics weddingId={weddingId} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards - Enhanced with dark mode */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Guests */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Total Guests</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{guests.length}</p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* With Phone Numbers */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Phone Coverage</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{guests.length > 0 ? Math.round((guestsWithPhone.length / guests.length) * 100) : 0}%</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {guestsWithPhone.length} reachable
              </p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <svg className="w-7 h-7 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Checked In */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Checked In</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{checkedInGuests.length}</p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <svg className="w-7 h-7 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Pending */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Pending</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{pendingGuests.length}</p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <svg className="w-7 h-7 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Warning for guests without phone numbers */}
      {guestsWithoutPhone.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-amber-800 dark:text-amber-300">
                {guestsWithoutPhone.length} guest{guestsWithoutPhone.length !== 1 ? 's' : ''} without phone numbers
              </div>
              <div className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                These guests won't receive invitations or updates. Consider adding their phone numbers.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Communication Actions Grid - Enhanced with specific styling */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Send QR Invitations - Primary Action */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-start space-x-4 mb-4">
            <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-2">Send QR Invitations</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Send personalized wedding invitations with QR codes for easy check-in
              </p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                  <svg className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  WhatsApp & SMS delivery
                </div>
                <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                  <svg className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Personalized messages
                </div>
                <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                  <svg className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Unique QR codes per guest
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveView('invitations')}
            disabled={guestsWithPhone.length === 0}
            className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-rose-600/20 hover:shadow-rose-600/30 disabled:shadow-none disabled:cursor-not-allowed"
          >
            Send Invitations
          </button>
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-2">
            {guestsWithPhone.length} guests ready to receive
          </p>
        </div>

        {/* Send Event Updates */}
        <button
          onClick={() => setActiveView('bulk')}
          disabled={guestsWithPhone.length === 0}
          className="group bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6 hover:border-rose-300 dark:hover:border-rose-600 hover:shadow-md transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-900/40 transition-colors">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <svg className="w-5 h-5 text-gray-400 dark:text-slate-500 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">Send Event Updates</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">
            Send important updates and announcements about wedding changes or reminders
          </p>
          <div className="text-xs text-gray-400 dark:text-slate-500">
            Venue changes, time updates, reminders
          </div>
        </button>

        {/* Bulk Messaging */}
        <button
          onClick={() => setActiveView('bulk')}
          disabled={guestsWithPhone.length === 0}
          className="group bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6 hover:border-rose-300 dark:hover:border-rose-600 hover:shadow-md transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-900/40 transition-colors">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <svg className="w-5 h-5 text-gray-400 dark:text-slate-500 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">Bulk Messaging</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">
            Send custom messages to selected groups of guests for any purpose
          </p>
          <div className="text-xs text-gray-400 dark:text-slate-500">
            Custom content, group selection, delivery tracking
          </div>
        </button>

        {/* Message Templates */}
        <button
          onClick={() => setActiveView('templates')}
          className="group bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6 hover:border-rose-300 dark:hover:border-rose-600 hover:shadow-md transition-all text-left"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center group-hover:bg-orange-200 dark:group-hover:bg-orange-900/40 transition-colors">
              <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <svg className="w-5 h-5 text-gray-400 dark:text-slate-500 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">Message Templates</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">
            Create and manage reusable message templates for different communications
          </p>
          <div className="text-xs text-gray-400 dark:text-slate-500">
            Pre-formatted messages, custom templates
          </div>
        </button>

        {/* Communication Analytics */}
        <button
          onClick={() => setActiveView('analytics')}
          className="group bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6 hover:border-rose-300 dark:hover:border-rose-600 hover:shadow-md transition-all text-left"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center group-hover:bg-pink-200 dark:group-hover:bg-pink-900/40 transition-colors">
              <svg className="w-6 h-6 text-pink-600 dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <svg className="w-5 h-5 text-gray-400 dark:text-slate-500 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">Communication Analytics</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">
            Track message delivery rates, view history, and monitor engagement
          </p>
          <div className="text-xs text-gray-400 dark:text-slate-500">
            Delivery rates, message logs, failed tracking
          </div>
        </button>

        {/* Communication History */}
        <button
          onClick={() => setActiveView('history')}
          className="group bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6 hover:border-rose-300 dark:hover:border-rose-600 hover:shadow-md transition-all text-left"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 dark:group-hover:bg-indigo-900/40 transition-colors">
              <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <svg className="w-5 h-5 text-gray-400 dark:text-slate-500 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">Message History</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">
            View complete history of all messages sent to your guests
          </p>
          <div className="text-xs text-gray-400 dark:text-slate-500">
            Full message logs, export reports
          </div>
        </button>
      </div>

      {/* Tips Card */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-bold text-blue-900 dark:text-blue-200 mb-3 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          Communication Tips
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-800 dark:text-blue-300">
          <div className="flex items-start">
            <span className="mr-2">•</span>
            <span>Send invitations at least 2 weeks before your wedding</span>
          </div>
          <div className="flex items-start">
            <span className="mr-2">•</span>
            <span>Use WhatsApp for better delivery rates in Ethiopia</span>
          </div>
          <div className="flex items-start">
            <span className="mr-2">•</span>
            <span>Send reminders 1-2 days before the wedding</span>
          </div>
          <div className="flex items-start">
            <span className="mr-2">•</span>
            <span>Keep messages concise with essential information</span>
          </div>
          <div className="flex items-start">
            <span className="mr-2">•</span>
            <span>Monitor delivery status and retry failed messages</span>
          </div>
          <div className="flex items-start">
            <span className="mr-2">•</span>
            <span>Create templates for frequently sent messages</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunicationCenter;
