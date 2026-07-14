import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSite } from '@/contexts/SiteContext';
import { toast } from '@/hooks/use-toast';
import { Sparkles, Save, RefreshCw, Paintbrush, ShieldCheck, Image, Video, MonitorPlay } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const AiTab: React.FC = () => {
  const { settings, updateSettings } = useSite();
  const [siteName, setSiteName] = useState(settings.siteName || 'Ahnajak Topup');
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor || '#0ea5e9');
  const [accentColor, setAccentColor] = useState(settings.accentColor || '#0284c7');
  const [bgType, setBgType] = useState<'color' | 'gradient' | 'image' | 'video'>(settings.bgType || 'color');
  const [backgroundColor, setBackgroundColor] = useState(settings.backgroundColor || '#000000');
  const [bgImageUrl, setBgImageUrl] = useState(settings.bgImageUrl || '');
  const [bgVideoUrl, setBgVideoUrl] = useState(settings.bgVideoUrl || '');
  const [saving, setSaving] = useState(false);

  // Common premium dark theme presets
  const presets = [
    { name: 'Neon Cyan (Default)', primary: '#0ea5e9', accent: '#0284c7' },
    { name: 'Amber Gold', primary: '#D4A84B', accent: '#B38F3D' },
    { name: 'Electric Purple', primary: '#a855f7', accent: '#7e22ce' },
    { name: 'Emerald Green', primary: '#10b981', accent: '#047857' },
    { name: 'Crimson Red', primary: '#ef4444', accent: '#b91c1c' },
  ];

  const handleApplyPreset = (primary: string, accent: string) => {
    setPrimaryColor(primary);
    setAccentColor(accent);
    toast({
      title: 'Preset selected',
      description: `Applied colors. Click "Save & Train AI" to persist and update your website.`,
    });
  };

  const handleSaveAndTrain = async () => {
    setSaving(true);
    try {
      // 1. Update database site settings
      const updates = {
        siteName: siteName,
        browserTitle: `${siteName} - Game Topup Cambodia`,
        primaryColor: primaryColor,
        accentColor: accentColor,
        bgType: bgType,
        backgroundColor: backgroundColor,
        bgImageUrl: bgImageUrl,
        bgVideoUrl: bgVideoUrl,
      };

      for (const [key, value] of Object.entries(updates)) {
        await supabase.from('site_settings').upsert({
          key,
          value: JSON.stringify(value),
        });
      }

      // 2. Trigger AI training endpoint to update .agents/AGENTS.md
      const response = await fetch('/api/settings/ai-train', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          siteName,
          primaryColor,
          accentColor,
          bgType,
          backgroundColor,
          bgImageUrl,
          bgVideoUrl,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update AI guidelines file');
      }

      updateSettings(updates);
      toast({
        title: 'Settings saved & AI Trained! 🤖',
        description: `Successfully renamed brand to "${siteName}" and updated background/colors. Future AI agents will adapt to this configuration automatically.`,
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Error saving settings',
        description: error.message || 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Introduction Card */}
      <Card className="border-cyan-500/30 bg-cyan-950/10 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cyan-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
            AI Customization & Training Center
          </CardTitle>
          <CardDescription>
            Configure your brand name, page background types, color codes, and automatically write instructions that train future AI developer agents to match your styling requirements.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Brand Renaming */}
        <Card className="border-zinc-800 bg-zinc-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              Brand & Title Manager
            </CardTitle>
            <CardDescription>Rename your portal everywhere instantly</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-400">Brand Name</label>
              <Input
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="Enter new brand name (e.g. Ahnajak Topup)"
                className="bg-zinc-900 border-zinc-800 focus:border-cyan-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-400">Browser Page Title (Preview)</label>
              <Input
                value={`${siteName} - Game Topup Cambodia`}
                disabled
                className="bg-zinc-900/50 border-zinc-800 text-zinc-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Theme Settings */}
        <Card className="border-zinc-800 bg-zinc-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Paintbrush className="w-5 h-5 text-cyan-400" />
              Accent Colors
            </CardTitle>
            <CardDescription>Set the colors and accents for your client pages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-400">Primary Accent</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 border border-zinc-800 rounded bg-transparent cursor-pointer"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-400">Secondary Accent</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-10 h-10 border border-zinc-800 rounded bg-transparent cursor-pointer"
                  />
                  <Input
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Presets */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Color Presets</label>
              <div className="flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyPreset(preset.primary, preset.accent)}
                    className="border-zinc-800 hover:border-cyan-500 hover:bg-zinc-900 text-xs text-zinc-300"
                  >
                    <span 
                      className="w-2.5 h-2.5 rounded-full mr-1.5" 
                      style={{ backgroundColor: preset.primary }}
                    />
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Global Background Settings Card */}
      <Card className="border-zinc-800 bg-zinc-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorPlay className="w-5 h-5 text-cyan-400" />
            Global Website Background Manager (All Pages)
          </CardTitle>
          <CardDescription>Configure the background style that applies to every page on your client website</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Background Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-400">Background Mode</label>
            <div className="flex gap-2">
              {(['color', 'gradient', 'image', 'video'] as const).map((type) => (
                <Button
                  key={type}
                  variant={bgType === type ? 'default' : 'outline'}
                  onClick={() => setBgType(type)}
                  className={`flex-1 capitalize ${
                    bgType === type 
                      ? 'bg-cyan-500 text-black hover:bg-cyan-600 font-bold' 
                      : 'border-zinc-800 hover:bg-zinc-900 text-zinc-300'
                  }`}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Color & Gradient Settings */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-400">
                  {bgType === 'gradient' ? 'Base Gradient Color' : 'Background Solid Color'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-10 h-10 border border-zinc-800 rounded bg-transparent cursor-pointer"
                  />
                  <Input
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 text-sm"
                  />
                </div>
                <p className="text-xs text-zinc-500">
                  {bgType === 'gradient' 
                    ? 'Determines the starting color of the linear background gradient.' 
                    : 'The base color of the page. Acts as the backing layer behind image and video modes too.'}
                </p>
              </div>
            </div>

            {/* Media URLs */}
            <div className="space-y-4">
              {/* Background Image URL */}
              {bgType === 'image' && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-400 flex items-center gap-1.5">
                    <Image className="w-4 h-4 text-cyan-400" />
                    Background Image URL
                  </label>
                  <Input
                    value={bgImageUrl}
                    onChange={(e) => setBgImageUrl(e.target.value)}
                    placeholder="Enter image URL (e.g. https://example.com/bg.jpg)"
                    className="bg-zinc-900 border-zinc-800 focus:border-cyan-500"
                  />
                  <p className="text-xs text-zinc-500">
                    Provide a public image web address. The image will be centered, stretched, and layered at 40% opacity.
                  </p>
                </div>
              )}

              {/* Background Video URL */}
              {bgType === 'video' && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-400 flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-cyan-400" />
                    Background Video URL
                  </label>
                  <Input
                    value={bgVideoUrl}
                    onChange={(e) => setBgVideoUrl(e.target.value)}
                    placeholder="Enter video URL (e.g. https://example.com/bg.mp4)"
                    className="bg-zinc-900 border-zinc-800 focus:border-cyan-500"
                  />
                  <p className="text-xs text-zinc-500">
                    Provide a direct link to an MP4 video. The video will autoplay, loop, and run muted in the background.
                  </p>
                </div>
              )}

              {/* Inactive Mode Message */}
              {(bgType === 'color' || bgType === 'gradient') && (
                <div className="h-full flex items-center justify-center border border-dashed border-zinc-800 rounded-xl p-6 text-center text-sm text-zinc-500">
                  No background media required. Using CSS {bgType} mode.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSaveAndTrain}
          disabled={saving}
          className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold px-6 py-5 rounded-xl shadow-lg shadow-cyan-500/10 flex items-center gap-2"
        >
          {saving ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Saving & Training AI...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save & Train AI Guidelines
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default AiTab;
