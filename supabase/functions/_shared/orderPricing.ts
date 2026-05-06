export type PackageTable = 'packages' | 'special_packages' | 'preorder_packages';

type CandidateRow = {
  id: string;
  name: string;
  price: number;
  g2bulk_product_id: string | null;
  games?: { name: string } | { name: string }[] | null;
};

export type ResolvedPackage = {
  table: PackageTable;
  id: string;
  gameName: string;
  packageName: string;
  price: number;
  g2bulkProductId: string | null;
};

export type ResolvePackageInput = {
  gameName: string;
  packageName: string;
  g2bulkProductId?: string | null;
  isPreorder: boolean;
};

export function hasAmountMismatch(requestedAmount: number, authoritativeAmount: number, tolerance = 0.0001): boolean {
  return Math.abs(Number(requestedAmount) - Number(authoritativeAmount)) > tolerance;
}

export function resolveWalletChargeAmount(orderAmount: number): number {
  return Number(orderAmount);
}

function extractGameName(games: CandidateRow['games']): string {
  if (Array.isArray(games)) return String(games[0]?.name ?? '');
  return String(games?.name ?? '');
}

function normalizeForCompare(value: string | null | undefined): string {
  return String(value ?? '').trim().toLowerCase();
}

export function selectBestPackageMatch(
  candidates: ResolvedPackage[],
  expected: ResolvePackageInput,
): ResolvedPackage | null {
  if (!candidates.length) return null;

  const expectedGame = normalizeForCompare(expected.gameName);
  const expectedPackage = normalizeForCompare(expected.packageName);
  const expectedProduct = normalizeForCompare(expected.g2bulkProductId);

  const exactProductMatch = candidates.filter(
    (candidate) =>
      normalizeForCompare(candidate.gameName) === expectedGame &&
      normalizeForCompare(candidate.packageName) === expectedPackage &&
      expectedProduct &&
      normalizeForCompare(candidate.g2bulkProductId) === expectedProduct,
  );
  if (exactProductMatch.length === 1) return exactProductMatch[0];

  const exactNameMatch = candidates.filter(
    (candidate) =>
      normalizeForCompare(candidate.gameName) === expectedGame &&
      normalizeForCompare(candidate.packageName) === expectedPackage,
  );
  if (exactNameMatch.length === 1) return exactNameMatch[0];

  return null;
}

export async function resolveAuthoritativePackage(
  supabase: any,
  input: ResolvePackageInput,
): Promise<ResolvedPackage | null> {
  const searchTables: PackageTable[] = input.isPreorder
    ? ['preorder_packages']
    : ['packages', 'special_packages'];

  const allMatches: ResolvedPackage[] = [];

  for (const table of searchTables) {
    let query = supabase
      .from(table)
      .select('id, name, price, g2bulk_product_id, games!inner(name)')
      .eq('name', input.packageName)
      .eq('games.name', input.gameName);

    if (input.g2bulkProductId) {
      query = query.eq('g2bulk_product_id', input.g2bulkProductId);
    }

    const { data, error } = await query;
    if (error) throw error;

    for (const row of (data ?? []) as CandidateRow[]) {
      allMatches.push({
        table,
        id: row.id,
        gameName: extractGameName(row.games),
        packageName: row.name,
        price: Number(row.price),
        g2bulkProductId: row.g2bulk_product_id ?? null,
      });
    }
  }

  return selectBestPackageMatch(allMatches, input);
}
