import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CloudUpload, Search, CheckCircle2, XCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ScanItem {
  table: string;
  column: string;
  id: string;
  url: string;
}

interface MigrationResult {
  table: string;
  column: string;
  id: string;
  old_url: string;
  new_url: string;
  status: 'migrated' | 'failed' | 'skipped';
  error?: string;
}

const CdnMigrationTab: React.FC = () => {
  const [scanning, setScanning] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [scanResults, setScanResults] = useState<ScanItem[] | null>(null);
  const [migrationResults, setMigrationResults] = useState<MigrationResult[] | null>(null);

  const handleScan = async () => {
    setScanning(true);
    setScanResults(null);
    setMigrationResults(null);
    try {
      const { data, error } = await supabase.functions.invoke('migrate-images-cdn', {
        body: { action: 'scan' },
      });
      if (error) throw error;
      setScanResults(data.items || []);
      toast({
        title: data.total > 0 ? `Found ${data.total} image(s) to migrate` : 'All images already on CDN!',
        description: data.total > 0 ? 'Click "Migrate All to CDN" to proceed' : undefined,
      });
    } catch (err) {
      toast({ title: 'Scan failed', description: String(err), variant: 'destructive' });
    } finally {
      setScanning(false);
    }
  };

  const handleMigrate = async () => {
    setMigrating(true);
    setMigrationResults(null);
    const allResults: MigrationResult[] = [];
    let totalMigrated = 0;
    let totalFailed = 0;
    try {
      // Loop in batches until the function reports done
      // Safety cap to prevent runaway loops
      for (let i = 0; i < 200; i++) {
        const { data, error } = await supabase.functions.invoke('migrate-images-cdn', {
          body: { action: 'migrate' },
        });
        if (error) throw error;
        allResults.push(...(data.results || []));
        totalMigrated += data.migrated || 0;
        totalFailed += data.failed || 0;
        setMigrationResults([...allResults]);
        toast({
          title: data.done ? 'Migration complete' : `Batch ${i + 1} done — continuing…`,
          description: `✅ ${totalMigrated} migrated, ❌ ${totalFailed} failed`,
        });
        if (data.done) break;
      }
      setScanResults(null);
    } catch (err) {
      toast({ title: 'Migration failed', description: String(err), variant: 'destructive' });
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-gold/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudUpload className="w-5 h-5 text-gold" />
            Migrate Images to CDN
          </CardTitle>
          <CardDescription>
            Scan and migrate all external images to Cloud Storage (CDN) for faster loading.
            Images already in storage will be skipped.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleScan} disabled={scanning || migrating} variant="outline">
              {scanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              Scan for External Images
            </Button>
            <Button
              onClick={handleMigrate}
              disabled={migrating || scanning}
              className="bg-gold hover:bg-gold/90 text-primary-foreground"
            >
              {migrating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CloudUpload className="w-4 h-4 mr-2" />}
              Migrate All to CDN
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>📊 Tables scanned: games, packages, special_packages, preorder_packages, events, payment_qr_settings, site_settings</p>
            <p>🔍 Columns: image, icon, default_package_icon, qr_code_image, banner images</p>
            <p>⚡ Images are cached with 1-year cache headers for maximum performance</p>
          </div>
        </CardContent>
      </Card>

      {/* Scan Results */}
      {scanResults !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Scan Results ({scanResults.length} external image{scanResults.length !== 1 ? 's' : ''})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scanResults.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p className="font-medium">All images are already on CDN!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {scanResults.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50 text-sm">
                    <img src={item.url} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{item.table}</Badge>
                        <span className="text-xs text-muted-foreground">{item.column}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{item.url}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Migration Results */}
      {migrationResults !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CloudUpload className="w-4 h-4" />
              Migration Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {migrationResults.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p>No images needed migration.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {migrationResults.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50 text-sm">
                    {r.status === 'migrated' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={r.status === 'migrated' ? 'default' : 'destructive'} className="text-xs">
                          {r.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{r.table}</Badge>
                        <span className="text-xs text-muted-foreground">{r.column}</span>
                      </div>
                      {r.error && <p className="text-xs text-destructive mt-0.5">{r.error}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CdnMigrationTab;
