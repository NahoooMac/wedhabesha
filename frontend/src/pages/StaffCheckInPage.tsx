import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StaffAuthForm from '../components/staff/StaffAuthForm';
import CheckInInterface from '../components/staff/CheckInInterface';
import { Card } from '../components/ui/Card';

const StaffCheckInPage: React.FC = () => {
  const [staffSession, setStaffSession] = useState<{
    sessionToken: string;
    weddingId: number;
    expiresIn: number;
  } | null>(null);
  const navigate = useNavigate();

  const handleAuthSuccess = (session: {
    sessionToken: string;
    weddingId: number;
    expiresIn: number;
  }) => {
    setStaffSession(session);
    // Store session token for API calls
    localStorage.setItem('staff_session_token', session.sessionToken);
    localStorage.setItem('staff_wedding_id', session.weddingId.toString());
  };

  const handleLogout = () => {
    setStaffSession(null);
    localStorage.removeItem('staff_session_token');
    localStorage.removeItem('staff_wedding_id');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {!staffSession ? (
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Staff Check-In
              </h1>
              <p className="text-gray-600">
                Enter wedding code and PIN to access check-in system
              </p>
            </div>
            <Card className="p-6">
              <StaffAuthForm onAuthSuccess={handleAuthSuccess} />
            </Card>
          </div>
        ) : (
          <CheckInInterface 
            weddingId={staffSession.weddingId}
            onLogout={handleLogout}
          />
        )}
      </div>
    </div>
  );
};

export default StaffCheckInPage;