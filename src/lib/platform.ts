/**
 * Platform detection for the Capacitor-wrapped iOS build.
 *
 * Per the owner-approved App Store strategy, the native app sells NOTHING
 * in-app: Apple Guideline 3.1.1 forbids Stripe checkout for digital
 * subscriptions inside an iOS app, and 3.1.3 forbids steering users to buy
 * elsewhere. So in the native build every purchase surface is hidden
 * entirely (no upsells, no pricing page, no "buy on our website" hints),
 * while accounts that already carry entitlements (purchased on the web)
 * work normally. The web build is unaffected.
 */
import { Capacitor } from '@capacitor/core';

/** True when running inside the native (Capacitor) shell. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/** Purchases/upsells may only be shown outside the native iOS shell. */
export function purchasesEnabled(): boolean {
  return !isNativeApp();
}
