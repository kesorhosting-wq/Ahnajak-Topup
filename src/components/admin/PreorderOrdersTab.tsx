import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  RefreshCw, Package, CheckCircle, XCircle, Clock, CreditCard, Play, ChevronDown, AlertTriangle,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PreorderOrder {
  id: string;
  game_name: string;
  package_name: string;
  player_id: string;
  server_id: string | null;
  player_name: string | null;
  amount: number;
  currency: string;
  payment_method: string | null;
  status: string;
  status_message: string | null;
  g2bulk_order_id: string | null;
  g2bulk_product_id: string | null;
  scheduled_fulfill_at: string | null;
  created_at: string;
}

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  notpaid: { icon: <AlertTriangle className="w-4 h-4" />, color: 'bg-yellow-500', label: 'Not Paid' },
  paid: { icon: <CreditCard className="w-4 h-4" />, color: 'bg-emerald-500', label: 'Paid' },
  processing: { icon: <RefreshCw className="w-4 h-4 animate-spin" />, color: 'bg-blue-500', label: 'Processing' },
  completed: { icon: <CheckCircle className="w-4 h-4" />, color: 'bg-green-500', label: 'Completed' },
  failed: { icon: <XCircle className="w-4 h-4" />, color: 'bg-red-500', label: 'Failed' },
};

const allStatuses = ['notpaid', 'paid', 'processing', 'completed', 'failed'];

const PreorderOrdersTab: React.FC = () => {
  const [orders, setOrders] = useState<PreorderOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [processingOrders, setProcessingOrders] = useState<Record<string, boolean>>({});

  useEffect(() => { loadOrders(); }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-preorder-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'preorder_orders' }, () => {
        loadOrders();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('preorder_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setOrders((data || []) as PreorderOrder[]);
    } catch (error) {
      console.error('Error loading preorder orders:', error);
      toast({ title: 'Failed to load pre-order orders', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('preorder_orders')
        .update({ status, status_message: `Manually set to ${status}` })
        .eq('id', orderId);
      if (error) throw error;
      toast({ title: `Status updated to ${statusConfig[status]?.label || status}` });
      loadOrders();
    } catch (error) {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    }
  };

  const processOrder = async (order: PreorderOrder) => {
    if (!order.g2bulk_product_id) {
      toast({ title: 'No G2Bulk product linked', variant: 'destructive' });
      return;
    }
    setProcessingOrders(prev => ({ ...prev, [order.id]: true }));
    try {
      // Use process-topup edge function but adapt for preorder
      const { data, error } = await supabase.functions.invoke('process-topup', {
        body: { action: 'fulfill', orderId: order.id, isPreorder: true },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: 'Pre-order sent to G2Bulk for processing!' });
      } else {
        toast({ title: 'Processing failed', description: data?.error, variant: 'destructive' });
      }
      loadOrders();
    } catch (error) {
      toast({ title: 'Failed to process order', variant: 'destructive' });
    } finally {
      setProcessingOrders(prev => ({ ...prev, [order.id]: false }));
    }
  };

  const filteredOrders = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  const stats = {
    total: orders.length,
    notpaid: orders.filter(o => o.status === 'notpaid').length,
    paid: orders.filter(o => o.status === 'paid').length,
    processing: orders.filter(o => o.status === 'processing').length,
    completed: orders.filter(o => o.status === 'completed').length,
    failed: orders.filter(o => o.status === 'failed').length,
  };

  if (isLoading) {
    return (
      <Card className="border-gold/30">
        <CardContent className="p-8 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gold" />
          <p className="mt-4 text-muted-foreground">Loading pre-order orders...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="border-gold/30">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/30">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-yellow-500">{stats.notpaid}</p>
            <p className="text-xs text-muted-foreground">Not Paid</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/30">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-emerald-500">{stats.paid}</p>
            <p className="text-xs text-muted-foreground">Paid</p>
          </CardContent>
        </Card>
        <Card className="border-blue-500/30">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-blue-500">{stats.processing}</p>
            <p className="text-xs text-muted-foreground">Processing</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/30">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-green-500">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card className="border-red-500/30">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-red-500">{stats.failed}</p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      <Card className="border-gold/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-gold" />
              Pre-order Orders
            </CardTitle>
            <Button variant="outline" size="sm" onClick={loadOrders}>
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            {['all', ...allStatuses].map(status => (
              <Button
                key={status}
                variant={filter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(status)}
                className={filter === status ? 'bg-gold hover:bg-gold/90' : ''}
              >
                {status === 'all' ? 'All' : statusConfig[status]?.label || status}
              </Button>
            ))}
          </div>

          {filteredOrders.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No pre-order orders found</p>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map(order => {
                const info = statusConfig[order.status] || statusConfig.notpaid;
                return (
                  <div key={order.id} className="p-4 rounded-lg border border-border bg-card hover:bg-secondary/50 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={`${info.color} text-white`}>
                            {info.icon}
                            <span className="ml-1">{info.label}</span>
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(order.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Game:</span>{' '}
                            <span className="font-medium">{order.game_name}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Package:</span>{' '}
                            <span className="font-medium">{order.package_name}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Player:</span>{' '}
                            <span className="font-medium">{order.player_name || order.player_id}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Amount:</span>{' '}
                            <span className="font-bold text-gold">${order.amount}</span>
                          </div>
                        </div>
                        {order.scheduled_fulfill_at && (
                          <p className="text-xs text-gold flex items-center gap-1 mt-2">
                            <Clock className="w-3 h-3" />
                            Scheduled: {new Date(order.scheduled_fulfill_at).toLocaleString()}
                          </p>
                        )}
                        {order.status_message && (
                          <p className="text-xs text-muted-foreground mt-1">{order.status_message}</p>
                        )}
                        {order.g2bulk_order_id && (
                          <p className="text-xs text-muted-foreground mt-1">G2Bulk: {order.g2bulk_order_id}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {/* Process on Time button for paid orders with scheduled fulfillment */}
                        {order.status === 'paid' && order.g2bulk_product_id && order.scheduled_fulfill_at && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled
                            className="border-gold/50 text-gold opacity-70"
                          >
                            <Clock className="w-3 h-3 mr-1" />
                            Process on {new Date(order.scheduled_fulfill_at).toLocaleDateString()}
                          </Button>
                        )}
                         {/* For paid orders without scheduled time, show waiting indicator */}
                         {order.status === 'paid' && order.g2bulk_product_id && !order.scheduled_fulfill_at && (
                           <Badge variant="outline" className="border-gold/50 text-gold">
                             <Clock className="w-3 h-3 mr-1" />
                             Awaiting Schedule
                           </Badge>
                         )}

                        {/* Status dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              Status <ChevronDown className="w-3 h-3 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {allStatuses.map(s => (
                              <DropdownMenuItem
                                key={s}
                                onClick={() => updateStatus(order.id, s)}
                                disabled={order.status === s}
                              >
                                {statusConfig[s]?.icon}
                                <span className="ml-2">{statusConfig[s]?.label || s}</span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PreorderOrdersTab;
