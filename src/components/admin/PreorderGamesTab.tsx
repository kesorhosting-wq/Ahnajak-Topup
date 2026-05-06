import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSite } from '@/contexts/SiteContext';
import G2BulkProductSelector from './G2BulkProductSelector';
import G2BulkAutoImport from './G2BulkAutoImport';
import PackageStockBadge from './PackageStockBadge';
import { useG2BulkProductStatus } from '@/hooks/useG2BulkProductStatus';
import ImageUpload from '@/components/ImageUpload';
import {
  Plus, Trash2, Edit2, Save, X, ChevronDown, ChevronUp, Package, Clock, Calendar,
  DollarSign, Link2, Link2Off, ArrowUp, ArrowDown, Copy,
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface PreorderGame {
  id: string;
  game_id: string;
  is_active: boolean;
  sort_order: number;
  game_name?: string;
  game_image?: string;
  game_slug?: string;
  g2bulk_category_id?: string;
}

interface PreorderPackage {
  id: string;
  game_id: string;
  name: string;
  amount: string;
  price: number;
  icon: string | null;
  label: string | null;
  label_bg_color: string | null;
  label_text_color: string | null;
  label_icon: string | null;
  g2bulk_product_id: string | null;
  g2bulk_type_id: string | null;
  quantity: number | null;
  scheduled_fulfill_at: string | null;
  sort_order: number;
}

const PreorderGamesTab: React.FC = () => {
  const { games } = useSite();
  const { checkProductStatus } = useG2BulkProductStatus();
  const [preorderGames, setPreorderGames] = useState<PreorderGame[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedGame, setExpandedGame] = useState<string | null>(null);
  const [packages, setPackages] = useState<PreorderPackage[]>([]);
  const [editingPackage, setEditingPackage] = useState<string | null>(null);
  const [editPkgData, setEditPkgData] = useState<any>({});
  const [packageListSort, setPackageListSort] = useState<'price' | 'manual'>('manual');
  const [newPkg, setNewPkg] = useState({
    name: '', amount: '', price: 0, icon: '', label: '',
    labelBgColor: '#dc2626', labelTextColor: '#ffffff', labelIcon: '',
    g2bulkProductId: '', g2bulkTypeId: '', quantity: null as number | null,
    scheduledFulfillAt: '',
  });

  useEffect(() => { loadPreorderGames(); }, []);

  const loadPreorderGames = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('preorder_games')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;

      const enriched = (data || []).map((pg: any) => {
        const game = games.find(g => g.id === pg.game_id);
        return {
          ...pg,
          game_name: game?.name || 'Unknown',
          game_image: game?.image || '',
          game_slug: game?.slug || '',
          g2bulk_category_id: game?.g2bulkCategoryId || '',
        };
      });
      setPreorderGames(enriched);
    } catch (error) {
      console.error('Error loading preorder games:', error);
      toast({ title: 'Failed to load pre-order games', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const addPreorderGame = async () => {
    if (!selectedGameId) {
      toast({ title: 'Please select a game', variant: 'destructive' });
      return;
    }
    if (preorderGames.some(pg => pg.game_id === selectedGameId)) {
      toast({ title: 'Game already added to pre-order', variant: 'destructive' });
      return;
    }
    try {
      const { error } = await supabase.from('preorder_games').insert({
        game_id: selectedGameId,
        sort_order: preorderGames.length,
      });
      if (error) throw error;
      toast({ title: 'Pre-order game added!' });
      setSelectedGameId('');
      loadPreorderGames();
    } catch (error: any) {
      console.error('Error adding preorder game:', error);
      toast({ title: 'Failed to add', description: error.message, variant: 'destructive' });
    }
  };

  const removePreorderGame = async (id: string) => {
    try {
      const { error } = await supabase.from('preorder_games').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Pre-order game removed!' });
      loadPreorderGames();
    } catch (error) {
      toast({ title: 'Failed to remove', variant: 'destructive' });
    }
  };

  const loadPackages = async (gameId: string) => {
    try {
      const { data, error } = await supabase
        .from('preorder_packages')
        .select('*')
        .eq('game_id', gameId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      toast({ title: 'Failed to load packages', variant: 'destructive' });
    }
  };

  const toggleExpand = (gameId: string) => {
    if (expandedGame === gameId) {
      setExpandedGame(null);
    } else {
      setExpandedGame(gameId);
      loadPackages(gameId);
    }
  };

  const handleAddPackage = async (gameId: string) => {
    if (!newPkg.name || newPkg.price <= 0) {
      toast({ title: 'Please fill name and price', variant: 'destructive' });
      return;
    }
    try {
      const { error } = await supabase.from('preorder_packages').insert({
        game_id: gameId,
        name: newPkg.name,
        amount: newPkg.amount,
        price: newPkg.price,
        icon: newPkg.icon || null,
        label: newPkg.label || null,
        label_bg_color: newPkg.labelBgColor || '#dc2626',
        label_text_color: newPkg.labelTextColor || '#ffffff',
        label_icon: newPkg.labelIcon || null,
        g2bulk_product_id: newPkg.g2bulkProductId || null,
        g2bulk_type_id: newPkg.g2bulkTypeId || null,
        quantity: newPkg.quantity,
        scheduled_fulfill_at: newPkg.scheduledFulfillAt ? new Date(newPkg.scheduledFulfillAt).toISOString() : null,
        sort_order: packages.length,
      });
      if (error) throw error;
      toast({ title: 'Pre-order package added!' });
      setNewPkg({
        name: '', amount: '', price: 0, icon: '', label: '',
        labelBgColor: '#dc2626', labelTextColor: '#ffffff', labelIcon: '',
        g2bulkProductId: '', g2bulkTypeId: '', quantity: null,
        scheduledFulfillAt: '',
      });
      loadPackages(gameId);
    } catch (error: any) {
      toast({ title: 'Failed to add package', description: error.message, variant: 'destructive' });
    }
  };

  const startEditPkg = (pkg: PreorderPackage) => {
    setEditingPackage(pkg.id);
    setEditPkgData({
      name: pkg.name,
      amount: pkg.amount,
      price: pkg.price,
      icon: pkg.icon || '',
      label: pkg.label || '',
      labelBgColor: pkg.label_bg_color || '#dc2626',
      labelTextColor: pkg.label_text_color || '#ffffff',
      labelIcon: pkg.label_icon || '',
      g2bulkProductId: pkg.g2bulk_product_id || '',
      g2bulkTypeId: pkg.g2bulk_type_id || '',
      quantity: pkg.quantity,
      scheduledFulfillAt: pkg.scheduled_fulfill_at
        ? (() => { const d = new Date(pkg.scheduled_fulfill_at); const off = d.getTimezoneOffset(); const local = new Date(d.getTime() - off * 60000); return local.toISOString().slice(0, 19); })()
        : '',
    });
  };

  const saveEditPkg = async (gameId: string, pkgId: string) => {
    try {
      const { error } = await supabase.from('preorder_packages').update({
        name: editPkgData.name,
        amount: editPkgData.amount,
        price: editPkgData.price,
        icon: editPkgData.icon || null,
        label: editPkgData.label || null,
        label_bg_color: editPkgData.labelBgColor || '#dc2626',
        label_text_color: editPkgData.labelTextColor || '#ffffff',
        label_icon: editPkgData.labelIcon || null,
        g2bulk_product_id: editPkgData.g2bulkProductId || null,
        g2bulk_type_id: editPkgData.g2bulkTypeId || null,
        quantity: editPkgData.quantity,
        scheduled_fulfill_at: editPkgData.scheduledFulfillAt ? new Date(editPkgData.scheduledFulfillAt).toISOString() : null,
      }).eq('id', pkgId);
      if (error) throw error;
      toast({ title: 'Package updated!' });
      setEditingPackage(null);
      loadPackages(gameId);
    } catch (error: any) {
      toast({ title: 'Failed to update', description: error.message, variant: 'destructive' });
    }
  };

  const deletePkg = async (gameId: string, pkgId: string) => {
    try {
      const { error } = await supabase.from('preorder_packages').delete().eq('id', pkgId);
      if (error) throw error;
      toast({ title: 'Package deleted!' });
      loadPackages(gameId);
    } catch (error) {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  const clonePkg = async (gameId: string, pkg: PreorderPackage) => {
    try {
      const { error } = await supabase.from('preorder_packages').insert({
        game_id: gameId,
        name: `${pkg.name} (Copy)`,
        amount: pkg.amount,
        price: pkg.price,
        icon: pkg.icon,
        label: pkg.label,
        label_bg_color: pkg.label_bg_color,
        label_text_color: pkg.label_text_color,
        label_icon: pkg.label_icon,
        g2bulk_product_id: pkg.g2bulk_product_id,
        g2bulk_type_id: pkg.g2bulk_type_id,
        quantity: pkg.quantity,
        scheduled_fulfill_at: pkg.scheduled_fulfill_at,
        sort_order: packages.length,
      });
      if (error) throw error;
      toast({ title: 'Package cloned!' });
      loadPackages(gameId);
    } catch (error) {
      toast({ title: 'Failed to clone', variant: 'destructive' });
    }
  };

  const movePkg = async (gameId: string, pkgId: string, direction: 'up' | 'down') => {
    const idx = packages.findIndex(p => p.id === pkgId);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= packages.length) return;
    try {
      await supabase.from('preorder_packages').update({ sort_order: swapIdx }).eq('id', packages[idx].id);
      await supabase.from('preorder_packages').update({ sort_order: idx }).eq('id', packages[swapIdx].id);
      loadPackages(gameId);
    } catch (error) {
      toast({ title: 'Failed to reorder', variant: 'destructive' });
    }
  };

  const availableGames = games.filter(g => !preorderGames.some(pg => pg.game_id === g.id));

  if (isLoading) {
    return (
      <Card className="border-gold/30">
        <CardContent className="p-8 text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto text-gold" />
          <p className="mt-4 text-muted-foreground">Loading pre-order games...</p>
        </CardContent>
      </Card>
    );
  }

  const sortedPackages = packageListSort === 'price'
    ? [...packages].sort((a, b) => a.price - b.price)
    : packages;

  return (
    <div className="space-y-6">
      {/* Add Pre-order Game */}
      <Card className="border-gold/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-gold" />
            Pre-order Games
          </CardTitle>
          <CardDescription>Select games from your game list to offer as pre-order</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-6">
            <Select value={selectedGameId} onValueChange={setSelectedGameId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a game to add..." />
              </SelectTrigger>
              <SelectContent>
                {availableGames.map(game => (
                  <SelectItem key={game.id} value={game.id}>
                    {game.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addPreorderGame} className="bg-gold hover:bg-gold/90">
              <Plus className="w-4 h-4 mr-2" /> Add
            </Button>
          </div>

          {preorderGames.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No pre-order games yet. Add one above.</p>
          ) : (
            <div className="space-y-3">
              {preorderGames.map(pg => (
                <div key={pg.id} className="border border-border rounded-lg overflow-hidden">
                  {/* Game header */}
                  <div
                    className="flex items-center gap-3 p-3 bg-card cursor-pointer hover:bg-secondary/50 transition-colors"
                    onClick={() => toggleExpand(pg.game_id)}
                  >
                    {pg.game_image && (
                      <img src={pg.game_image} alt={pg.game_name} className="w-10 h-10 rounded-lg object-cover" />
                    )}
                    <div className="flex-1">
                      <p className="font-bold">{pg.game_name}</p>
                      <p className="text-xs text-muted-foreground">Pre-order</p>
                    </div>
                    <Badge className="bg-gold text-primary-foreground">Pre-order</Badge>
                    <Button
                      variant="ghost" size="sm"
                      onClick={(e) => { e.stopPropagation(); removePreorderGame(pg.id); }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    {expandedGame === pg.game_id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>

                  {/* Expanded packages section */}
                  {expandedGame === pg.game_id && (
                    <div className="p-4 bg-secondary/20 border-t border-border space-y-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gold" />
                        Pre-order Packages
                      </h4>

                      {/* Add New Package */}
                      <div className="bg-secondary/50 rounded-lg p-3 space-y-3">
                        <p className="text-sm font-medium">Add New Package</p>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                          <div className="col-span-2">
                            <Input
                              placeholder="Package Name"
                              value={newPkg.name}
                              onChange={e => setNewPkg(p => ({ ...p, name: e.target.value }))}
                              className="border-gold/50 text-sm"
                            />
                          </div>
                          <Input
                            type="text"
                            placeholder="Amount"
                            value={newPkg.amount}
                            onChange={e => setNewPkg(p => ({ ...p, amount: e.target.value }))}
                            className="border-gold/50 text-sm"
                          />
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Price"
                            value={newPkg.price || ''}
                            onChange={e => setNewPkg(p => ({ ...p, price: Number(e.target.value) }))}
                            className="border-gold/50 text-sm"
                          />
                          <Input
                            type="number"
                            placeholder="Qty (empty=1x)"
                            value={newPkg.quantity ?? ''}
                            onChange={e => setNewPkg(p => ({ ...p, quantity: e.target.value ? Number(e.target.value) : null }))}
                            className="border-gold/50 text-sm"
                          />
                        </div>

                        {/* G2Bulk Product Selector for new package */}
                        {pg.g2bulk_category_id && (
                          <div className="border border-dashed border-gold/30 rounded-lg p-2 bg-gold/5">
                            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                              <Link2 className="w-3 h-3" />
                              Link to G2Bulk Product (optional)
                            </p>
                            <G2BulkProductSelector
                              value={newPkg.g2bulkProductId}
                              gameName={pg.game_name || ''}
                              g2bulkCategoryId={pg.g2bulk_category_id}
                              onChange={(productId, typeId) => {
                                setNewPkg(p => ({
                                  ...p,
                                  g2bulkProductId: productId || '',
                                  g2bulkTypeId: typeId || '',
                                }));
                              }}
                            />
                          </div>
                        )}

                        <div className="flex gap-2 items-end flex-wrap">
                          <div className="w-16">
                            <ImageUpload
                              value={newPkg.icon}
                              onChange={(url) => setNewPkg(p => ({ ...p, icon: url }))}
                              folder="packages"
                              aspectRatio="square"
                              placeholder="Icon"
                            />
                          </div>
                          <div className="flex-1 min-w-[150px]">
                            <Input
                              placeholder="Label text (optional)"
                              value={newPkg.label}
                              onChange={e => setNewPkg(p => ({ ...p, label: e.target.value }))}
                              className="border-gold/50 text-sm"
                            />
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleAddPackage(pg.game_id)}
                            className="bg-gold hover:bg-gold/90 text-primary-foreground"
                          >
                            <Plus className="w-4 h-4 mr-1" /> Add
                          </Button>
                        </div>

                        {/* Label styling row */}
                        <div className="flex gap-2 items-center flex-wrap">
                          <div className="w-10">
                            <ImageUpload
                              value={newPkg.labelIcon}
                              onChange={(url) => setNewPkg(p => ({ ...p, labelIcon: url }))}
                              folder="packages"
                              aspectRatio="square"
                              placeholder="🏷️"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">BG:</span>
                            <input
                              type="color"
                              value={newPkg.labelBgColor}
                              onChange={e => setNewPkg(p => ({ ...p, labelBgColor: e.target.value }))}
                              className="w-8 h-8 rounded cursor-pointer border border-border"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">Text:</span>
                            <input
                              type="color"
                              value={newPkg.labelTextColor}
                              onChange={e => setNewPkg(p => ({ ...p, labelTextColor: e.target.value }))}
                              className="w-8 h-8 rounded cursor-pointer border border-border"
                            />
                          </div>
                        </div>

                        {/* Scheduled fulfillment time */}
                        <div className="p-3 rounded-lg border border-gold/30 bg-gold/5">
                          <label className="flex items-center gap-2 text-sm font-bold mb-2">
                            <Calendar className="w-4 h-4 text-gold" />
                            Scheduled Fulfillment Time
                          </label>
                          <Input
                            type="datetime-local"
                            step="1"
                            value={newPkg.scheduledFulfillAt}
                            onChange={e => setNewPkg(p => ({ ...p, scheduledFulfillAt: e.target.value }))}
                            className="border-gold/50"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Orders will NOT auto-process until this date/time
                          </p>
                        </div>
                      </div>

                      {/* G2Bulk Auto Import */}
                      {pg.g2bulk_category_id && (
                        <G2BulkAutoImport
                          gameId={pg.game_id}
                          gameName={pg.game_name || ''}
                          g2bulkCategoryId={pg.g2bulk_category_id}
                          existingProductIds={[]}
                          onImport={async (products) => {
                            for (const product of products) {
                              await supabase.from('preorder_packages').insert({
                                game_id: pg.game_id,
                                name: product.name,
                                amount: product.amount,
                                price: product.price,
                                g2bulk_product_id: product.g2bulkProductId,
                                g2bulk_type_id: product.g2bulkTypeId,
                                sort_order: packages.length,
                              });
                            }
                            loadPackages(pg.game_id);
                          }}
                        />
                      )}

                      {/* Package List Header */}
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">Packages</p>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button" size="sm"
                            variant={packageListSort === 'price' ? 'default' : 'outline'}
                            onClick={() => setPackageListSort('price')}
                          >
                            Price ↑
                          </Button>
                          <Button
                            type="button" size="sm"
                            variant={packageListSort === 'manual' ? 'default' : 'outline'}
                            onClick={() => setPackageListSort('manual')}
                          >
                            Manual
                          </Button>
                        </div>
                      </div>

                      {/* Package List */}
                      <div className="space-y-2">
                        {sortedPackages.map((pkg, idx) => (
                          <div key={pkg.id} className="bg-card border border-border rounded-lg p-3">
                            {editingPackage === pkg.id ? (
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                  <div className="col-span-2">
                                    <Input value={editPkgData.name}
                                      onChange={e => setEditPkgData((p: any) => ({ ...p, name: e.target.value }))}
                                      className="border-gold/50 text-sm" />
                                  </div>
                                  <Input type="text" value={editPkgData.amount}
                                    onChange={e => setEditPkgData((p: any) => ({ ...p, amount: e.target.value }))}
                                    className="border-gold/50 text-sm" />
                                  <Input type="number" step="0.01" value={editPkgData.price}
                                    onChange={e => setEditPkgData((p: any) => ({ ...p, price: Number(e.target.value) }))}
                                    className="border-gold/50 text-sm" />
                                  <Input type="number" placeholder="Qty (empty=1x)" value={editPkgData.quantity ?? ''}
                                    onChange={e => setEditPkgData((p: any) => ({ ...p, quantity: e.target.value ? Number(e.target.value) : null }))}
                                    className="border-gold/50 text-sm" />
                                </div>
                                <div className="flex gap-2 items-center flex-wrap">
                                  <div className="w-12">
                                    <ImageUpload
                                      value={editPkgData.icon}
                                      onChange={(url) => setEditPkgData((p: any) => ({ ...p, icon: url }))}
                                      folder="packages"
                                      aspectRatio="square"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-[120px]">
                                    <Input placeholder="Label text (optional)" value={editPkgData.label}
                                      onChange={e => setEditPkgData((p: any) => ({ ...p, label: e.target.value }))}
                                      className="border-gold/50 text-sm" />
                                  </div>
                                  <div className="w-10">
                                    <ImageUpload
                                      value={editPkgData.labelIcon}
                                      onChange={(url) => setEditPkgData((p: any) => ({ ...p, labelIcon: url }))}
                                      folder="packages"
                                      aspectRatio="square"
                                      placeholder="🏷️"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <input type="color" value={editPkgData.labelBgColor}
                                      onChange={e => setEditPkgData((p: any) => ({ ...p, labelBgColor: e.target.value }))}
                                      className="w-6 h-6 rounded cursor-pointer border border-border" />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <input type="color" value={editPkgData.labelTextColor}
                                      onChange={e => setEditPkgData((p: any) => ({ ...p, labelTextColor: e.target.value }))}
                                      className="w-6 h-6 rounded cursor-pointer border border-border" />
                                  </div>
                                  <Button variant="outline" size="sm" onClick={() => setEditingPackage(null)}>
                                    <X className="w-3 h-3" />
                                  </Button>
                                  <Button size="sm" onClick={() => saveEditPkg(pg.game_id, pkg.id)}
                                    className="bg-gold hover:bg-gold/90 text-primary-foreground">
                                    <Save className="w-3 h-3" />
                                  </Button>
                                </div>

                                {/* G2Bulk selector in edit mode */}
                                {pg.g2bulk_category_id && (
                                  <G2BulkProductSelector
                                    value={editPkgData.g2bulkProductId}
                                    gameName={pg.game_name || ''}
                                    g2bulkCategoryId={pg.g2bulk_category_id}
                                    onChange={(productId, typeId) => {
                                      setEditPkgData((p: any) => ({
                                        ...p,
                                        g2bulkProductId: productId || '',
                                        g2bulkTypeId: typeId || '',
                                      }));
                                    }}
                                  />
                                )}

                                {/* Scheduled fulfillment in edit */}
                                <div className="p-3 rounded-lg border border-gold/30 bg-gold/5">
                                  <label className="flex items-center gap-2 text-sm font-bold mb-2">
                                    <Calendar className="w-4 h-4 text-gold" />
                                    Scheduled Fulfillment Time
                                  </label>
                                  <Input
                                    type="datetime-local" step="1"
                                    value={editPkgData.scheduledFulfillAt}
                                    onChange={e => setEditPkgData((p: any) => ({ ...p, scheduledFulfillAt: e.target.value }))}
                                    className="border-gold/50"
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Orders will NOT auto-process until this date/time
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className={`flex items-center gap-3 ${pkg.g2bulk_product_id ? 'border-l-2 border-l-green-500 pl-2' : 'border-l-2 border-l-orange-400 pl-2'}`}>
                                {pkg.icon ? (
                                  <img src={pkg.icon} alt={pkg.name} className="w-8 h-8 rounded object-cover" />
                                ) : (
                                  <div className="w-8 h-8 bg-gold/20 rounded flex items-center justify-center text-xs">
                                    {pkg.amount}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-medium text-sm">{pkg.name}</p>
                                    {pkg.g2bulk_product_id ? (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-500/10 text-green-600 text-[10px] rounded-full border border-green-500/20">
                                        <Link2 className="w-3 h-3" /> Linked
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-500/10 text-orange-600 text-[10px] rounded-full border border-orange-500/20">
                                        <Link2Off className="w-3 h-3" /> Manual
                                      </span>
                                    )}
                                    <PackageStockBadge
                                      g2bulkProductId={pkg.g2bulk_product_id}
                                      productStatus={pkg.g2bulk_product_id ? checkProductStatus(pkg.g2bulk_product_id) : undefined}
                                    />
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {pkg.amount} units{pkg.label && ` • ${pkg.label}`} • Qty: {pkg.quantity ?? 1}x
                                  </p>
                                  {pkg.scheduled_fulfill_at && (
                                    <p className="text-xs text-gold flex items-center gap-1 mt-1">
                                      <Clock className="w-3 h-3" />
                                      Fulfill at: {new Date(pkg.scheduled_fulfill_at).toLocaleString('en-US', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })}
                                    </p>
                                  )}
                                  {pg.g2bulk_category_id && (
                                    <G2BulkProductSelector
                                      value={pkg.g2bulk_product_id}
                                      gameName={pg.game_name || ''}
                                      g2bulkCategoryId={pg.g2bulk_category_id}
                                      onChange={async (productId, typeId) => {
                                        await supabase.from('preorder_packages').update({
                                          g2bulk_product_id: productId || null,
                                          g2bulk_type_id: typeId || null,
                                        }).eq('id', pkg.id);
                                        loadPackages(pg.game_id);
                                      }}
                                    />
                                  )}
                                </div>
                                <p className="font-bold text-gold">${pkg.price.toFixed(2)}</p>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7"
                                    onClick={() => movePkg(pg.game_id, pkg.id, 'up')}
                                    disabled={packageListSort === 'price' || idx === 0}>
                                    <ArrowUp className="w-3 h-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7"
                                    onClick={() => movePkg(pg.game_id, pkg.id, 'down')}
                                    disabled={packageListSort === 'price' || idx === sortedPackages.length - 1}>
                                    <ArrowDown className="w-3 h-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon"
                                    className="h-7 w-7 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                                    title="Clone Package"
                                    onClick={() => clonePkg(pg.game_id, pkg)}>
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7"
                                    onClick={() => startEditPkg(pkg)}>
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => deletePkg(pg.game_id, pkg.id)}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PreorderGamesTab;
