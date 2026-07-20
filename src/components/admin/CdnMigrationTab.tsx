import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { CloudUpload, Search, CheckCircle2, Loader2, Image as ImageIcon, RotateCcw, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

interface ScanItem {
  table: string;
  column: string;
  url: string;
}

interface ScanSummary {
  total_refs: number;
  local_refs: number;
  remote_refs: number;
  failed_refs: number;
  migratable_refs: number;
}

const CdnMigrationTab: React.FC = () => {
  const [scanning, setScanning] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [scanResults, setScanResults] = useState<ScanItem[] | null>(null);
  const [failedResults, setFailedResults] = useState<ScanItem[] | null>(null);
  const [scanSummary, setScanSummary] = useState<ScanSummary | null>(null);
  const [syncLog, setSyncLog] = useState<string | null>(null);

  // Load initial status on mount
  useEffect(() => {
    handleScan(true);
  }, []);

  const handleScan = async (silent = false) => {
    if (!silent) setScanning(true);
    try {
      const { data: scanData, error: scanErr } = await api.get('/vps-sync/status');
      if (scanErr) throw new Error(scanErr.message || `HTTP error`);
      setScanResults((scanData as any)?.items || []);
      setFailedResults((scanData as any)?.failedItems || []);
      setScanSummary((scanData as any)?.summary || null);
      if (!silent) {
        toast({
          title: data.summary?.migratable_refs > 0 ? `Found ${data.summary.migratable_refs} image(s) to sync` : 'No new images need syncing',
          description: data.summary?.failed_refs > 0 ? `Note: ${data.summary.failed_refs} downloads previously failed.` : 'Local VPS cache status is up to date!',
        });
      }
    } catch (err) {
      if (!silent) {
        toast({ title: 'Scan failed', description: String(err), variant: 'destructive' });
      }
    } finally {
      if (!silent) setScanning(false);
    }
  };

  const handleMigrate = async () => {
    setMigrating(true);
    setSyncLog(null);
    try {
      const { data: migrateData, error: migrateErr } = await api.post('/vps-sync/run');
      if (migrateErr) throw new Error(migrateErr.message || `HTTP error`);
      if ((migrateData as any)?.log) {
        setSyncLog((migrateData as any).log);
      }
      
      // Rescan status
      const { data: statusData, error: statusErr } = await api.get('/vps-sync/status');
      if (!statusErr) {
        setScanResults((statusData as any)?.items || []);
        setFailedResults((statusData as any)?.failedItems || []);
        setScanSummary((statusData as any)?.summary || null);
      }

      toast({
        title: 'Sync completed successfully',
        description: 'Sync cycle finished executing on the VPS!',
      });
    } catch (err) {
      toast({ title: 'Sync failed', description: String(err), variant: 'destructive' });
    } finally {
      setMigrating(false);
    }
  };

  const handleClearFailures = async () => {
    setClearing(true);
    setSyncLog(null);
    try {
      const { data: clearData, error: clearErr } = await api.post('/vps-sync/clear-failures');
      if (clearErr) throw new Error(clearErr.message || `HTTP error`);
      if ((clearData as any)?.log) {
        setSyncLog((clearData as any).log);
      }
      
      // Rescan status
      const { data: statusData2, error: statusErr2 } = await api.get('/vps-sync/status');
      if (!statusErr2) {
        setScanResults((statusData2 as any)?.items || []);
        setFailedResults((statusData2 as any)?.failedItems || []);
        setScanSummary((statusData2 as any)?.summary || null);
      }

      toast({
        title: 'Cache cleared & retried successfully',
        description: 'Failed downloads cache cleared and sync rerun!',
      });
    } catch (err) {
      toast({ title: 'Failed to clear cache', description: String(err), variant: 'destructive' });
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-gold/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudUpload className="w-5 h-5 text-gold" />
            Local VPS Image Sync (MySQL Cache)
          </CardTitle>
          <CardDescription>
            Scan, optimize (WebP), and download all game/package icons locally to this VPS storage and MySQL cache for instant loading.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => handleScan(false)} disabled={scanning || migrating || clearing} variant="outline">
              {scanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              Scan Database Images
            </Button>
            <Button
              onClick={handleMigrate}
              disabled={migrating || scanning || clearing || (scanSummary?.migratable_refs === 0)}
              className="bg-gold hover:bg-gold/90 text-primary-foreground font-bold"
            >
              {migrating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CloudUpload className="w-4 h-4 mr-2" />}
              Sync All to VPS
            </Button>
            <Button
              onClick={handleClearFailures}
              disabled={migrating || scanning || clearing || (scanSummary?.failed_refs === 0)}
              variant="destructive"
              className="font-bold"
            >
              {clearing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
              Clear Failures & Retry
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>📊 Tables synced: games, packages, special_packages, preorder_packages, events, payment_qr_settings, site_settings</p>
            <p>⚡ WebP format conversion is automatically applied to reduce sizes by 50% for fast Cambodia loading</p>
          </div>

          {scanSummary && (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5 text-xs">
              <div className="rounded-lg bg-secondary/40 p-3">
                <p className="text-muted-foreground">Total Images</p>
                <p className="text-sm font-semibold">{scanSummary.total_refs}</p>
              </div>
              <div className="rounded-lg bg-secondary/40 p-3 border-l-2 border-green-500">
                <p className="text-muted-foreground">Cached on VPS</p>
                <p className="text-sm font-semibold text-green-600 dark:text-green-400">{scanSummary.local_refs}</p>
              </div>
              <div className="rounded-lg bg-secondary/40 p-3 border-l-2 border-amber-500">
                <p className="text-muted-foreground">Pending Sync</p>
                <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">{scanSummary.remote_refs}</p>
              </div>
              <div className="rounded-lg bg-secondary/40 p-3 border-l-2 border-red-500">
                <p className="text-muted-foreground">Failed Downloads</p>
                <p className="text-sm font-semibold text-red-600 dark:text-red-400">{scanSummary.failed_refs}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Log Output */}
      {syncLog && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Latest Sync Execution Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="p-3 bg-zinc-950 text-zinc-200 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap max-h-[250px] font-mono">
              {syncLog}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Scan Results */}
      {scanResults !== null && scanResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Unsynced Remote Images ({scanResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
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
          </CardContent>
        </Card>
      )}

      {/* Failed Results */}
      {failedResults !== null && failedResults.length > 0 && (
        <Card className="border-red-500/20">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-red-500">
              <AlertTriangle className="w-4 h-4" />
              Failed / Broken Image URLs ({failedResults.length})
            </CardTitle>
            <CardDescription className="text-xs">
              These images returned 404 (Not Found) on db. Upload a new image for them in your settings to fix them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {failedResults.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-red-50/5 dark:bg-red-950/10 border border-red-500/10 text-sm">
                  <div className="w-10 h-10 rounded bg-red-100 dark:bg-red-950/40 flex items-center justify-center text-red-500 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">{item.table}</Badge>
                      <span className="text-xs text-muted-foreground">{item.column}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{item.url}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Unsynced & No Failed */}
      {scanResults !== null && scanResults.length === 0 && failedResults !== null && failedResults.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <p className="font-semibold text-base">All database images are fully cached on local VPS!</p>
            <p className="text-xs mt-1">There are no remote image URLs or failed downloads remaining.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CdnMigrationTab;
