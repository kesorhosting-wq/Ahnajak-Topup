import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeaderSpacer from '@/components/HeaderSpacer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Coins, History, User as UserIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Profile {
  reward_points: number;
  wallet_balance: number;
  display_name: string;
  email: string;
}

interface PointTransaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string;
  created_at: string;
}

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user]);

  const fetchProfileData = async () => {
    setIsLoading(true);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('reward_points, wallet_balance, display_name, email')
        .eq('user_id', user?.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      const { data: transData, error: transError } = await supabase
        .from('point_transactions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (transError) throw transError;
      setTransactions(transData || []);
    } catch (error: any) {
      toast({ title: 'Error loading profile', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p>Please login to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <HeaderSpacer />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-gold">User Profile</h1>
        
        <div className="grid gap-6 md:grid-cols-2">
          {/* User Info */}
          <Card className="border-gold/30 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-gold" />
                Account Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm"><span className="font-bold">Name:</span> {profile?.display_name || 'User'}</p>
              <p className="text-sm"><span className="font-bold">Email:</span> {profile?.email}</p>
            </CardContent>
          </Card>

          {/* Points Balance */}
          <Card className="border-gold/30 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-gold" />
                Reward Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-gold">{profile?.reward_points || 0}</p>
              <p className="text-xs text-muted-foreground mt-2">Earned from topups</p>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <Card className="mt-8 border-gold/30 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-gold" />
              Point History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length > 0 ? (
              <div className="space-y-4">
                {transactions.map((t) => (
                  <div key={t.id} className="flex justify-between items-center p-3 rounded-lg bg-background/50 border border-border">
                    <div>
                      <p className="font-bold text-sm">{t.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
                    </div>
                    <p className={`font-bold ${t.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {t.amount > 0 ? '+' : ''}{t.amount}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No point transactions yet.</p>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default ProfilePage;
