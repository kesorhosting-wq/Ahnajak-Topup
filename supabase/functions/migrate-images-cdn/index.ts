import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MigrationResult {
  table: string;
  column: string;
  id: string;
  old_url: string;
  new_url: string;
  status: "migrated" | "failed" | "skipped";
  error?: string;
}

interface ScanItem {
  table: string;
  column: string;
  id: string;
  url: string;
}

interface TableConfig {
  table: string;
  columns: string[];
  idCol: string;
}

interface SiteSettingCandidate extends ScanItem {
  path: (string | number)[];
}

const BATCH_LIMIT = 25;

const IMAGE_COLUMNS: TableConfig[] = [
  { table: "games", columns: ["image", "cover_image", "default_package_icon"], idCol: "id" },
  { table: "packages", columns: ["icon", "label_icon"], idCol: "id" },
  { table: "special_packages", columns: ["icon", "label_icon"], idCol: "id" },
  { table: "preorder_packages", columns: ["icon", "label_icon"], idCol: "id" },
  { table: "events", columns: ["image"], idCol: "id" },
  { table: "payment_qr_settings", columns: ["qr_code_image"], idCol: "id" },
];

function isHttpUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function isStorageUrl(url: string, supabaseUrl: string): boolean {
  if (!url) return true;

  const refMatch = supabaseUrl.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i);
  const ourRef = refMatch?.[1];

  if (!ourRef) return false;

  return url.includes(`${ourRef}.supabase.co/storage/`);
}

function setNestedValue(target: unknown, path: (string | number)[], nextValue: string): unknown {
  if (path.length === 0) return nextValue;

  const [head, ...rest] = path;

  if (Array.isArray(target)) {
    const next = [...target];
    const index = Number(head);
    next[index] = setNestedValue(next[index], rest, nextValue);
    return next;
  }

  if (target && typeof target === "object") {
    const next = { ...(target as Record<string, unknown>) };
    next[String(head)] = setNestedValue(next[String(head)], rest, nextValue);
    return next;
  }

  return target;
}

function collectUrlsFromValue(
  value: unknown,
  supabaseUrl: string,
  path: (string | number)[] = [],
): Array<{ url: string; path: (string | number)[] }> {
  if (isHttpUrl(value) && !isStorageUrl(value, supabaseUrl)) {
    return [{ url: value, path }];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectUrlsFromValue(item, supabaseUrl, [...path, index]));
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, nestedValue]) =>
      collectUrlsFromValue(nestedValue, supabaseUrl, [...path, key])
    );
  }

  return [];
}

async function scanTableCandidates(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
): Promise<ScanItem[]> {
  const results: ScanItem[] = [];

  for (const { table, columns, idCol } of IMAGE_COLUMNS) {
    const selectColumns = [idCol, ...columns].join(",");
    const { data: rows, error } = await supabase.from(table).select(selectColumns);

    if (error || !rows) continue;

    for (const row of rows) {
      for (const col of columns) {
        const url = row[col];
        if (isHttpUrl(url) && !isStorageUrl(url, supabaseUrl)) {
          results.push({ table, column: col, id: String(row[idCol]), url });
        }
      }
    }
  }

  return results;
}

async function scanSiteSettingsCandidates(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
): Promise<SiteSettingCandidate[]> {
  const { data: rows, error } = await supabase.from("site_settings").select("id,key,value");
  if (error || !rows) return [];

  return rows.flatMap((row) =>
    collectUrlsFromValue(row.value, supabaseUrl).map(({ url, path }) => ({
      table: "site_settings",
      column: path.length > 0 ? `key:${row.key}.${path.join(".")}` : `key:${row.key}`,
      id: String(row.id),
      url,
      path,
    }))
  );
}

async function scanAllCandidates(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
): Promise<Array<ScanItem | SiteSettingCandidate>> {
  const [tableCandidates, siteSettingCandidates] = await Promise.all([
    scanTableCandidates(supabase, supabaseUrl),
    scanSiteSettingsCandidates(supabase, supabaseUrl),
  ]);

  return [...tableCandidates, ...siteSettingCandidates];
}

