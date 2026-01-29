import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, RefreshCw, Search, AlertTriangle, FileQuestion } from 'lucide-react';
import { Button } from '../components/ui/Button';

interface ErrorPageProps {
  error?: Error;
  resetError?: () => void;
}

const ErrorPage: React.FC<ErrorPageProps> = ({ error: propError, resetError }) => {
  const navigate = useNavigate();
  
  // Since we're not using data router, we'll work with prop errors or assume it's a 404
  const error = propError;
  
  const getErrorInfo = () => {
    if (error instanceof Error) {
      return {
        status: 500,
        title: 'Something went wrong',
        message: error.message || 'An unexpected error occurred. Please try again later.',
        isNotFound: false,
        icon: <AlertTriangle className="w-16 h-16 text-rose-500" />,
      };
    }
    
    // If no error prop is provided, assume it's a 404 (unmatched route)
    return {
      status: 404,
      title: 'Page Not Found',
      message: "We couldn't find the page you're looking for. It might have been moved or deleted.",
      isNotFound: true,
      icon: <FileQuestion className="w-16 h-16 text-purple-500" />,
    };
  };

  const errorInfo = getErrorInfo();

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoBack = () => {
    window.history.back();
  };

  const handleReload = () => {
    if (resetError) {
      resetError();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
      
      {/* Background Animated Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[600px] h-[600px] bg-purple-200/40 rounded-full blur-[100px] animate-pulse dark:bg-purple-900/20 mix-blend-multiply" />
        <div className="absolute top-[20%] -right-[10%] w-[500px] h-[500px] bg-rose-200/40 rounded-full blur-[100px] animate-pulse animation-delay-2000 dark:bg-rose-900/20 mix-blend-multiply" />
        <div className="absolute bottom-0 left-[20%] w-[400px] h-[400px] bg-blue-200/40 rounded-full blur-[100px] animate-pulse animation-delay-4000 dark:bg-blue-900/20 mix-blend-multiply" />
      </div>

      <div className="relative w-full max-w-lg z-10 animate-fade-in-up">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700 overflow-hidden">
          
          {/* Top Illustration Area */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-12 flex justify-center border-b border-gray-100 dark:border-gray-700 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5"></div>
            <div className="relative z-10 p-6 bg-white dark:bg-gray-800 rounded-full shadow-lg animate-float">
               {errorInfo.icon}
            </div>
            
            {/* Floating particles */}
            <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-rose-400 rounded-full animate-ping"></div>
            <div className="absolute bottom-1/3 right-1/3 w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
          </div>

          <div className="p-8 md:p-10 text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
              {errorInfo.title}
            </h1>
            
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
              {errorInfo.message}
            </p>

            {process.env.NODE_ENV === 'development' && error instanceof Error && (
              <div className="text-left mb-8">
                <details className="group bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-xl overflow-hidden transition-all duration-300 open:pb-4">
                  <summary className="cursor-pointer p-4 font-medium text-rose-700 dark:text-rose-300 flex items-center justify-between group-hover:bg-rose-100/50 dark:group-hover:bg-rose-900/20 transition-colors">
                    <span>Developer Error Details</span>
                    <span className="text-xs uppercase tracking-wider bg-rose-200 dark:bg-rose-800 text-rose-800 dark:text-rose-100 px-2 py-0.5 rounded">Dev Mode</span>
                  </summary>
                  <pre className="px-4 text-xs text-rose-800 dark:text-rose-300 overflow-auto whitespace-pre-wrap font-mono max-h-40">
                    {error.message}
                    {error.stack && '\n\nStack trace:\n' + error.stack}
                  </pre>
                </details>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={handleGoHome}
                className="bg-gray-900 hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 text-white rounded-xl h-12 px-6 shadow-lg shadow-gray-500/20"
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
              
              {!errorInfo.isNotFound ? (
                <Button 
                  variant="outline" 
                  onClick={handleReload}
                  className="border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl h-12 px-6"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={handleGoBack}
                  className="border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl h-12 px-6"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </Button>
              )}
            </div>

            {errorInfo.isNotFound && (
              <div className="mt-10 pt-8 border-t border-gray-100 dark:border-gray-700">
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">
                  Popular Destinations
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <a href="/dashboard" className="text-sm text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1">
                    <Search className="w-3 h-3" /> Dashboard
                  </a>
                  <span className="text-gray-300 dark:text-gray-600">•</span>
                  <a href="/vendors" className="text-sm text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1">
                    <Search className="w-3 h-3" /> Find Vendors
                  </a>
                  <span className="text-gray-300 dark:text-gray-600">•</span>
                  <a href="/staff" className="text-sm text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1">
                    <Search className="w-3 h-3" /> Staff Portal
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="text-center mt-8 text-sm text-gray-400 dark:text-gray-500">
          Error Code: <span className="font-mono">{errorInfo.status}</span>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;