import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { apiClient, User, AuthResponse } from '../lib/api';
import { ToastProvider } from '../components/ui/Toast';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ user?: User; requires2FA?: boolean }>;
  signInWithPhone: (phone: string, password: string) => Promise<{ user?: User; requires2FA?: boolean }>;
  signInWith2FA: (phone: string, password: string, token: string) => Promise<User>;
  signUpWithEmail: (email: string, password: string, userData: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true; // Prevent state updates if component unmounts
    
    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('Auth loading timeout - setting loading to false');
        setLoading(false);
      }
    }, 10000); // 10 second timeout
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!isMounted) return; // Prevent state updates if unmounted
        
        clearTimeout(loadingTimeout); // Clear timeout since auth state changed
        
        setFirebaseUser(firebaseUser);
        
        if (firebaseUser) {
          try {
            // For Google Sign-In users, sync with backend
            const idToken = await firebaseUser.getIdToken();
            const response = await apiClient.post<AuthResponse>('/api/v1/auth/google-signin', {
              id_token: idToken,
            });
            if (isMounted) {
              setUser(response.user);
            }
          } catch (error) {
            console.error('Failed to sync Firebase user with backend:', error);
            if (isMounted) {
              setUser(null);
            }
          }
        } else {
          // Check for JWT token in localStorage (traditional auth)
          const jwtToken = localStorage.getItem('jwt_token');
          if (jwtToken) {
            try {
              const userData = await apiClient.get<User>('/api/v1/auth/me');
              if (isMounted) {
                setUser(userData);
              }
            } catch (error) {
              console.error('Failed to get user data:', error);
              localStorage.removeItem('jwt_token');
              if (isMounted) {
                setUser(null);
              }
            }
          } else {
            if (isMounted) {
              setUser(null);
            }
          }
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        if (isMounted) {
          setUser(null);
        }
      } finally {
        // Always set loading to false, regardless of success or failure
        if (isMounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false; // Mark as unmounted
      clearTimeout(loadingTimeout);
      unsubscribe();
    };
  }, []); // Remove loading dependency to prevent infinite re-renders

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      
      if (result.user) {
        // Google sign-in successful, onAuthStateChanged will handle backend sync
      }
    } catch (error: any) {
      console.error('Google sign-in failed:', error);
      setLoading(false);
      
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Google sign-in was cancelled. Please try again.');
      } else if (error.code === 'auth/popup-blocked') {
        throw new Error('Popup was blocked by browser. Please allow popups and try again.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        throw new Error('Sign-in was cancelled. Please try again.');
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error('Network error. Please check your connection and try again.');
      } else {
        throw new Error(error.message || 'Google sign-in failed. Please try again.');
      }
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // Call login endpoint which handles 2FA check internally
      const response = await apiClient.post<AuthResponse>('/api/v1/auth/login', {
        email,
        password,
      });
      
      // Check if 2FA is required (backend returns requires2FA: true)
      if (response.requires2FA) {
        // Return indication that 2FA is required
        return { requires2FA: true };
      }
      
      // If no 2FA required, store token and set user
      localStorage.setItem('jwt_token', response.access_token);
      setUser(response.user);
      
      // Return user data for redirect logic
      return { user: response.user };
    } catch (error) {
      console.error('Email sign-in failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithPhone = async (phone: string, password: string) => {
    try {
      setLoading(true);
      
      // First check if 2FA is required
      const check2FAResponse = await apiClient.post<{ requires2FA: boolean }>('/api/v1/auth/login/check-2fa', {
        phone,
        password,
      });
      
      if (check2FAResponse.requires2FA) {
        // Return indication that 2FA is required
        return { requires2FA: true };
      }
      
      // If no 2FA required, proceed with normal login
      const response = await apiClient.post<AuthResponse>('/api/v1/auth/login', {
        phone,
        password,
      });
      
      localStorage.setItem('jwt_token', response.access_token);
      setUser(response.user);
      
      // Return user data for redirect logic
      return { user: response.user };
    } catch (error) {
      console.error('Phone sign-in failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWith2FA = async (phone: string, password: string, token: string) => {
    try {
      setLoading(true);
      const response = await apiClient.post<AuthResponse>('/api/v1/auth/2fa/verify', {
        phone,
        password,
        token,
      });
      
      localStorage.setItem('jwt_token', response.access_token);
      setUser(response.user);
      
      return response.user;
    } catch (error) {
      console.error('2FA sign-in failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string, userData: any) => {
    try {
      setLoading(true);
      
      // Determine the endpoint based on user type
      const endpoint = userData.user_type === 'VENDOR' 
        ? '/api/v1/auth/register/vendor' 
        : '/api/v1/auth/register/couple';
      
      const response = await apiClient.post<AuthResponse>(endpoint, {
        email,
        password,
        ...userData,
      });
      
      localStorage.setItem('jwt_token', response.access_token);
      setUser(response.user);
    } catch (error) {
      console.error('Email sign-up failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      
      // Sign out from Firebase if user is signed in with Google
      if (firebaseUser) {
        await signOut(auth);
      }
      
      // Clear JWT token
      localStorage.removeItem('jwt_token');
      
      // Clear user state
      setUser(null);
      setFirebaseUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    firebaseUser,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signInWithPhone,
    signInWith2FA,
    signUpWithEmail,
    logout,
  };

  return (
    <ToastProvider>
      <AuthContext.Provider value={value}>
        {children}
      </AuthContext.Provider>
    </ToastProvider>
  );
};