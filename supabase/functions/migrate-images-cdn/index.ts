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

const IMAGE_COLUMNS = [
  { table: "games", columns: ["image", "default_package_icon"], idCol: "id" },
  { table: "packages", columns: ["icon"], idCol: "id" },
  { table: "special_packages", columns: ["icon"], idCol: "id" },
  { table: "preorder_packages", columns: ["icon"], idCol: "id" },
  { table: "events", columns: ["image"], idCol: "id" },
  { table: "payment_qr_settings", columns: ["qr_code_image"], idCol: "id" },
];

function isStorageUrl(url: string, supabaseUrl: string): boolean {
  if (!url) return true; // empty = skip
  // Extract project ref from this project's SUPABASE_URL (e.g. "mejmrckrsvvjrpmftdjo")
  const refMatch = supabaseUrl.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i);
  const ourRef = refMatch?.[1];
  if (!ourRef) return false;
  // Internal only if URL belongs to OUR project's storage
  return url.includes(`${ourRef}.supabase.co/storage/`);
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
      // Scan all tables for non-storage image URLs
      const scanResults: { table: string; column: string; id: string; url: string }[] = [];

      for (const { table, columns, idCol } of IMAGE_COLUMNS) {
        const { data: rows, error } = await supabase.from(table).select("*");
        if (error || !rows) continue;

        for (const row of rows) {
          for (const col of columns) {
            const url = row[col];
            if (url && !isStorageUrl(url, supabaseUrl)) {
              scanResults.push({ table, column: col, id: row[idCol], url });
            }
          }
        }
      }

      // Also scan site_settings for image URLs
      const { data: settingsRows } = await supabase.from("site_settings").select("*");
      if (settingsRows) {
        for (const row of settingsRows) {
          const val = row.value;
          if (typeof val === "string" && val.startsWith("http") && !isStorageUrl(val, supabaseUrl)) {
            scanResults.push({ table: "site_settings", column: `key:${row.key}`, id: row.id, url: val });
          }
          // Check for banner images array
          if (Array.isArray(val)) {
            for (const item of val) {
              if (typeof item === "string" && item.startsWith("http") && !isStorageUrl(item, supabaseUrl)) {
                scanResults.push({ table: "site_settings", column: `key:${row.key}`, id: row.id, url: item });
              }
            }
          }
          // Check JSON object values
          if (val && typeof val === "object" && !Array.isArray(val)) {
            for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
              if (typeof v === "string" && v.startsWith("http") && !isStorageUrl(v, supabaseUrl)) {
                scanResults.push({ table: "site_settings", column: `key:${row.key}.${k}`, id: row.id, url: v });
              }
            }
          }
        }
      }

      return new Response(JSON.stringify({ total: scanResults.length, items: scanResults }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "migrate") {
      const BATCH_LIMIT = 25; // process at most 25 images per invocation to avoid 150s timeout
      const results: MigrationResult[] = [];
      let processed = 0;
      let done = true;

      outer: for (const { table, columns, idCol } of IMAGE_COLUMNS) {
        const { data: rows, error } = await supabase.from(table).select("*");
        if (error || !rows) continue;

        for (const row of rows) {
          for (const col of columns) {
            const url = row[col];
            if (!url || isStorageUrl(url, supabaseUrl)) continue;

            if (processed >= BATCH_LIMIT) { done = false; break outer; }
            processed++;

            try {
              const imgResponse = await fetch(url);
              if (!imgResponse.ok) {
                results.push({ table, column: col, id: row[idCol], old_url: url, new_url: "", status: "failed", error: `HTTP ${imgResponse.status}` });
                continue;
              }

              const contentType = imgResponse.headers.get("content-type") || "image/jpeg";
              const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : contentType.includes("gif") ? "gif" : "jpg";
              const blob = await imgResponse.blob();
              const fileName = `cdn-migrate/${table}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

              const { error: uploadError } = await supabase.storage
                .from("site-assets")
                .upload(fileName, blob, { contentType, cacheControl: "31536000", upsert: false });

              if (uploadError) {
                results.push({ table, column: col, id: row[idCol], old_url: url, new_url: "", status: "failed", error: uploadError.message });
                continue;
              }

              const { data: { publicUrl } } = supabase.storage.from("site-assets").getPublicUrl(fileName);

              const { error: updateError } = await supabase
                .from(table)
                .update({ [col]: publicUrl })
                .eq(idCol, row[idCol]);

              if (updateError) {
                results.push({ table, column: col, id: row[idCol], old_url: url, new_url: publicUrl, status: "failed", error: updateError.message });
              } else {
                results.push({ table, column: col, id: row[idCol], old_url: url, new_url: publicUrl, status: "migrated" });
              }
            } catch (err) {
              results.push({ table, column: col, id: row[idCol], old_url: url, new_url: "", status: "failed", error: String(err) });
            }
          }
        }
      }

      // Migrate site_settings images (only when main batch is done)
      const { data: settingsRows } = done ? await supabase.from("site_settings").select("*") : { data: null };
      if (settingsRows) {
        for (const row of settingsRows) {
          let val = row.value;
          let changed = false;

          // String value
          if (typeof val === "string" && val.startsWith("http") && !isStorageUrl(val, supabaseUrl)) {
            const newUrl = await migrateUrl(supabase, val, "site_settings");
            if (newUrl) {
              results.push({ table: "site_settings", column: `key:${row.key}`, id: row.id, old_url: val, new_url: newUrl, status: "migrated" });
              val = newUrl;
              changed = true;
            }
          }

          // Array value (banner images)
          if (Array.isArray(val)) {
            const newArr = [];
            for (const item of val) {
              if (typeof item === "string" && item.startsWith("http") && !isStorageUrl(item, supabaseUrl)) {
                const newUrl = await migrateUrl(supabase, item, "site_settings");
                if (newUrl) {
                  results.push({ table: "site_settings", column: `key:${row.key}`, id: row.id, old_url: item, new_url: newUrl, status: "migrated" });
                  newArr.push(newUrl);
                  changed = true;
                } else {
                  newArr.push(item);
                }
              } else {
                newArr.push(item);
              }
            }
            if (changed) val = newArr;
          }

          // Object value
          if (val && typeof val === "object" && !Array.isArray(val)) {
            const obj = { ...(val as Record<string, unknown>) };
            for (const [k, v] of Object.entries(obj)) {
              if (typeof v === "string" && v.startsWith("http") && !isStorageUrl(v, supabaseUrl)) {
                const newUrl = await migrateUrl(supabase, v, "site_settings");
                if (newUrl) {
                  results.push({ table: "site_settings", column: `key:${row.key}.${k}`, id: row.id, old_url: v, new_url: newUrl, status: "migrated" });
                  obj[k] = newUrl;
                  changed = true;
                }
              }
            }
            if (changed) val = obj;
          }

          if (changed) {
            await supabase.from("site_settings").update({ value: val }).eq("id", row.id);
          }
        }
      }

      const migrated = results.filter(r => r.status === "migrated").length;
      const failed = results.filter(r => r.status === "failed").length;

      return new Response(JSON.stringify({ migrated, failed, total: results.length, done, results }), {
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

async function migrateUrl(supabase: ReturnType<typeof createClient>, url: string, folder: string): Promise<string | null> {
  try {
    const imgResponse = await fetch(url);
    if (!imgResponse.ok) return null;

    const contentType = imgResponse.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : contentType.includes("gif") ? "gif" : "jpg";
    const blob = await imgResponse.blob();
    const fileName = `cdn-migrate/${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("site-assets")
      .upload(fileName, blob, { contentType, cacheControl: "31536000", upsert: false });

    if (uploadError) return null;

    const { data: { publicUrl } } = supabase.storage.from("site-assets").getPublicUrl(fileName);
    return publicUrl;
  } catch {
    return null;
  }
}
