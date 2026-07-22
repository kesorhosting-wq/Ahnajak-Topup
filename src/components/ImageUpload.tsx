import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon, Link } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { handleApiError, isValidImageFile, isValidFileSize, MAX_FILE_SIZE } from '@/lib/errorHandler';
import api from '@/lib/api';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  folder?: string;
  className?: string;
  aspectRatio?: 'square' | 'wide' | 'tall';
  placeholder?: string;
  allowUrl?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  folder = 'general',
  className,
  aspectRatio = 'square',
  placeholder = 'Upload Image',
  allowUrl = true
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const aspectClasses = {
    square: 'aspect-square',
    wide: 'aspect-video',
    tall: 'aspect-[3/4]'
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (client-side check)
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please select an image file', variant: 'destructive' });
      return;
    }

    // Validate file size
    if (!isValidFileSize(file)) {
      toast({ 
        title: 'File too large', 
        description: `Maximum file size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`,
        variant: 'destructive' 
      });
      return;
    }

    // Validate file content by checking magic numbers
    const isValidImage = await isValidImageFile(file);
    if (!isValidImage) {
      toast({ 
        title: 'Invalid image file', 
        description: 'The file does not appear to be a valid image',
        variant: 'destructive' 
      });
      return;
    }

    setIsUploading(true);

    try {
      const { data, error: uploadError } = await api.upload(file);
      if (uploadError) throw new Error(uploadError.message || 'Upload failed');
      if (!data) throw new Error('Upload failed');

      onChange(data.url);
      toast({ title: 'Image uploaded!' });
    } catch (error: unknown) {
      const errorMessage = handleApiError(error, 'ImageUpload');
      toast({ 
        title: 'Upload failed', 
        description: errorMessage,
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
    
    await api.deleteUpload(value);
    
    onChange('');
    toast({ title: 'Image removed' });
  };

  return (
    <div className={cn('relative', className)}>
      {allowUrl && (
        <div className="flex gap-1 mb-2">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={cn(
              'px-3 py-1 text-xs rounded-md transition-colors',
              mode === 'upload'
                ? 'bg-gold text-black font-medium'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            )}
          >
            <Upload className="w-3 h-3 inline mr-1" />
            Upload
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={cn(
              'px-3 py-1 text-xs rounded-md transition-colors',
              mode === 'url'
                ? 'bg-gold text-black font-medium'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            )}
          >
            <Link className="w-3 h-3 inline mr-1" />
            URL
          </button>
        </div>
      )}

      {mode === 'url' && allowUrl ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Paste image URL..."
            className="flex-1 px-3 py-2 rounded-lg border border-gold/30 bg-secondary text-sm text-foreground placeholder-muted-foreground outline-none focus:border-gold transition-colors"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && urlInput.trim()) {
                onChange(urlInput.trim());
                toast({ title: 'Image URL set!' });
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (urlInput.trim()) {
                onChange(urlInput.trim());
                toast({ title: 'Image URL set!' });
              }
            }}
            className="px-4 py-2 rounded-lg bg-gold text-black text-sm font-medium hover:bg-gold/80 transition-colors"
          >
            Set
          </button>
        </div>
      ) : (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
          
          <div 
            className={cn(
              'relative rounded-xl border-2 border-dashed border-gold/50 bg-secondary/30 overflow-hidden transition-colors hover:border-gold cursor-pointer',
              aspectClasses[aspectRatio]
            )}
            onClick={() => !isUploading && inputRef.current?.click()}
          >
            {value ? (
              <>
                <img 
                  src={value} 
                  alt="Uploaded" 
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove();
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                {isUploading ? (
                  <>
                    <Loader2 className="w-8 h-8 animate-spin text-gold" />
                    <span className="text-sm">Uploading...</span>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center">
                      <Upload className="w-6 h-6 text-gold" />
                    </div>
                    <span className="text-sm font-medium">{placeholder}</span>
                    <span className="text-xs">Click to upload</span>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ImageUpload;
