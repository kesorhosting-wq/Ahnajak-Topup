/**
 * Compatibility shim — makes existing `import { supabase } from '@/integrations/supabase/client'`
 * work transparently by routing through the new Express+MySQL API client.
 *
 * This lets all 44 frontend files compile and function WITHOUT individual rewrites.
 * Each file can be migrated to direct `api.*` calls later for clarity.
 */
import api from '@/lib/api';

// ── Query builder chain (mimics supabase.from().select().eq().order().single() etc.) ──
interface QueryBuilder {
  select: (cols?: string) => QueryBuilder;
  insert: (data: any | any[]) => QueryBuilder;
  update: (data: any) => QueryBuilder;
  delete: () => QueryBuilder;
  upsert: (data: any, opts?: any) => QueryBuilder;
  eq: (col: string, val: any) => QueryBuilder;
  neq: (col: string, val: any) => QueryBuilder;
  in: (col: string, vals: any[]) => QueryBuilder;
  order: (col: string, opts?: { ascending?: boolean }) => QueryBuilder;
  limit: (n: number) => QueryBuilder;
  single: () => Promise<{ data: any; error: any }>;
  maybeSingle: () => Promise<{ data: any; error: any }>;
  then: (resolve: any, reject?: any) => any;
}

// Table → API endpoint mapping
const TABLE_ENDPOINTS: Record<string, { list: string; item: (id: string) => string; extra?: Record<string, string> }> = {
  games:               { list: '/games', item: (id) => `/games/${id}` },
  packages:            { list: '/games/packages/all', item: (id) => `/games/0/packages/${id}` },
  special_packages:    { list: '/games/special-packages/all', item: (id) => `/games/0/special-packages/${id}` },
  site_settings:      { list: '/settings', item: (id) => `/settings/${id}` },
  topup_orders:        { list: '/orders', item: (id) => `/orders/${id}` },
  preorder_orders:     { list: '/preorders/orders', item: (id) => `/preorders/orders/${id}` },
  preorder_games:      { list: '/preorders/games', item: (id) => `/preorders/games/${id}` },
  preorder_packages:   { list: '/preorders/packages', item: (id) => `/preorders/packages/${id}` },
  events:              { list: '/events', item: (id) => `/events/${id}` },
  coupons:             { list: '/coupons', item: (id) => `/coupons/${id}` },
  point_exchange_configs: { list: '/points/configs/all', item: (id) => `/points/configs/${id}` },
  point_transactions:  { list: '/points/transactions', item: (id) => `/points/transactions/${id}` },
  wallet_transactions: { list: '/wallet', item: (id) => `/wallet/${id}` },
  payment_gateways:    { list: '/payments', item: (id) => `/payments/${id}` },
  payment_gateways_public: { list: '/payments', item: (id) => `/payments/${id}` },
  payment_qr_settings:  { list: '/payments/qr-settings', item: (id) => `/payments/qr-settings/${id}` },
  api_configurations:  { list: '/admin/api-configs', item: (id) => `/admin/api-configs/${id}` },
  game_verification_configs: { list: '/admin/game-verification', item: (id) => `/admin/game-verification/${id}` },
  g2bulk_products:     { list: '/admin/g2bulk-products', item: (id) => `/admin/g2bulk-products/${id}` },
  user_roles:          { list: '/auth/session', item: (id) => `/auth/session` },
  profiles:            { list: '/auth/session', item: (id) => `/auth/session` },
  users:               { list: '/auth/session', item: (id) => `/auth/session` },
};

function makeQuery(table: string): QueryBuilder {
  let _select = '*';
  let _filters: { col: string; val: any; op: string }[] = [];
  let _order: { col: string; ascending: boolean } | null = null;
  let _limit: number | null = null;
  let _insertData: any = null;
  let _updateData: any = null;
  let _isDelete = false;
  let _isUpsert = false;
  let _upsertConflict: string | null = null;
  let _single = false;
  let _maybeSingle = false;
  let _isResolved = false;
  let _resolved: { data: any; error: any } | null = null;

  const self: any = {
    select: (cols?: string) => { if (cols) _select = cols; return self; },
    insert: (data: any) => { _insertData = data; return self; },
    update: (data: any) => { _updateData = data; return self; },
    delete: () => { _isDelete = true; return self; },
    upsert: (data: any, opts?: any) => { _insertData = data; _isUpsert = true; _upsertConflict = opts?.onConflict || null; return self; },
    eq: (col: string, val: any) => { _filters.push({ col, val, op: 'eq' }); return self; },
    neq: (col: string, val: any) => { _filters.push({ col, val, op: 'neq' }); return self; },
    in: (col: string, vals: any[]) => { _filters.push({ col, val: vals, op: 'in' }); return self; },
    order: (col: string, opts?: { ascending?: boolean }) => { _order = { col, ascending: opts?.ascending ?? true }; return self; },
    limit: (n: number) => { _limit = n; return self; },
    single: () => { _single = true; return execute(); },
    maybeSingle: () => { _maybeSingle = true; return execute(); },
    then: (resolve: any, reject?: any) => {
      return execute().then(resolve, reject);
    },
  };

  async function execute(): Promise<{ data: any; error: any }> {
    if (_isResolved && _resolved) return _resolved;
    const ep = TABLE_ENDPOINTS[table];

    // INSERT
    if (_insertData && !_isUpsert) {
      const result = await api.post(ep.list, _insertData);
      _isResolved = true; _resolved = result;
      return result;
    }

    // UPSERT
    if (_isUpsert) {
      if (_upsertConflict === 'key' && table === 'site_settings') {
        // site_settings upsert by key
        const key = (_insertData as any).key;
        const value = (_insertData as any).value;
        const result = await api.put(`/settings/${key}`, { value });
        _isResolved = true; _resolved = result;
        return result;
      }
      // Generic upsert: try insert, fallback to update
      const result = await api.put(ep.list, _insertData);
      _isResolved = true; _resolved = result;
      return result;
    }

    // UPDATE (needs eq('id', ...) filter)
    if (_updateData) {
      const idFilter = _filters.find(f => f.col === 'id');
      if (idFilter) {
        const result = await api.put(ep.item(idFilter.val), _updateData);
        _isResolved = true; _resolved = result;
        return result;
      }
      // Bulk update with status filter (e.g., atomic lock)
      const statusFilter = _filters.find(f => f.col === 'status' && f.op === 'in');
      if (statusFilter) {
        // Use the list endpoint with a PUT (admin bulk update)
        const result = await api.put(ep.list, { ..._updateData, _filter: _filters });
        _isResolved = true; _resolved = result;
        return result;
      }
      const result = await api.put(ep.list, _updateData);
      _isResolved = true; _resolved = result;
      return result;
    }

    // DELETE (needs eq('id', ...) filter)
    if (_isDelete) {
      const idFilter = _filters.find(f => f.col === 'id');
      if (idFilter) {
        const result = await api.del(ep.item(idFilter.val));
        _isResolved = true; _resolved = result;
        return result;
      }
      const result = await api.del(ep.list);
      _isResolved = true; _resolved = result;
      return result;
    }

    // SELECT
    // Special-case: payment_gateways_public uses the public endpoint (no admin required)
    if (table === 'payment_gateways_public') {
      const slugFilter = _filters.find(f => f.col === 'slug');
      if (slugFilter) {
        const pubResult = await api.get(`/payments/public/${slugFilter.val}`);
        if (!pubResult.error && pubResult.data) {
          const finalResult = _maybeSingle || _single ? pubResult : { data: [pubResult.data], error: null };
          _isResolved = true; _resolved = finalResult;
          return finalResult;
        }
        // Fallback: return empty
        const empty = _maybeSingle ? { data: null, error: null } : { data: [], error: null };
        _isResolved = true; _resolved = empty;
        return empty;
      }
      // No slug filter — return empty (public shouldn't list all gateways)
      const empty = _maybeSingle ? { data: null, error: null } : { data: [], error: null };
      _isResolved = true; _resolved = empty;
      return empty;
    }

    // Special-case: site_settings returns a flat object { key: value }
    if (table === 'site_settings') {
      const result = await api.get('/settings');
      if (result.error) { _isResolved = true; _resolved = result; return result; }
      // Convert { key: value } object to array of { key, value } rows
      const rows = Object.entries(result.data || {}).map(([key, value]) => ({ key, value }));
      if (_single || _maybeSingle) {
        const finalResult = rows.length > 0 ? { data: rows[0], error: null } : { data: null, error: null };
        _isResolved = true; _resolved = finalResult;
        return finalResult;
      }
      const finalResult = { data: rows, error: null };
      _isResolved = true; _resolved = finalResult;
      return finalResult;
    }

    // Special-case: user_roles — check via auth session
    if (table === 'user_roles') {
      const userIdFilter = _filters.find(f => f.col === 'user_id');
      const roleFilter = _filters.find(f => f.col === 'role');
      if (userIdFilter && roleFilter) {
        const sessionResult = await api.get('/auth/session');
        if (sessionResult.error) {
          const empty = _maybeSingle ? { data: null, error: null } : { data: [], error: null };
          _isResolved = true; _resolved = empty;
          return empty;
        }
        const isAdmin = sessionResult.data?.isAdmin && roleFilter.val === 'admin';
        const finalResult = _maybeSingle || _single
          ? { data: isAdmin ? { role: roleFilter.val } : null, error: null }
          : { data: isAdmin ? [{ role: roleFilter.val }] : [], error: null };
        _isResolved = true; _resolved = finalResult;
        return finalResult;
      }
    }

    let result = await api.get(ep.list);
    if (result.error) { _isResolved = true; _resolved = result; return result; }

    let rows = result.data;
    if (!Array.isArray(rows)) {
      // Some endpoints return objects; wrap in array
      rows = rows ? [rows] : [];
    }

    // Apply filters client-side
    for (const f of _filters) {
      if (f.op === 'in') {
        rows = rows.filter((r: any) => Array.isArray(f.val) && f.val.includes(r[f.col]));
      } else if (f.op === 'neq') {
        rows = rows.filter((r: any) => r[f.col] !== f.val);
      } else {
        rows = rows.filter((r: any) => r[f.col] === f.val);
      }
    }

    // Apply order
    if (_order) {
      rows = [...rows].sort((a: any, b: any) => {
        const av = a[_order!.col], bv = b[_order!.col];
        if (av === bv) return 0;
        const cmp = av > bv ? 1 : -1;
        return _order!.ascending ? cmp : -cmp;
      });
    }

    // Apply limit
    if (_limit !== null) {
      rows = rows.slice(0, _limit);
    }

    if (_single) {
      const finalResult = rows.length > 0 ? { data: rows[0], error: null } : { data: null, error: { message: 'No rows found' } };
      _isResolved = true; _resolved = finalResult;
      return finalResult;
    }

    if (_maybeSingle) {
      const finalResult = rows.length > 0 ? { data: rows[0], error: null } : { data: null, error: null };
      _isResolved = true; _resolved = finalResult;
      return finalResult;
    }

    const finalResult = { data: rows, error: null };
    _isResolved = true; _resolved = finalResult;
    return finalResult;
  }

  return self as QueryBuilder;
}

