import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Edit2, Save, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import ImageUpload from '@/components/ImageUpload';

interface EventBanner {
  id: string;
  title: string | null;
  image: string;
  link: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

const EventBannersTab: React.FC = () => {
  const [banners, setBanners] = useState<EventBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [newBanner, setNewBanner] = useState({ title: '', image: '', link: '' });
  const [editData, setEditData] = useState({ title: '', image: '', link: '', is_active: true });

  useEffect(() => { loadBanners(); }, []);

  const loadBanners = async () => {
    setLoading(true);
    try {
      const { data, error } = await api.get('/event-banners/all');
      if (error) throw new Error(error.message);
      setBanners((data as EventBanner[]) || []);
    } catch (err: any) {
      console.error('loadBanners error:', err);
      setBanners([]);
      toast({ title: 'Failed to load banners', description: err.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newBanner.image) {
      toast({ title: 'Please upload a banner image first', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await api.post('/event-banners', {
        title: newBanner.title || null,
        image: newBanner.image,
        link: newBanner.link || null,
      });
      if (error) throw new Error(error.message);
      setNewBanner({ title: '', image: '', link: '' });
      setAdding(false);
      await loadBanners();
      toast({ title: 'Banner added!' });
    } catch (err: any) {
      toast({ title: 'Failed to save', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleSave = async (id: string) => {
    if (!editData.image) {
      toast({ title: 'Image is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await api.put(`/event-banners/${id}`, editData);
      if (error) throw new Error(error.message);
      setEditing(null);
      await loadBanners();
      toast({ title: 'Banner updated!' });
    } catch (err: any) {
      toast({ title: 'Failed to update', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this banner?')) return;
    try {
      const { error } = await api.del(`/event-banners/${id}`);
      if (error) throw new Error(error.message);
      await loadBanners();
      toast({ title: 'Banner deleted' });
    } catch { toast({ title: 'Failed to delete', variant: 'destructive' }); }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try {
      const { error } = await api.put(`/event-banners/${id}`, { is_active: active });
      if (error) throw new Error(error.message);
      await loadBanners();
    } catch { toast({ title: 'Failed to update', variant: 'destructive' }); }
  };

  return (
    <Card className="border-gold/30">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-gold" />
            Event Banners
          </span>
          <Button size="sm" onClick={() => setAdding(!adding)}>
            <Plus className="w-4 h-4 mr-1" /> Add Banner
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {adding && (
          <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
            <ImageUpload
              value={newBanner.image}
              onChange={(url) => setNewBanner(p => ({ ...p, image: url }))}
              folder="event-banners"
              aspectRatio="wide"
              placeholder="Upload Banner Image (21:9 recommended)"
            />
            <Input
              placeholder="Title (optional)"
              value={newBanner.title}
              onChange={(e) => setNewBanner(p => ({ ...p, title: e.target.value }))}
            />
            <Input
              placeholder="Link URL (optional)"
              value={newBanner.link}
              onChange={(e) => setNewBanner(p => ({ ...p, link: e.target.value }))}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAdding(false)}>
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : banners.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No event banners yet. Click "Add Banner" to upload one.</p>
        ) : (
          banners.map((banner) => (
            <div key={banner.id} className="p-4 border rounded-lg space-y-3">
              {editing === banner.id ? (
                <>
                  <ImageUpload
                    value={editData.image}
                    onChange={(url) => setEditData(p => ({ ...p, image: url }))}
                    folder="event-banners"
                    aspectRatio="wide"
                  />
                  <Input
                    placeholder="Title"
                    value={editData.title}
                    onChange={(e) => setEditData(p => ({ ...p, title: e.target.value }))}
                  />
                  <Input
                    placeholder="Link URL"
                    value={editData.link}
                    onChange={(e) => setEditData(p => ({ ...p, link: e.target.value }))}
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editData.is_active}
                      onCheckedChange={(v) => setEditData(p => ({ ...p, is_active: v }))}
                    />
                    <span className="text-sm">{editData.is_active ? 'Active' : 'Hidden'}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleSave(banner.id)} disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                      <X className="w-4 h-4 mr-1" /> Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-3">
                  {banner.image ? (
                    <img src={banner.image} alt="" className="w-24 aspect-video object-cover rounded-lg shrink-0" />
                  ) : (
                    <div className="w-24 aspect-video rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <ImageIcon className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{banner.title || '(no title)'}</h3>
                      {!banner.is_active && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">Hidden</span>
                      )}
                    </div>
                    {banner.link && (
                      <p className="text-xs text-muted-foreground truncate">{banner.link}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(banner.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Switch
                      checked={banner.is_active}
                      onCheckedChange={(v) => handleToggle(banner.id, v)}
                    />
                    <Button size="icon" variant="ghost" onClick={() => {
                      setEditing(banner.id);
                      setEditData({
                        title: banner.title || '',
                        image: banner.image,
                        link: banner.link || '',
                        is_active: banner.is_active,
                      });
                    }}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(banner.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default EventBannersTab;
