import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import QRScanner from './QRScanner';
import GuestLookup from './GuestLookup';
import CheckInStats from './CheckInStats';
import RecentCheckIns from './RecentCheckIns';
import LiveMonitoringDashboard from './LiveMonitoringDashboard';
import CheckInHistory from './CheckInHistory';

interface CheckInInterfaceProps {
  weddingId: number;
  onLogout: () => void;
}

type CheckInMode = 'scanner' | 'manual' | 'monitoring' | 'history';

const CheckInInterface: React.FC<CheckInInterfaceProps> = ({ weddingId }) => {
  const [mode, setMode] = useState<CheckInMode>('scanner');
  const [lastCheckIn, setLastCheckIn] = useState<{
    guestName: string;
    timestamp: Date;
    isDuplicate: boolean;
  } | null>(null);

  const handleCheckInSuccess = (guestName: string, isDuplicate: boolean = false) => {
    setLastCheckIn({
      guestName,
      timestamp: new Date(),
      isDuplicate
    });

    // Clear the success message after 5 seconds
    setTimeout(() => {
      setLastCheckIn(null);
    }, 5000);
  };

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {lastCheckIn && (
        <div className={`p-4 rounded-xl border ${
          lastCheckIn.isDuplicate 
            ? 'bg-orange-50 border-orange-200' 
            : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${
              lastCheckIn.isDuplicate ? 'bg-orange-400' : 'bg-green-400'
            }`} />
            <div>
              <p className={`font-medium ${
                lastCheckIn.isDuplicate ? 'text-orange-800' : 'text-green-800'
              }`}>
                {lastCheckIn.isDuplicate ? 'Already Checked In' : 'Check-In Successful'}
              </p>
              <p className={`text-sm ${
                lastCheckIn.isDuplicate ? 'text-orange-600' : 'text-green-600'
              }`}>
                {lastCheckIn.guestName} • {lastCheckIn.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mode Toggle */}
      <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Button
            onClick={() => setMode('scanner')}
            variant={mode === 'scanner' ? 'primary' : 'outline'}
            className={`flex-1 ${mode === 'scanner' 
              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md' 
              : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            📱 QR Scanner
          </Button>
          <Button
            onClick={() => setMode('manual')}
            variant={mode === 'manual' ? 'primary' : 'outline'}
            className={`flex-1 ${mode === 'manual' 
              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md' 
              : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            👤 Manual Lookup
          </Button>
          <Button
            onClick={() => setMode('monitoring')}
            variant={mode === 'monitoring' ? 'primary' : 'outline'}
            className={`flex-1 ${mode === 'monitoring' 
              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md' 
              : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            📊 Live Monitoring
          </Button>
          <Button
            onClick={() => setMode('history')}
            variant={mode === 'history' ? 'primary' : 'outline'}
            className={`flex-1 ${mode === 'history' 
              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md' 
              : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            📋 History
          </Button>
        </div>
      </div>

      {/* Content based on mode */}
      {mode === 'monitoring' ? (
        <LiveMonitoringDashboard weddingId={weddingId} />
      ) : mode === 'history' ? (
        <CheckInHistory weddingId={weddingId} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Check-In Area */}
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
              {mode === 'scanner' ? (
                <QRScanner 
                  weddingId={weddingId}
                  onCheckInSuccess={handleCheckInSuccess}
                />
              ) : (
                <GuestLookup 
                  weddingId={weddingId}
                  onCheckInSuccess={handleCheckInSuccess}
                />
              )}
            </div>
          </div>

          {/* Stats and Recent Activity */}
          <div className="space-y-6">
            <CheckInStats weddingId={weddingId} />
            <RecentCheckIns weddingId={weddingId} />
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckInInterface;