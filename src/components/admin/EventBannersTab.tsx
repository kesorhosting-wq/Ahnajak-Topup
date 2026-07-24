import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit2, Save, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState({ title: '', image: '', link: '', is_active: true });
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => { loadBanners(); }, []);

  const loadBanners = async () => {
    try {
      const { data } = await api.get('/event-banners/all');
      setBanners((data as EventBanner[]) || []);
    } catch { setBanners([]); }
    setLoading(false);
  };

  const handleUpload = async (id: string, file: File) => {
    setUploading(id);
    try {
      const { data, error } = await api.upload(file);
      if (error || !data) throw new Error(error?.message || 'Upload failed');
      await api.put(`/event-banners/${id}`, { image: data.url });
      loadBanners();
      toast({ title: 'Image updated!' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    }
    setUploading(null);
  };

  const handleAdd = async () => {
    try {
      const { data, error } = await api.post('/event-banners', { title: 'New Banner', image: '' });
      if (error) throw new Error(error.message);
      loadBanners();
      toast({ title: 'Banner added' });
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleSave = async (id: string) => {
    try {
      await api.put(`/event-banners/${id}`, editData);
      setEditing(null);
      loadBanners();
      toast({ title: 'Saved!' });
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this banner?')) return;
    try {
      await api.delete(`/event-banners/${id}`);
      loadBanners();
      toast({ title: 'Deleted' });
    } catch { toast({ title: 'Failed', variant: 'destructive' }); }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await api.put(`/event-banners/${id}`, { is_active: active });
      loadBanners();
    } catch { toast({ title: 'Failed', variant: 'destructive' }); }
  };

  return (
    <Card className="border-gold/30">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-gold" />
            Event Banners
          </span>
          <Button size="sm" onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-1" /> Add Banner
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : banners.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No event banners yet.</p>
        ) : (
          banners.map((banner) => (
            <div key={banner.id} className="p-4 border rounded-lg space-y-3">
              {editing === banner.id ? (
                <>
                  <Input
                    placeholder="Title (optional)"
                    value={editData.title}
                    onChange={(e) => setEditData(p => ({ ...p, title: e.target.value }))}
                  />
                  <div className="flex items-center justify-between gap-4">
                    {banner.image ? (
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
                        <img src={banner.image} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-full aspect-video rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground text-sm">
                        No image
                      </div>
                    )}
                    <div className="shrink-0 flex flex-col gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        id={`file-${banner.id}`}
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUpload(banner.id, file);
                        }}
                      />
                      <label
                        htmlFor={`file-${banner.id}`}
                        className="px-3 py-1.5 rounded-md bg-secondary text-xs font-medium cursor-pointer hover:bg-secondary/80 text-center"
                      >
                        {uploading === banner.id ? 'Uploading...' : 'Upload'}
                      </label>
                    </div>
                  </div>
                  <Input
                    placeholder="Link URL (optional)"
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
                    <Button size="sm" onClick={() => handleSave(banner.id)}>
                      <Save className="w-4 h-4 mr-1" /> Save
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
                    <div className="w-24 aspect-video rounded-lg bg-muted flex items-center justify-center">
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
