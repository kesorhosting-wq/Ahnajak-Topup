import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, LogIn, UserPlus, Eye, EyeOff, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useSite } from '@/contexts/SiteContext';
import { toast } from '@/hooks/use-toast';
import KhmerFrame from '@/components/KhmerFrame';
import Header from '@/components/Header';
import HeaderSpacer from '@/components/HeaderSpacer';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

const AuthPage: React.FC = () => {
  const { settings } = useSite();
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'signin');

  const primaryColor = settings.primaryColor || '#E53E3E';

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const redirect = searchParams.get('redirect') || '/';
      navigate(redirect);
    }
  }, [user, navigate, searchParams]);

  const validateForm = () => {
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      }
      return false;
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    
    if (error) {
      let message = 'Failed to sign in';
      if (error.message.includes('Invalid login credentials')) {
        message = 'Invalid email or password';
      } else if (error.message.includes('Email not confirmed')) {
        message = 'Please confirm your email first';
      }
      toast({
        title: 'Sign In Failed',
        description: message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Welcome back!' });
      navigate('/');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsLoading(true);
    const { error } = await signUp(email, password, { displayName });
    setIsLoading(false);
    
    if (error) {
      let message = 'Failed to create account';
      if (error.message.includes('already registered')) {
        message = 'This email is already registered. Try signing in instead.';
      }
      toast({
        title: 'Sign Up Failed',
        description: message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Registration Successful',
        description: 'Please check your email to confirm your registration.',
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>Login / Register - {settings.siteName}</title>
        <meta name="description" content="Sign in or create an account to access your order history" />
      </Helmet>
      
      <Header />
      <HeaderSpacer />

      <div 
        className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-secondary/20"
        style={{ '--primary-color': primaryColor } as React.CSSProperties}
      >
        <div className="w-full max-w-md">
          <KhmerFrame className="p-0">
            <Card className="border-0 shadow-none bg-transparent">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: primaryColor }}>
                  <User className="w-8 h-8" />
                </div>
                <CardTitle className="font-display text-2xl font-black" style={{ color: primaryColor }}>{settings.siteName}</CardTitle>
                <CardDescription>Sign in to access your order history</CardDescription>
              </CardHeader>
              
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2 bg-zinc-100 dark:bg-zinc-900 rounded-xl p-1">
                    <TabsTrigger 
                      value="signin" 
                      className="data-[state=active]:text-white rounded-lg transition-all"
                      style={activeTab === 'signin' ? { backgroundColor: primaryColor } : {}}
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      Sign In
                    </TabsTrigger>
                    <TabsTrigger 
                      value="signup"
                      className="data-[state=active]:text-white rounded-lg transition-all"
                      style={activeTab === 'signup' ? { backgroundColor: primaryColor } : {}}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Register
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="signin">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Email</label>
                        <Input
                          type="email"
                          placeholder="admin@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="border-zinc-200 dark:border-zinc-800 focus:border-[var(--primary-color)] rounded-xl"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Password</label>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="border-zinc-200 dark:border-zinc-800 focus:border-[var(--primary-color)] pr-10 rounded-xl"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full text-white font-bold rounded-xl transition-all hover:brightness-95"
                        style={{ backgroundColor: primaryColor }}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Signing in...' : 'Sign In'}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Display Name</label>
                        <Input
                          type="text"
                          placeholder="Your name"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="border-zinc-200 dark:border-zinc-800 focus:border-[var(--primary-color)] rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Email</label>
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="border-zinc-200 dark:border-zinc-800 focus:border-[var(--primary-color)] rounded-xl"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Password</label>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Min. 6 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="border-zinc-200 dark:border-zinc-800 focus:border-[var(--primary-color)] pr-10 rounded-xl"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full text-white font-bold rounded-xl transition-all hover:brightness-95"
                        style={{ backgroundColor: primaryColor }}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Creating account...' : 'Create Account'}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>

                <div className="mt-6 text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Create an account to access:
                  </p>
                  <div className="flex justify-center gap-4 text-xs font-semibold">
                    <span className="flex items-center gap-1" style={{ color: primaryColor }}>
                      <User className="w-3 h-3" /> Order History
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </KhmerFrame>
        </div>
      </div>
    </>
  );
};

export default AuthPage;
