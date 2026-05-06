import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  TrendingUp, TrendingDown, DollarSign, RefreshCw, Loader2,
  ArrowUpRight, ArrowDownRight, BarChart3, Search,
} from 'lucide-react';

interface SaleRecord {
  id: string;
  game_name: string;
  package_name: string;
  player_id: string;
  sale_price: number;
  cost_price: number | null;
  profit: number | null;
  created_at: string;
  g2bulk_product_id: string | null;
  g2bulk_order_id: string | null;
  quantity: number;
}

const SalesActivityTab: React.FC = () => {
  const [records, setRecords] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch completed orders
      const { data: orders, error: ordersErr } = await supabase
        .from('topup_orders')
        .select('id, game_name, package_name, player_id, amount, created_at, g2bulk_product_id, g2bulk_order_id')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (ordersErr) throw ordersErr;

      // Fetch all g2bulk product prices
      const { data: products } = await supabase
        .from('g2bulk_products')
        .select('g2bulk_product_id, price');

      const priceMap = new Map<string, number>();
      (products || []).forEach((p: any) => {
        priceMap.set(p.g2bulk_product_id, Number(p.price));
      });

      // Fetch package quantities for accurate cost calculation
      const { data: packages } = await supabase
        .from('packages')
        .select('g2bulk_product_id, price, quantity');
      
      const { data: specialPkgs } = await supabase
        .from('special_packages')
        .select('g2bulk_product_id, price, quantity');

      // Build qty map: key = g2bulk_product_id + sale_price
      const qtyMap = new Map<string, number>();
      [...(packages || []), ...(specialPkgs || [])].forEach((p: any) => {
        const key = `${p.g2bulk_product_id}_${Number(p.price).toFixed(4)}`;
        qtyMap.set(key, Number(p.quantity) || 1);
      });

      const mapped: SaleRecord[] = (orders || []).map((o: any) => {
        const salePrice = Number(o.amount);
        const unitCost = o.g2bulk_product_id ? (priceMap.get(o.g2bulk_product_id) ?? null) : null;
        
        // Resolve quantity
        const qtyKey = `${o.g2bulk_product_id}_${salePrice.toFixed(4)}`;
        const qty = qtyMap.get(qtyKey) || 1;
        
        const totalCost = unitCost !== null ? unitCost * qty : null;
        const profit = totalCost !== null ? salePrice - totalCost : null;

        return {
          id: o.id,
          game_name: o.game_name,
          package_name: o.package_name,
          player_id: o.player_id,
          sale_price: salePrice,
          cost_price: totalCost,
          profit,
          created_at: o.created_at,
          g2bulk_product_id: o.g2bulk_product_id,
          g2bulk_order_id: o.g2bulk_order_id,
          quantity: qty,
        };
      });

      setRecords(mapped);
    } catch (err) {
      console.error('Error fetching sales data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = records.filter(r =>
    !search ||
    r.game_name.toLowerCase().includes(search.toLowerCase()) ||
    r.package_name.toLowerCase().includes(search.toLowerCase()) ||
    r.player_id.toLowerCase().includes(search.toLowerCase())
  );

  const profitOrders = filtered.filter(r => r.profit !== null && r.profit >= 0);
  const lossOrders = filtered.filter(r => r.profit !== null && r.profit < 0);
  const unknownOrders = filtered.filter(r => r.profit === null);

  const totalRevenue = filtered.reduce((s, r) => s + r.sale_price, 0);
  const totalCost = filtered.reduce((s, r) => s + (r.cost_price ?? 0), 0);
  const totalProfit = profitOrders.reduce((s, r) => s + (r.profit ?? 0), 0);
  const totalLoss = lossOrders.reduce((s, r) => s + (r.profit ?? 0), 0);
  const netProfit = totalRevenue - totalCost;

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  const OrderTable = ({ items, title, icon: Icon, color }: {
    items: SaleRecord[];
    title: string;
    icon: any;
    color: string;
  }) => (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color}`} />
          {title} ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto max-h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Game</TableHead>
                <TableHead className="text-xs">Package</TableHead>
                <TableHead className="text-xs">Player</TableHead>
                <TableHead className="text-xs text-right">Qty</TableHead>
                <TableHead className="text-xs text-right">Cost</TableHead>
                <TableHead className="text-xs text-right">Sale</TableHead>
                <TableHead className="text-xs text-right">Profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No records
                  </TableCell>
                </TableRow>
              ) : (
                items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">{formatDate(r.created_at)}</TableCell>
                    <TableCell className="text-xs max-w-[100px] truncate">{r.game_name}</TableCell>
                    <TableCell className="text-xs max-w-[100px] truncate">{r.package_name}</TableCell>
                    <TableCell className="text-xs max-w-[80px] truncate">{r.player_id}</TableCell>
                    <TableCell className="text-xs text-right">{r.quantity}</TableCell>
                    <TableCell className="text-xs text-right">
                      {r.cost_price !== null ? `$${r.cost_price.toFixed(3)}` : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-right font-medium">${r.sale_price.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-right font-bold">
                      {r.profit !== null ? (
                        <span className={r.profit >= 0 ? 'text-green-500' : 'text-red-500'}>
                          {r.profit >= 0 ? '+' : ''}{r.profit.toFixed(3)}
                        </span>
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-gold" />
          Sales Activity
        </h2>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gold" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="border-border">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Total Orders</p>
                <p className="text-xl font-bold">{filtered.length}</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Revenue</p>
                <p className="text-xl font-bold text-gold">${totalRevenue.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Total Cost</p>
                <p className="text-xl font-bold text-muted-foreground">${totalCost.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                  <TrendingUp className="w-3 h-3 text-green-500" /> Profit
                </p>
                <p className="text-xl font-bold text-green-500">+${totalProfit.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                  <TrendingDown className="w-3 h-3 text-red-500" /> Loss
                </p>
                <p className="text-xl font-bold text-red-500">${totalLoss.toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Net Profit Banner */}
          <Card className={`border-2 ${netProfit >= 0 ? 'border-green-500/40 bg-green-500/10' : 'border-red-500/40 bg-red-500/10'}`}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DollarSign className={`w-6 h-6 ${netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                <div>
                  <p className="text-sm text-muted-foreground">Net Profit/Loss</p>
                  <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {netProfit >= 0 ? '+' : ''}${netProfit.toFixed(2)}
                  </p>
                </div>
              </div>
              <Badge variant={netProfit >= 0 ? 'default' : 'destructive'} className={netProfit >= 0 ? 'bg-green-500' : ''}>
                {netProfit >= 0 ? 'Profitable' : 'Loss'}
              </Badge>
            </CardContent>
          </Card>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search game, package, player..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Profit & Loss Tables */}
          <div className="grid md:grid-cols-2 gap-4">
            <OrderTable
              items={profitOrders}
              title="Profit Orders"
              icon={ArrowUpRight}
              color="text-green-500"
            />
            <OrderTable
              items={lossOrders}
              title="Loss Orders"
              icon={ArrowDownRight}
              color="text-red-500"
            />
          </div>

          {unknownOrders.length > 0 && (
            <OrderTable
              items={unknownOrders}
              title="Unknown Cost (No G2Bulk link)"
              icon={DollarSign}
              color="text-muted-foreground"
            />
          )}
        </>
      )}
    </div>
  );
};

export default SalesActivityTab;
