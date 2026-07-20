import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';
import { handleApiError } from '@/lib/errorHandler';

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

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isLoading: boolean;
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
    api.auth.getSession().then(({ data }) => {
      if (data?.session && data.session.access_token) {
        setSession(data.session);
        const u = data.session.user as User;
        setUser(u);
        if (u) {
          api.get('/auth/session').then(({ data }) => {
            setIsAdmin(!!(data as any)?.isAdmin);
          }).catch(() => setIsAdmin(false));
        }
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = api.auth.onAuthStateChange(
      (event, authUser) => {
        if (event === 'SIGNED_IN' && authUser) {
          const token = localStorage.getItem('auth_token');
          const newSession: Session = { access_token: token || '', user: authUser as User };
          setSession(newSession);
          setUser(authUser as User);
          api.get('/auth/session').then(({ data }) => {
            setIsAdmin(!!(data as any)?.isAdmin);
          }).catch(() => setIsAdmin(false));
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

  const signIn = async (emailOrMethod: string, passwordOrData?: any) => {
    try {
      if (emailOrMethod === 'telegram') {
        const { error } = await api.auth.signInWithTelegram(passwordOrData);
        if (error) return { error: new Error(error.message) };
        return { error: null };
      }
      const { error } = await api.auth.signIn(emailOrMethod, passwordOrData);
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