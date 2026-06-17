import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit2, Save, X, Coins } from 'lucide-react';

interface PointExchangeConfig {
  id: string;
  name: string;
  description: string;
  points_required: number;
  exchange_type: 'fixed' | 'percent';
  exchange_value: number;
  coupon_valid_days: number;
  is_active: boolean;
}

const PointExchangeTab: React.FC = () => {
  const [configs, setConfigs] = useState<PointExchangeConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<PointExchangeConfig>>({});
  const [newData, setNewData] = useState<Partial<PointExchangeConfig>>({
    name: '',
    points_required: 100,
    exchange_type: 'fixed',
    exchange_value: 1,
    coupon_valid_days: 30,
    is_active: true
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('point_exchange_configs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast({ title: 'Error fetching configs', variant: 'destructive' });
    } else {
      setConfigs((data || []) as PointExchangeConfig[]);
    }
    setIsLoading(false);
  };

  const handleAdd = async () => {
    if (!newData.name || !newData.points_required || !newData.exchange_value) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('point_exchange_configs')
      .insert([newData]);

    if (error) {
      toast({ title: 'Error adding config', variant: 'destructive' });
    } else {
      toast({ title: 'Config added successfully' });
      setNewData({
        name: '',
        points_required: 100,
        exchange_type: 'fixed',
        exchange_value: 1,
        coupon_valid_days: 30,
        is_active: true
      });
      fetchConfigs();
    }
  };

  const handleUpdate = async (id: string) => {
    const { error } = await supabase
      .from('point_exchange_configs')
      .update(editData)
      .eq('id', id);

    if (error) {
      toast({ title: 'Error updating config', variant: 'destructive' });
    } else {
      toast({ title: 'Config updated successfully' });
      setEditingId(null);
      fetchConfigs();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('point_exchange_configs')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Error deleting config', variant: 'destructive' });
    } else {
      toast({ title: 'Config deleted successfully' });
      fetchConfigs();
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-gold/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-gold" />
            Point Exchange Configuration
          </CardTitle>
          <CardDescription>Configure how users can exchange points for coupons.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-end">
            <div>
              <label className="text-sm font-medium mb-1 block">Config Name</label>
              <Input 
                placeholder="e.g. 100 Points for $1 Coupon" 
                value={newData.name}
                onChange={e => setNewData({...newData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Points Required</label>
              <Input 
                type="number" 
                value={newData.points_required}
                onChange={e => setNewData({...newData, points_required: parseInt(e.target.value)})}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Exchange Type</label>
              <div className="flex items-center gap-2 h-10">
                <span className={newData.exchange_type === 'fixed' ? 'font-bold' : ''}>Fixed ($)</span>
                <Switch 
                  checked={newData.exchange_type === 'percent'} 
                  onCheckedChange={checked => setNewData({...newData, exchange_type: checked ? 'percent' : 'fixed'})}
                />
                <span className={newData.exchange_type === 'percent' ? 'font-bold' : ''}>Percent (%)</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Exchange Value</label>
              <Input 
                type="number" 
                value={newData.exchange_value}
                onChange={e => setNewData({...newData, exchange_value: parseFloat(e.target.value)})}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Coupon Valid Days</label>
              <Input 
                type="number" 
                value={newData.coupon_valid_days}
                onChange={e => setNewData({...newData, coupon_valid_days: parseInt(e.target.value)})}
              />
            </div>
            <Button onClick={handleAdd} className="bg-gold hover:bg-gold-dark text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Add Config
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {configs.map(config => (
          <Card key={config.id} className="border-gold/30">
            <CardContent className="p-4">
              {editingId === config.id ? (
                <div className="space-y-4">
                  <Input 
                    value={editData.name} 
                    onChange={e => setEditData({...editData, name: e.target.value})} 
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input 
                      type="number" 
                      value={editData.points_required} 
                      onChange={e => setEditData({...editData, points_required: parseInt(e.target.value)})} 
                      placeholder="Points"
                    />
                    <Input 
                      type="number" 
                      value={editData.exchange_value} 
                      onChange={e => setEditData({...editData, exchange_value: parseFloat(e.target.value)})} 
                      placeholder="Value"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span>{editData.exchange_type === 'fixed' ? '$' : '%'}</span>
                      <Switch 
                        checked={editData.exchange_type === 'percent'} 
                        onCheckedChange={checked => setEditData({...editData, exchange_type: checked ? 'percent' : 'fixed'})}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}><X className="w-4 h-4" /></Button>
                      <Button size="sm" className="bg-gold" onClick={() => handleUpdate(config.id)}><Save className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold">{config.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {config.points_required} Points → {config.exchange_type === 'fixed' ? '$' : ''}{config.exchange_value}{config.exchange_type === 'percent' ? '%' : ''} Off
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Valid for {config.coupon_valid_days} days</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="icon" 
                      variant="outline" 
                      onClick={() => {
                        setEditingId(config.id);
                        setEditData(config);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="outline" 
                      className="text-destructive border-destructive/50"
                      onClick={() => handleDelete(config.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PointExchangeTab;
