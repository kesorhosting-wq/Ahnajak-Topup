import React, { useState, useRef } from 'react';
import { Save, Type, Upload, Loader2, X, Globe, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useSite } from '@/contexts/SiteContext';

interface FontUploadProps {
  label: string;
  description: string;
  value: string;
  onChange: (url: string) => void;
  icon: React.ReactNode;
}

const FontUpload: React.FC<FontUploadProps> = ({ label, description, value, onChange, icon }) => {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate font file types
    const validTypes = ['.woff', '.woff2', '.ttf', '.otf'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validTypes.includes(fileExt)) {
      toast({ 
        title: 'Invalid font file', 
        description: 'Please upload .woff, .woff2, .ttf, or .otf files',
        variant: 'destructive' 
      });
      return;
    }

    // Validate file size (max 5MB for fonts)
    if (file.size > 5 * 1024 * 1024) {
      toast({ 
        title: 'File too large', 
        description: 'Maximum font file size is 5MB',
        variant: 'destructive' 
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileName = `fonts/${Date.now()}-${Math.random().toString(36).substring(7)}${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('site-assets')
        .upload(fileName, file, {
          cacheControl: '31536000', // Cache for 1 year
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('site-assets')
        .getPublicUrl(fileName);

      onChange(publicUrl);
      toast({ title: 'Font uploaded successfully!' });
    } catch (error) {
      console.error('Font upload error:', error);
      toast({ 
        title: 'Upload failed', 
        description: 'Could not upload font file',
        variant: 'destructive' 
      });
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (!value) return;
    
    // Extract file path from URL
    const urlParts = value.split('/site-assets/');
    if (urlParts.length > 1) {
      const filePath = urlParts[1];
      await supabase.storage.from('site-assets').remove([filePath]);
    }
    
    onChange('');
    toast({ title: 'Font removed' });
  };

  const getFontName = (url: string) => {
    if (!url) return '';
    const parts = url.split('/');
    return parts[parts.length - 1];
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <Label className="text-base font-semibold">{label}</Label>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      
      <input
        ref={inputRef}
        type="file"
        accept=".woff,.woff2,.ttf,.otf"
        onChange={handleUpload}
        className="hidden"
      />

      {value ? (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-gold/30 bg-secondary/30">
          <Type className="w-8 h-8 text-gold flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{getFontName(value)}</p>
            <p className="text-xs text-muted-foreground">Font loaded</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <button
          onClick={() => !isUploading && inputRef.current?.click()}
          disabled={isUploading}
          className="w-full p-6 rounded-xl border-2 border-dashed border-gold/50 bg-secondary/30 hover:border-gold hover:bg-secondary/50 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-8 h-8 text-gold animate-spin" />
              <span className="text-sm text-muted-foreground">Uploading...</span>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center">
                <Upload className="w-6 h-6 text-gold" />
              </div>
              <span className="text-sm font-medium">Click to upload font</span>
              <span className="text-xs text-muted-foreground">.woff, .woff2, .ttf, .otf</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

const FontSettingsTab: React.FC = () => {
  const { settings, updateSettings } = useSite();
  const [saving, setSaving] = useState(false);
  const [khmerFont, setKhmerFont] = useState(settings.customKhmerFont || '');
  const [englishFont, setEnglishFont] = useState(settings.customEnglishFont || '');

  // Update local state when settings change
  React.useEffect(() => {
    setKhmerFont(settings.customKhmerFont || '');
    setEnglishFont(settings.customEnglishFont || '');
  }, [settings.customKhmerFont, settings.customEnglishFont]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        customKhmerFont: khmerFont,
        customEnglishFont: englishFont,
      });
      toast({ title: '✓ Font settings saved!' });
    } catch (error) {
      console.error('Error saving font settings:', error);
      toast({ title: 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-gold/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Type className="w-5 h-5 text-gold" />
          Custom Font Settings
        </CardTitle>
        <CardDescription>
          Upload custom fonts for Khmer and English text. These fonts will be applied across the entire website.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Khmer Font */}
        <FontUpload
          label="Khmer Font"
          description="Upload a custom font for Khmer text (ភាសាខ្មែរ). This will replace the default Battambang font."
          value={khmerFont}
          onChange={setKhmerFont}
          icon={<Languages className="w-5 h-5 text-gold" />}
        />

        {/* English Font */}
        <FontUpload
          label="English Font"
          description="Upload a custom font for English text. This will replace the default Noto Sans font."
          value={englishFont}
          onChange={setEnglishFont}
          icon={<Globe className="w-5 h-5 text-gold" />}
        />

        {/* Preview Section */}
        {(khmerFont || englishFont) && (
          <div className="space-y-3 p-4 rounded-lg border border-gold/30 bg-secondary/20">
            <Label className="text-sm font-semibold">Preview</Label>
            <div className="space-y-2">
              {khmerFont && (
                <p 
                  className="text-lg"
                  style={{ fontFamily: 'CustomKhmer, Battambang, sans-serif' }}
                >
                  ភាសាខ្មែរ - សូមស្វាគមន៍មកកាន់ KESOR TOPUP
                </p>
              )}
              {englishFont && (
                <p 
                  className="text-lg"
                  style={{ fontFamily: 'CustomEnglish, "Noto Sans", sans-serif' }}
                >
                  Welcome to KESOR TOPUP - Game Topup Service
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              * Preview may not show until you save and refresh the page
            </p>
          </div>
        )}

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full bg-gold hover:bg-gold/90 text-primary-foreground"
          size="lg"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Font Settings
            </>
          )}
        </Button>

        {/* Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">💡 Tips</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Use .woff2 format for best performance</li>
            <li>• Khmer fonts should include Khmer Unicode characters</li>
            <li>• Changes apply site-wide after saving and refreshing</li>
            <li>• Maximum file size: 5MB per font</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default FontSettingsTab;
