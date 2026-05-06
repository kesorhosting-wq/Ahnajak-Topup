import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Edit2, Save, X, Calendar } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import ImageUpload from '@/components/ImageUpload';

interface Event {
  id: string;
  title: string;
  description: string | null;
  image: string | null;
  content: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

const EventsTab: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', image: '', content: '' });
  const [editData, setEditData] = useState({ title: '', description: '', image: '', content: '', is_active: true });
  const [adding, setAdding] = useState(false);

  useEffect(() => { loadEvents(); }, []);

  const loadEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    setEvents((data as Event[]) || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newEvent.title) {
      toast({ title: 'សូមបញ្ចូលចំណងជើង', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('events').insert({
      title: newEvent.title,
      description: newEvent.description || null,
      image: newEvent.image || null,
      content: newEvent.content || null,
    });
    if (error) {
      toast({ title: 'កំហុស', description: error.message, variant: 'destructive' });
      return;
    }
    setNewEvent({ title: '', description: '', image: '', content: '' });
    setAdding(false);
    loadEvents();
    toast({ title: 'បានបន្ថែមព្រឹត្តិការណ៍!' });
  };

  const handleStartEdit = (event: Event) => {
    setEditing(event.id);
    setEditData({
      title: event.title,
      description: event.description || '',
      image: event.image || '',
      content: event.content || '',
      is_active: event.is_active,
    });
  };

  const handleSave = async (id: string) => {
    const { error } = await supabase.from('events').update({
      title: editData.title,
      description: editData.description || null,
      image: editData.image || null,
      content: editData.content || null,
      is_active: editData.is_active,
    }).eq('id', id);
    if (error) {
      toast({ title: 'កំហុស', description: error.message, variant: 'destructive' });
      return;
    }
    setEditing(null);
    loadEvents();
    toast({ title: 'បានអាប់ដេត!' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('លុបព្រឹត្តិការណ៍នេះ?')) return;
    await supabase.from('events').delete().eq('id', id);
    loadEvents();
    toast({ title: 'បានលុប!' });
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    await supabase.from('events').update({ is_active: active }).eq('id', id);
    loadEvents();
  };

  return (
    <Card className="border-gold/30">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gold" />
            ព្រឹត្តិការណ៍ / Events
          </span>
          <Button size="sm" onClick={() => setAdding(!adding)}>
            <Plus className="w-4 h-4 mr-1" /> បន្ថែម
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Form */}
        {adding && (
          <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
            <Input
              placeholder="ចំណងជើង / Title"
              value={newEvent.title}
              onChange={(e) => setNewEvent(p => ({ ...p, title: e.target.value }))}
            />
            <Input
              placeholder="សេចក្តីពិពណ៌នា / Description (short)"
              value={newEvent.description}
              onChange={(e) => setNewEvent(p => ({ ...p, description: e.target.value }))}
            />
            <div>
              <span className="text-sm font-medium mb-1 block">រូបភាព / Image</span>
              <ImageUpload
                value={newEvent.image}
                onChange={(url) => setNewEvent(p => ({ ...p, image: url }))}
              />
            </div>
            <Textarea
              placeholder="អត្ថបទ / Content (full details)"
              value={newEvent.content}
              onChange={(e) => setNewEvent(p => ({ ...p, content: e.target.value }))}
              rows={5}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd}>
                <Save className="w-4 h-4 mr-1" /> រក្សាទុក
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAdding(false)}>
                <X className="w-4 h-4 mr-1" /> បោះបង់
              </Button>
            </div>
          </div>
        )}

        {/* Events List */}
        {loading ? (
          <p className="text-muted-foreground text-sm">កំពុងផ្ទុក...</p>
        ) : events.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">មិនមានព្រឹត្តិការណ៍</p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="p-4 border rounded-lg space-y-3">
              {editing === event.id ? (
                <>
                  <Input
                    value={editData.title}
                    onChange={(e) => setEditData(p => ({ ...p, title: e.target.value }))}
                  />
                  <Input
                    placeholder="Description"
                    value={editData.description}
                    onChange={(e) => setEditData(p => ({ ...p, description: e.target.value }))}
                  />
                  <ImageUpload
                    value={editData.image}
                    onChange={(url) => setEditData(p => ({ ...p, image: url }))}
                  />
                  <Textarea
                    value={editData.content}
                    onChange={(e) => setEditData(p => ({ ...p, content: e.target.value }))}
                    rows={5}
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editData.is_active}
                      onCheckedChange={(v) => setEditData(p => ({ ...p, is_active: v }))}
                    />
                    <span className="text-sm">{editData.is_active ? 'Active' : 'Hidden'}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleSave(event.id)}>
                      <Save className="w-4 h-4 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                      <X className="w-4 h-4 mr-1" /> Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-3">
                  {event.image && (
                    <img src={event.image} alt="" className="w-16 h-16 object-cover rounded" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{event.title}</h3>
                      {!event.is_active && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">Hidden</span>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-sm text-muted-foreground truncate">{event.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(event.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Switch
                      checked={event.is_active}
                      onCheckedChange={(v) => handleToggleActive(event.id, v)}
                    />
                    <Button size="icon" variant="ghost" onClick={() => handleStartEdit(event)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(event.id)}>
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

export default EventsTab;
