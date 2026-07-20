import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, LogIn, Eye, EyeOff, User, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useSite } from '@/contexts/SiteContext';
import { toast } from '@/hooks/use-toast';
import KhmerFrame from '@/components/KhmerFrame';
import Header from '@/components/Header';
import HeaderSpacer from '@/components/HeaderSpacer';

const AuthPage: React.FC = () => {
  const { settings } = useSite();
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const telegramBtnRef = useRef<HTMLDivElement>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const primaryColor = settings.primaryColor || '#E53E3E';

  useEffect(() => {
    if (user) {
      const redirect = searchParams.get('redirect') || '/';
      navigate(redirect);
    }
  }, [user, navigate, searchParams]);

  useEffect(() => {
    if (!settings.telegramBotUsername) return;
    const container = telegramBtnRef.current;
    if (!container) return;

    container.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', settings.telegramBotUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-onauth', 'onTelegramAuth');
    script.async = true;
    container.appendChild(script);

    (window as any).onTelegramAuth = async (userData: any) => {
      setIsLoading(true);
      try {
        const { error } = await signIn('telegram', userData);
        if (error) {
          toast({ title: 'Telegram Login Failed', description: error.message, variant: 'destructive' });
        } else {
          toast({ title: 'Welcome!' });
          navigate('/');
        }
      } finally {
        setIsLoading(false);
      }
    };

    return () => {
      delete (window as any).onTelegramAuth;
      if (container.parentNode) container.innerHTML = '';
    };
  }, [settings.telegramBotUsername]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: 'Validation Error', description: 'Email and password are required', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Sign In Failed',
        description: error.message.includes('Invalid login credentials') ? 'Invalid email or password' : 'Failed to sign in',
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Welcome back!' });
      navigate('/');
    }
  };

  return (
    <>
      <Helmet>
        <title>Login - {settings.siteName}</title>
        <meta name="description" content="Sign in to access your order history" />
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

              <CardContent className="space-y-4">
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

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <div className="flex justify-center">
                  {settings.telegramBotUsername ? (
                    <div ref={telegramBtnRef} />
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full flex items-center justify-center gap-2 rounded-xl py-6 border-[#0088cc]/30 hover:bg-[#0088cc]/5"
                      onClick={() => toast({ title: 'Telegram login not configured', description: 'Contact the administrator to enable Telegram login.' })}
                    >
                      <MessageCircle className="w-5 h-5 text-[#0088cc]" />
                      <span>Login with Telegram</span>
                    </Button>
                  )}
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
