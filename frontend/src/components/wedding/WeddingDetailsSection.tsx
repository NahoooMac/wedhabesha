import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Calendar, MapPin, Users, Eye, EyeOff, RefreshCw, Edit3, Copy, Check } from 'lucide-react';
import WeddingEditModal from './WeddingEditModal';
import EmbeddedMap from '../map/EmbeddedMap';

interface WeddingDetailsSectionProps {
  wedding: {
    id: number;
    wedding_date: string;
    venue_name: string;
    venue_address?: string;
    venue_latitude?: number | null;
    venue_longitude?: number | null;
    expected_guests: number;
    wedding_code?: string;
    staff_pin?: string;
  };
  onUpdatePin?: (newPin: string) => Promise<void>;
  onRefreshCode?: () => Promise<void>;
}

const WeddingDetailsSection: React.FC<WeddingDetailsSectionProps> = ({
  wedding,
  onUpdatePin,
  onRefreshCode
}) => {
  const [showPin, setShowPin] = useState(false);
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState<'code' | 'pin' | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleUpdatePin = async () => {
    if (!newPin || newPin.length !== 6 || !onUpdatePin) return;
    
    setIsUpdatingPin(true);
    try {
      await onUpdatePin(newPin);
      setNewPin('');
    } catch (error) {
      console.error('Failed to update PIN:', error);
    } finally {
      setIsUpdatingPin(false);
    }
  };

  const handleRefreshCode = async () => {
    if (!onRefreshCode) return;
    
    setIsRefreshing(true);
    try {
      await onRefreshCode();
    } catch (error) {
      console.error('Failed to refresh code:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'code' | 'pin') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end">
        <div className="flex gap-2">
          {/* <Button variant="outline" size="sm" className="text-rose-600 border-rose-300 hover:bg-rose-50">
            Preview Page
          </Button>
          <Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white">
            Share Invite
          </Button> */}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Staff Access Management */}
        <Card className="border-gray-200 bg-white">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Staff Access Management
            </CardTitle>
            <p className="text-sm text-gray-600">
              Manage wedding code and staff PIN for check-in access
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Wedding ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                WEDDING ID
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                  <span className="text-lg font-mono font-bold text-gray-900">
                    {wedding.wedding_code || 'LOADING...'}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => wedding.wedding_code && copyToClipboard(wedding.wedding_code, 'code')}
                  className="px-3"
                >
                  {copied === 'code' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshCode}
                  disabled={isRefreshing}
                  className="px-3"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Share this QR with your team
              </p>
            </div>

            {/* Staff PIN */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                STAFF PIN
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                  <span className="text-lg font-mono font-bold text-gray-900">
                    {showPin ? (wedding.staff_pin || '••••••') : '••••••'}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPin(!showPin)}
                  className="px-3"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => wedding.staff_pin && copyToClipboard(wedding.staff_pin, 'pin')}
                  className="px-3"
                >
                  {copied === 'pin' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Used for staff authentication
              </p>
            </div>

            {/* Update PIN */}
            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="Enter 6-digit PIN"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="flex-1"
                  maxLength={6}
                />
                <Button
                  onClick={handleUpdatePin}
                  disabled={newPin.length !== 6 || isUpdatingPin}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isUpdatingPin ? 'Updating...' : 'Update PIN'}
                </Button>
              </div>
            </div>

            {/* Staff Login Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Staff Login Instructions:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Staff should go to: <code className="bg-blue-100 px-1 rounded">localhost:3000/staff</code></li>
                <li>• Enter the Wedding ID: <strong>{wedding.wedding_code}</strong></li>
                <li>• Enter the 6-digit Staff PIN you set</li>
                <li>• Click "Sign In" to access the check-in dashboard</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Wedding Details */}
        <Card className="border-gray-200 bg-white">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-900">
                Wedding Details
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700" onClick={() => setShowEditModal(true)}>
                <Edit3 className="w-4 h-4 mr-1" />
                Edit Details
              </Button>
            </div>
            <p className="text-sm text-gray-600">
              Your wedding information and venue details
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Wedding Date */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-rose-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-rose-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-1">Wedding Date</h3>
                <p className="text-lg font-semibold text-rose-600">
                  {formatDate(wedding.wedding_date)}
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(wedding.wedding_date) > new Date() 
                    ? `${Math.ceil((new Date(wedding.wedding_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days to go`
                    : 'Wedding day has passed'
                  }
                </p>
              </div>
            </div>

            {/* Guest Count */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-1">Expected Guests</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {wedding.expected_guests}
                </p>
                <p className="text-sm text-gray-500">
                  Currently 375 filled
                </p>
              </div>
            </div>

            {/* Venue */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-1">Venue</h3>
                <p className="text-lg font-semibold text-gray-900">
                  {wedding.venue_name}
                </p>
                <p className="text-sm text-gray-500">
                  {wedding.venue_address || 'Addis Ababa, Ethiopia'}
                </p>
              </div>
            </div>

            {/* Embedded Map */}
            <div className="mt-6">
              <EmbeddedMap 
                venueName={wedding.venue_name}
                venueAddress={wedding.venue_address}
                latitude={wedding.venue_latitude}
                longitude={wedding.venue_longitude}
                className="w-full h-48"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wedding Edit Modal */}
      {showEditModal && (
        <WeddingEditModal
          wedding={wedding}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            // Refresh the wedding data if needed
          }}
        />
      )}
    </div>
  );
};

export default WeddingDetailsSection;