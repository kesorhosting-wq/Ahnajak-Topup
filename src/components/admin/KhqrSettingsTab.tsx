import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { db } from "@/integrations/db/client";
import { Eye, EyeOff, Loader2, Save, Wifi, Copy, Check } from "lucide-react";

interface KhqrConfig {
  api_key: string;
  webhook_secret: string;
  base_url: string;
  merchant_name?: string;
}

const DEFAULT_BASE = "https://apikhqr.kesor.cam";

const KhqrSettingsTab = () => {
  const [enabled, setEnabled] = useState(true);
  const [config, setConfig] = useState<KhqrConfig>({
    api_key: "",
    webhook_secret: "",
    base_url: DEFAULT_BASE,
    merchant_name: "",
  });
  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);

  const webhookUrl = `${window.location.origin}/api/ahnajak-khqr-webhook`;

  useEffect(() => {
    (async () => {
      const { data } = await db
        .from("payment_gateways")
        .select("config, enabled")
        .eq("slug", "ahnajak-khqr")
        .maybeSingle();
      if (data) {
        setEnabled(!!data.enabled);
        const c = (data.config || {}) as Partial<KhqrConfig>;
        setConfig({
          api_key: c.api_key || "",
          webhook_secret: c.webhook_secret || "",
          base_url: c.base_url || DEFAULT_BASE,
          merchant_name: c.merchant_name || "",
        });
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await db
      .from("payment_gateways")
      .upsert(
        [{
          slug: "ahnajak-khqr",
          name: "KHQR",
          enabled,
          config: config as any,
        }],
        { onConflict: "slug" },
      );
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✓ KHQR settings saved" });
    }
  };

  const handleTest = async () => {
    setTesting(true);
    const { data, error } = await db.functions.invoke("ahnajak-khqr", {
      body: { action: "test-connection" },
    });
    setTesting(false);
    if (error || !data?.success) {
      toast({
        title: "Connection failed",
        description: data?.error || error?.message || "Check API key",
        variant: "destructive",
      });
    } else {
      toast({
        title: "✓ Connected",
        description: data.merchant?.merchant_name
          ? `Merchant: ${data.merchant.merchant_name}`
          : "API reachable",
      });
    }
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading) {
    return (
      <Card className="border-gold/30">
        <CardContent className="py-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gold/30">
      <CardHeader>
        <CardTitle>KHQR Payment Settings</CardTitle>
        <CardDescription>
          Configure the KHQR payment gateway. Get your API key from{" "}
          <a
            href="https://apikhqr.kesor.cam/docs"
            target="_blank"
            rel="noreferrer"
            className="text-gold underline"
          >
            apikhqr.kesor.cam
          </a>
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/30">
          <div>
            <p className="font-medium">Enable KHQR</p>
            <p className="text-xs text-muted-foreground">Toggle KHQR payments site-wide</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="space-y-2">
          <Label>API Key</Label>
          <div className="relative">
            <Input
              type={showKey ? "text" : "password"}
              value={config.api_key}
              onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
              placeholder="khqr_live_xxxxxxxxxxxxxxxxxxxxxxxx"
              className="pr-10 border-gold/50"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Webhook Secret</Label>
          <div className="relative">
            <Input
              type={showSecret ? "text" : "password"}
              value={config.webhook_secret}
              onChange={(e) => setConfig({ ...config, webhook_secret: e.target.value })}
              placeholder="whsec_xxxxxxxxxxxxxxxx"
              className="pr-10 border-gold/50"
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Used to verify <code>x-khqr-signature</code> on webhook callbacks.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Base URL (optional)</Label>
          <Input
            value={config.base_url}
            onChange={(e) => setConfig({ ...config, base_url: e.target.value })}
            placeholder={DEFAULT_BASE}
            className="border-gold/50"
          />
        </div>

        <div className="space-y-2">
          <Label>Merchant Name (optional store label)</Label>
          <Input
            value={config.merchant_name || ""}
            onChange={(e) => setConfig({ ...config, merchant_name: e.target.value })}
            placeholder="MY SHOP"
            className="border-gold/50"
            maxLength={25}
          />
        </div>

        <div className="rounded-lg border border-border bg-secondary/30 p-3">
          <p className="text-xs font-medium mb-1">Webhook URL (paste into KHQR dashboard)</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs break-all bg-background p-2 rounded">{webhookUrl}</code>
            <Button size="icon" variant="outline" onClick={copyWebhook} className="h-9 w-9 shrink-0">
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={handleSave} disabled={saving} className="bg-gold hover:bg-gold/90 text-primary-foreground">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Settings
          </Button>
          <Button variant="outline" onClick={handleTest} disabled={testing || !config.api_key}>
            {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wifi className="w-4 h-4 mr-2" />}
            Test Connection
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default KhqrSettingsTab;
