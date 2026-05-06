import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import {
  RefreshCw, Save, Clock, DollarSign, Percent, TrendingUp, Check,
} from 'lucide-react';

interface PackageMarkup {
  id: string;
  name: string;
  price: number;
  g2bulk_product_id: string | null;
  price_markup_percent: number | null;
  cost_price: number | null;
  game_name: string;
  table: string;
}

const PriceUpdateTab: React.FC = () => {
  const [packages, setPackages] = useState<PackageMarkup[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedMarkups, setEditedMarkups] = useState<Record<string, string>>({});
  const [updateResult, setUpdateResult] = useState<{
    g2bulk_prices_synced: number;
    packages_updated: number;
    details: Array<{ name: string; old_price: number; new_price: number; cost: number; markup: number }>;
  } | null>(null);

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch g2bulk products for cost lookup
      const { data: g2products } = await supabase
        .from('g2bulk_products')
        .select('g2bulk_product_id, price');
      const costMap = new Map<string, number>();
      g2products?.forEach(p => costMap.set(p.g2bulk_product_id, Number(p.price)));

      // Fetch games for name lookup
      const { data: games } = await supabase.from('games').select('id, name');
      const gameMap = new Map<string, string>();
      games?.forEach(g => gameMap.set(g.id, g.name));

      const allPkgs: PackageMarkup[] = [];

      // Fetch from all 3 tables
      const tables = [
        { name: 'packages', label: 'Regular' },
        { name: 'special_packages', label: 'Special' },
        { name: 'preorder_packages', label: 'Preorder' },
      ] as const;

      for (const t of tables) {
        const { data } = await supabase
          .from(t.name)
          .select('id, name, price, g2bulk_product_id, price_markup_percent, game_id')
          .not('g2bulk_product_id', 'is', null)
          .order('name');

        if (data) {
          for (const pkg of data) {
            allPkgs.push({
              id: pkg.id,
              name: pkg.name,
              price: Number(pkg.price),
              g2bulk_product_id: pkg.g2bulk_product_id,
              price_markup_percent: pkg.price_markup_percent != null ? Number(pkg.price_markup_percent) : null,
              cost_price: pkg.g2bulk_product_id ? (costMap.get(pkg.g2bulk_product_id) ?? null) : null,
              game_name: gameMap.get(pkg.game_id) || 'Unknown',
              table: t.name,
            });
          }
        }
      }

      setPackages(allPkgs);
    } catch (err) {
      console.error('Error loading packages:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPackages(); }, [fetchPackages]);

  const handleMarkupChange = (pkgId: string, value: string) => {
    setEditedMarkups(prev => ({ ...prev, [pkgId]: value }));
  };

  const handleSaveMarkups = async () => {
    setSaving(true);
    try {
      const entries = Object.entries(editedMarkups);
      if (entries.length === 0) {
        toast({ title: 'No changes to save' });
        setSaving(false);
        return;
      }

      for (const [pkgId, val] of entries) {
        const pkg = packages.find(p => p.id === pkgId);
        if (!pkg) continue;

        const markupVal = val === '' ? null : parseFloat(val);

        await supabase
          .from(pkg.table as 'packages' | 'special_packages' | 'preorder_packages')
          .update({ price_markup_percent: markupVal })
          .eq('id', pkgId);
      }

      toast({ title: `Saved markup for ${entries.length} packages` });
      setEditedMarkups({});
      await fetchPackages();
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to save markups', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateNow = async () => {
    setUpdating(true);
    setUpdateResult(null);
    try {
      toast({ title: 'Updating prices...', description: 'Fetching latest G2Bulk prices and applying markups.' });

      const { data, error } = await supabase.functions.invoke('update-prices');

      if (error) throw error;

      if (data?.success) {
        setUpdateResult(data.data);
        toast({
          title: 'Prices updated!',
          description: `${data.data.packages_updated} packages updated from ${data.data.g2bulk_prices_synced} G2Bulk prices`,
        });
        await fetchPackages();
      } else {
        toast({ title: 'Update failed', description: data?.error, variant: 'destructive' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed';
      toast({ title: 'Price update failed', description: msg, variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  const getMarkupValue = (pkg: PackageMarkup): string => {
    if (editedMarkups[pkg.id] !== undefined) return editedMarkups[pkg.id];
    return pkg.price_markup_percent != null ? String(pkg.price_markup_percent) : '';
  };

  const calcPreview = (pkg: PackageMarkup): number | null => {
    const raw = getMarkupValue(pkg);
    if (!raw || pkg.cost_price == null) return null;
    const m = parseFloat(raw);
    if (isNaN(m)) return null;
    return Math.round(pkg.cost_price * (1 + m / 100) * 100) / 100;
  };

  const hasChanges = Object.keys(editedMarkups).length > 0;

  if (loading) {
    return (
      <Card className="border-gold/30">
        <CardContent className="p-8 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gold" />
          <p className="mt-4 text-muted-foreground">Loading packages...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-gold/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-gold" />
            Auto Price Update
          </CardTitle>
          <CardDescription>
            Set markup % for each package. Prices auto-update daily at <strong>7:00 AM</strong> based on G2Bulk cost + your markup.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleUpdateNow}
              disabled={updating}
              className="bg-gold hover:bg-gold/90 text-primary-foreground"
            >
              {updating ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Updating...</>
              ) : (
                <><RefreshCw className="w-4 h-4 mr-2" />Update Prices Now</>
              )}
            </Button>

            <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              Auto runs daily at 7:00 AM
            </div>
          </div>

          {updateResult && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-green-600 font-semibold">
                <Check className="w-5 h-5" />
                Updated {updateResult.packages_updated} packages (synced {updateResult.g2bulk_prices_synced} G2Bulk prices)
              </div>
              {updateResult.details.length > 0 && (
                <div className="mt-2 space-y-1 text-sm">
                  {updateResult.details.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <TrendingUp className="w-3 h-3" />
                      <span className="font-medium">{d.name}</span>:
                      <span className="text-muted-foreground">${d.old_price.toFixed(2)}</span>
                      <span>→</span>
                      <span className="text-green-600 font-medium">${d.new_price.toFixed(2)}</span>
                      <span className="text-muted-foreground text-xs">(cost: ${d.cost.toFixed(2)}, +{d.markup}%)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Markup Table */}
      <Card className="border-gold/30">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-gold" />
            Package Markup Settings
          </CardTitle>
          {hasChanges && (
            <Button onClick={handleSaveMarkups} disabled={saving} size="sm" className="bg-gold hover:bg-gold/90 text-primary-foreground">
              {saving ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Markups</>}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {packages.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No packages with G2Bulk product linked. Link packages first in the Games tab.
            </p>
          ) : (
            <div className="overflow-auto max-h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Game</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Cost (G2Bulk)</TableHead>
                    <TableHead className="text-right">Current Price</TableHead>
                    <TableHead className="text-center w-32">Markup %</TableHead>
                    <TableHead className="text-right">Preview Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages.map(pkg => {
                    const preview = calcPreview(pkg);
                    const isEdited = editedMarkups[pkg.id] !== undefined;
                    return (
                      <TableRow key={`${pkg.table}_${pkg.id}`}>
                        <TableCell className="font-medium text-sm">{pkg.game_name}</TableCell>
                        <TableCell className="text-sm">{pkg.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {pkg.table === 'packages' ? 'Regular' : pkg.table === 'special_packages' ? 'Special' : 'Preorder'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {pkg.cost_price != null ? `$${pkg.cost_price.toFixed(2)}` : '—'}
                        </TableCell>
                        <TableCell className="text-right font-medium">${pkg.price.toFixed(2)}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="e.g. 15"
                            value={getMarkupValue(pkg)}
                            onChange={e => handleMarkupChange(pkg.id, e.target.value)}
                            className={`w-24 text-center text-sm ${isEdited ? 'border-gold' : 'border-border'}`}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {preview != null ? (
                            <span className={preview !== pkg.price ? 'text-gold font-semibold' : 'text-muted-foreground'}>
                              ${preview.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PriceUpdateTab;
