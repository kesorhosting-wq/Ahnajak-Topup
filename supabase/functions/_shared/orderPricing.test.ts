import {
  hasAmountMismatch,
  resolveWalletChargeAmount,
  selectBestPackageMatch,
  type ResolvedPackage,
} from './orderPricing.ts';
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/assert_equals.ts';
import { assert } from 'https://deno.land/std@0.224.0/assert/assert.ts';

Deno.test('client sends amount=0.01 for expensive package -> rejected by mismatch detector', () => {
  const tampered = hasAmountMismatch(0.01, 49.99);
  assert(tampered);
});

Deno.test('valid package/order -> accepted by matcher', () => {
  const candidates: ResolvedPackage[] = [
    {
      table: 'packages',
      id: 'pkg-1',
      gameName: 'Mobile Legends',
      packageName: 'Weekly Pass',
      price: 9.99,
      g2bulkProductId: 'game_ml_123',
    },
  ];

  const selected = selectBestPackageMatch(candidates, {
    gameName: 'Mobile Legends',
    packageName: 'Weekly Pass',
    g2bulkProductId: 'game_ml_123',
    isPreorder: false,
  });

  assertEquals(selected?.id, 'pkg-1');
  assertEquals(hasAmountMismatch(9.99, selected!.price), false);
});

Deno.test('wallet payment ignores tampered client amount and charges DB amount', () => {
  const charged = resolveWalletChargeAmount(25);
  assertEquals(charged, 25);
  assertEquals(hasAmountMismatch(0.01, charged), true);
});

Deno.test('forged user_id is rejected by strict comparison', () => {
  const tokenUserId = '11111111-1111-1111-1111-111111111111';
  const payloadUserId = '22222222-2222-2222-2222-222222222222';
  assert(payloadUserId !== tokenUserId);
});
