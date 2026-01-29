import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const AdminDashboardTest: React.FC = () => {
  const { user, logout } = useAuth();

  // Redirect if not an admin
  if (!user || user.user_type !== 'ADMIN') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🎉 Admin Dashboard Test - SUCCESS!
          </h1>
          
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-green-800 mb-2">
                Authentication Status: ✅ LOGGED IN
              </h2>
              <p className="text-green-700">
                <strong>User ID:</strong> {user.id}<br/>
                <strong>Email:</strong> {user.email}<br/>
                <strong>User Type:</strong> {user.user_type}<br/>
                <strong>Auth Provider:</strong> {user.auth_provider}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-blue-800 mb-2">
                Routing Status: ✅ WORKING
              </h2>
              <p className="text-blue-700">
                You have successfully accessed the admin dashboard route at <code>/admin/dashboard</code>
              </p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-purple-800 mb-2">
                Next Steps
              </h2>
              <p className="text-purple-700">
                The admin dashboard routing and authentication are working correctly. 
                The issue was likely with component imports or complex component rendering.
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={() => window.location.href = '/admin/dashboard'}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
              >
                Go to Full Admin Dashboard
              </button>
              
              <button
                onClick={logout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardTest;