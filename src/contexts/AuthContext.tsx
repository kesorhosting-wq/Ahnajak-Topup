import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';
import { handleApiError } from '@/lib/errorHandler';

// Local types replacing @supabase/supabase-js User/Session
interface User {
  id: string;
  email: string;
  display_name?: string;
  [key: string]: any;
}
interface Session {
  access_token: string;
  user: User | null;
}

interface SignUpOptions {
  displayName?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isLoading: boolean;
  signUp: (email: string, password: string, options?: SignUpOptions) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    api.auth.getSession().then(({ data }) => {
      if (data?.session && data.session.access_token) {
        setSession(data.session);
        const u = data.session.user as User;
        setUser(u);
        // Check admin role via session endpoint
        if (u) {
          fetch('/api/auth/session', {
            headers: { Authorization: `Bearer ${data.session.access_token}` },
          })
            .then(res => res.json())
            .then(result => {
              setIsAdmin(!!result.isAdmin);
            })
            .catch(() => setIsAdmin(false));
        }
      }
      setIsLoading(false);
    });

    // Listen for auth state changes (sign in/out)
    const { data: { subscription } } = api.auth.onAuthStateChange(
      (event, authUser) => {
        if (event === 'SIGNED_IN' && authUser) {
          const token = localStorage.getItem('auth_token');
          const newSession: Session = { access_token: token || '', user: authUser as User };
          setSession(newSession);
          setUser(authUser as User);
          // Check admin
          fetch('/api/auth/session', {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then(res => res.json())
            .then(result => setIsAdmin(!!result.isAdmin))
            .catch(() => setIsAdmin(false));
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, options?: SignUpOptions) => {
    try {
      const { error } = await api.auth.signUp(email, password, {
        displayName: options?.displayName || email.split('@')[0],
      });
      if (error) return { error: new Error(error.message) };
      return { error: null };
    } catch (error) {
      handleApiError(error, 'AuthContext.signUp');
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await api.auth.signIn(email, password);
      if (error) return { error: new Error(error.message) };
      return { error: null };
    } catch (error) {
      handleApiError(error, 'AuthContext.signIn');
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await api.auth.signOut();
    setSession(null);
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isAdmin,
      isLoading,
      signUp,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};