// ── Export the supabase-compatible object ──────────────────────────────────

// Map edge function names (used by supabase.functions.invoke) to actual API paths
const FUNCTION_PATH_MAP: Record<string, string> = {
  'get-ikhode-public-config': '/payments/public/ikhode-bakong',
  'process-topup': '/process-topup',
  'verify-game-id': '/verify-game-id',
  'g2bulk-api': '/g2bulk-api',
  'ahnajak-khqr': '/ahnajak-khqr',
  'khqrcc-payment': '/payments/khqrcc-payment',
  'ikhode-payment': '/ikhode-payment',
  'update-prices': '/update-prices',
};

export const supabase = {
  from: (table: string) => makeQuery(table),

  auth: api.auth,

  functions: {
    invoke: (name: string, options?: { body?: any }) => {
      const path = FUNCTION_PATH_MAP[name] || '/' + name;
      return api.post(path, options?.body);
    },
  },

  rpc: (name: string, params?: any) => {
    // Map RPC names to API endpoints
    if (name === 'apply_coupon') return api.post('/coupons/apply', params);
    if (name === 'exchange_points_for_coupon') return api.post('/points/exchange', params);
    return api.post(`/rpc/${name}`, params);
  },

  storage: api.storage,

  channel: api.channel,
  removeChannel: () => {},

  // Direct API access for files that need it
  _api: api,
};