async function migrateUrl(
  supabase: ReturnType<typeof createClient>,
  url: string,
  folder: string,
): Promise<{ publicUrl: string | null; error?: string }> {
  try {
    const imgResponse = await fetch(url);
    if (!imgResponse.ok) {
      return { publicUrl: null, error: `HTTP ${imgResponse.status}` };
    }

    const contentType = imgResponse.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png")
      ? "png"
      : contentType.includes("webp")
        ? "webp"
        : contentType.includes("gif")
          ? "gif"
          : contentType.includes("svg")
            ? "svg"
            : "jpg";

    const blob = await imgResponse.blob();
    const fileName = `cdn-migrate/${folder}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("site-assets")
      .upload(fileName, blob, { contentType, cacheControl: "31536000", upsert: false });

    if (uploadError) {
      return { publicUrl: null, error: uploadError.message };
    }

    const { data: { publicUrl } } = supabase.storage.from("site-assets").getPublicUrl(fileName);
    return { publicUrl };
  } catch (error) {
    return { publicUrl: null, error: String(error) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { action } = await req.json();

    if (action === "scan") {
      const items = await scanAllCandidates(supabase, supabaseUrl);

      return new Response(JSON.stringify({ total: items.length, items }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "migrate") {
      const candidates = await scanAllCandidates(supabase, supabaseUrl);
      const batch = candidates.slice(0, BATCH_LIMIT);
      const results: MigrationResult[] = [];

      for (const candidate of batch) {
        const folder = candidate.table === "site_settings" ? "site-settings" : candidate.table;
        const { publicUrl, error } = await migrateUrl(supabase, candidate.url, folder);

        if (!publicUrl) {
          results.push({
            table: candidate.table,
            column: candidate.column,
            id: candidate.id,
            old_url: candidate.url,
            new_url: "",
            status: "failed",
            error: error || "Unknown migration error",
          });
          continue;
        }

        if (candidate.table === "site_settings" && "path" in candidate) {
          const { data: row, error: fetchError } = await supabase
            .from("site_settings")
            .select("id,value")
            .eq("id", candidate.id)
            .single();

          if (fetchError || !row) {
            results.push({
              table: candidate.table,
              column: candidate.column,
              id: candidate.id,
              old_url: candidate.url,
              new_url: publicUrl,
              status: "failed",
              error: fetchError?.message || "Site setting not found",
            });
            continue;
          }

          const updatedValue = setNestedValue(row.value, candidate.path, publicUrl);
          const { error: updateError } = await supabase
            .from("site_settings")
            .update({ value: updatedValue })
            .eq("id", candidate.id);

          if (updateError) {
            results.push({
              table: candidate.table,
              column: candidate.column,
              id: candidate.id,
              old_url: candidate.url,
              new_url: publicUrl,
              status: "failed",
              error: updateError.message,
            });
          } else {
            results.push({
              table: candidate.table,
              column: candidate.column,
              id: candidate.id,
              old_url: candidate.url,
              new_url: publicUrl,
              status: "migrated",
            });
          }

          continue;
        }

        const { error: updateError } = await supabase
          .from(candidate.table)
          .update({ [candidate.column]: publicUrl })
          .eq("id", candidate.id);

        if (updateError) {
          results.push({
            table: candidate.table,
            column: candidate.column,
            id: candidate.id,
            old_url: candidate.url,
            new_url: publicUrl,
            status: "failed",
            error: updateError.message,
          });
        } else {
          results.push({
            table: candidate.table,
            column: candidate.column,
            id: candidate.id,
            old_url: candidate.url,
            new_url: publicUrl,
            status: "migrated",
          });
        }
      }

      const remainingItems = await scanAllCandidates(supabase, supabaseUrl);
      const migrated = results.filter((item) => item.status === "migrated").length;
      const failed = results.filter((item) => item.status === "failed").length;

      return new Response(JSON.stringify({
        migrated,
        failed,
        total: results.length,
        done: remainingItems.length === 0,
        remaining: remainingItems.length,
        results,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use 'scan' or 'migrate'" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});