import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient';
import { cacheInvalidationService } from './lib/cacheInvalidation';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { createLazyRoute } from './lib/lazyLoading';

// Components
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/ui/ErrorBoundary';
import OfflineBanner from './components/ui/OfflineBanner';
import PageLoader from './components/ui/PageLoader';

// Lazy-loaded pages for better performance
const HomePage = createLazyRoute(() => import('./pages/HomePage'));
const AboutPage = createLazyRoute(() => import('./pages/AboutPage'));
const LoginPage = createLazyRoute(() => import('./pages/LoginPage'));
const RegisterPage = createLazyRoute(() => import('./pages/RegisterPage'));
const VendorDirectoryPage = createLazyRoute(() => import('./pages/VendorDirectoryPage'));
const DashboardPage = createLazyRoute(() => import('./pages/DashboardPage'));
const AnalyticsPage = createLazyRoute(() => import('./pages/AnalyticsPage'));
const VendorDashboardPage = createLazyRoute(() => import('./pages/VendorDashboardPage'));
const StaffLoginPage = createLazyRoute(() => import('./pages/StaffLoginPage'));
const StaffDashboardPage = createLazyRoute(() => import('./pages/StaffDashboardPage'));
const StaffCheckInPage = createLazyRoute(() => import('./pages/StaffCheckInPage'));
const AdminDashboardPage = createLazyRoute(() => import('./pages/AdminDashboardPage'));
const PublicInvitationPage = createLazyRoute(() => import('./pages/PublicInvitationPage'));
const PricingPage = createLazyRoute(() => import('./pages/PricingPage'));
const ErrorPage = createLazyRoute(() => import('./pages/ErrorPage'));

// Company pages with createLazyRoute
const CareersPage = createLazyRoute(() => import('./pages/CareersPage'));
const PressMediaPage = createLazyRoute(() => import('./pages/PressMediaPage'));
const PrivacyPage = createLazyRoute(() => import('./pages/PrivacyPage'));
const TermsPage = createLazyRoute(() => import('./pages/TermsPage'));
const SitemapPage = createLazyRoute(() => import('./pages/SitemapPage'));
const TemplatesPage = createLazyRoute(() => import('./pages/TemplatesPage'));

function App() {
  // Initialize cache invalidation service with query client
  React.useEffect(() => {
    cacheInvalidationService.setQueryClient(queryClient);
  }, []);

  return (
    <ErrorBoundary level="global">
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <ThemeProvider>
            <AuthProvider>
              <Router>
                <OfflineBanner />
                <div className="min-h-screen bg-white">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/pricing" element={<PricingPage />} />
                  <Route path="/careers" element={<CareersPage />} />
                  <Route path="/press" element={<PressMediaPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/sitemap" element={<SitemapPage />} />
                  <Route path="/templates" element={<TemplatesPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/vendors" element={<VendorDirectoryPage />} />
                  <Route path="/staff" element={<StaffLoginPage />} />
                  <Route path="/staff/dashboard" element={<StaffDashboardPage />} />
                  <Route path="/staff/checkin" element={<StaffCheckInPage />} />
                  {/* Public invitation page - no authentication required */}
                  <Route path="/:weddingCode/:guestCode" element={<PublicInvitationPage />} />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute requiredUserType="COUPLE">
                        <ErrorBoundary level="page">
                          <DashboardPage />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/analytics/:weddingId"
                    element={
                      <ProtectedRoute requiredUserType="COUPLE">
                        <ErrorBoundary level="page">
                          <AnalyticsPage />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/vendor/dashboard"
                    element={
                      <ProtectedRoute requiredUserType="VENDOR">
                        <ErrorBoundary level="page">
                          <VendorDashboardPage />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/dashboard"
                    element={
                      <ProtectedRoute requiredUserType="ADMIN">
                        <ErrorBoundary level="page">
                          <AdminDashboardPage />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/dashboard/full"
                    element={
                      <ProtectedRoute requiredUserType="ADMIN">
                        <ErrorBoundary level="page">
                          <AdminDashboardPage />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    }
                  />
                  {/* Error page for unmatched routes */}
                  <Route path="*" element={<ErrorPage />} />
                </Routes>
              </div>
            </Router>
          </AuthProvider>
        </ThemeProvider>
        </LanguageProvider>
        {/* Only show dev tools in development */}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
