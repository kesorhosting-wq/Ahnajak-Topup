import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSite } from '@/contexts/SiteContext';
import { db } from '@/integrations/db/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeaderSpacer from '@/components/HeaderSpacer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Coins, Ticket, ArrowRight, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ExchangeConfig {
  id: string;
  name: string;
  points_required: number;
  exchange_type: 'fixed' | 'percent';
  exchange_value: number;
}

interface UserCoupon {
  id: string;
  code: string;
  discount_type: 'fixed' | 'percent';
  discount_value: number;
  is_used: boolean;
  expires_at: string;
}

const PointExchangePage: React.FC = () => {
  const { user } = useAuth();
  const { settings } = useSite();
  const [configs, setConfigs] = useState<ExchangeConfig[]>([]);
  const [userPoints, setUserPoints] = useState(0);
  const [userCoupons, setUserCoupons] = useState<UserCoupon[]>([]);
  const [isExchanging, setIsExchanging] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch active exchange configs
      const { data: configData } = await db
        .from('point_exchange_configs')
        .select('*')
        .eq('is_active', true);
      setConfigs((configData || []) as ExchangeConfig[]);

      if (user) {
        // Fetch user points
        const { data: profileData } = await db
          .from('profiles')
          .select('reward_points')
          .eq('user_id', user.id)
          .single();
        setUserPoints(profileData?.reward_points || 0);

        // Fetch user coupons
        const { data: couponData } = await db
          .from('coupons')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_used', false)
          .order('created_at', { ascending: false });
        setUserCoupons((couponData || []) as UserCoupon[]);
      }
    } catch (error: any) {
      toast({ title: 'Error fetching data', description: error.message, variant: 'destructive' });
    }
  };

  const handleExchange = async (configId: string) => {
    if (!user) {
      toast({ title: 'Please login to exchange points', variant: 'destructive' });
      return;
    }

    setIsExchanging(configId);
    try {
      const { data, error } = await db.rpc('exchange_points_for_coupon', { config_id: configId });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        toast({ title: 'Exchange successful!', description: `Your coupon code is: ${result.coupon_code}` });
        fetchData(); // Refresh points and coupons
      } else {
        toast({ title: 'Exchange failed', description: result?.message, variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Error processing exchange', description: error.message, variant: 'destructive' });
    } finally {
      setIsExchanging(null);
    }
  };

  const primaryColor = settings.primaryColor || '#E53E3E';

  return (
    <div className="min-h-screen flex flex-col bg-transparent theme-accented-page" style={{ '--primary-color': primaryColor } as React.CSSProperties}>
      <Header />
      <HeaderSpacer />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold text-gold">Point Exchange</h1>
          <div className="bg-gold/10 border border-gold/30 rounded-full px-6 py-2 flex items-center gap-3">
            <Coins className="w-6 h-6 text-gold" />
            <span className="text-xl font-bold text-gold">{userPoints} Points Available</span>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Exchange Options */}
          <section className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-gold" />
              Available Exchanges
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {configs.map((config) => (
                <Card key={config.id} className="border-gold/30 bg-card/50 overflow-hidden group hover:border-gold transition-colors">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{config.name}</CardTitle>
                    <CardDescription>
                      Cost: <span className="font-bold text-gold">{config.points_required} Points</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4">
                      <div className="bg-gold/5 rounded-lg p-3 text-center border border-gold/10">
                        <span className="text-2xl font-black text-gold">
                          {config.exchange_type === 'fixed' ? '$' : ''}
                          {config.exchange_value}
                          {config.exchange_type === 'percent' ? '%' : ''} OFF
                        </span>
                      </div>
                      <Button 
                        onClick={() => handleExchange(config.id)}
                        disabled={userPoints < config.points_required || isExchanging === config.id}
                        className="w-full bg-gold hover:bg-gold-dark text-primary-foreground"
                      >
                        {isExchanging === config.id ? 'Processing...' : 'Exchange Now'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* User Coupons */}
          <section className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Ticket className="w-5 h-5 text-gold" />
              Your Unused Coupons
            </h2>
            <div className="space-y-4">
              {userCoupons.length > 0 ? (
                userCoupons.map((coupon) => (
                  <div key={coupon.id} className="relative bg-card/50 border-2 border-dashed border-gold/40 rounded-xl p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-gold/20 p-3 rounded-full">
                        <Ticket className="w-8 h-8 text-gold" />
                      </div>
                      <div>
                        <p className="text-2xl font-black tracking-widest text-gold">{coupon.code}</p>
                        <p className="text-xs text-muted-foreground uppercase font-bold">
                          {coupon.discount_type === 'fixed' ? '$' : ''}{coupon.discount_value}{coupon.discount_type === 'percent' ? '%' : ''} Discount
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Expires on:</p>
                      <p className="text-sm font-bold">{new Date(coupon.expires_at).toLocaleDateString()}</p>
                    </div>
                    {/* Punch holes for "coupon" look */}
                    <div className="absolute top-1/2 -left-3 w-6 h-6 bg-background rounded-full -translate-y-1/2 border-r border-gold/20"></div>
                    <div className="absolute top-1/2 -right-3 w-6 h-6 bg-background rounded-full -translate-y-1/2 border-l border-gold/20"></div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-card/20 rounded-xl border border-dashed border-border">
                  <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                  <p className="text-muted-foreground">You don't have any active coupons yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Exchange your points to get one!</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PointExchangePage;
