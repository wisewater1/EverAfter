import { Provider } from '@prisma/client';
import { ProviderDriver } from '../types/index.js';

// Fully implemented providers
import { terraProvider } from './terra.js';
import { ouraProvider } from './oura.js';
import { fitbitProvider } from './fitbit.js';
import { dexcomProvider } from './dexcom.js';
import { stravaProvider } from './strava.js';

// Scaffold providers (pending implementation)
import {
  whoopProvider,
  garminProvider,
  withingsProvider,
  polarProvider,
  googleFitProvider,
  abbottLibreProvider,
  appleHealthProvider,
  samsungHealthProvider,
  myFitnessPalProvider,
  validicProvider,
  humanApiProvider,
  metriportProvider,
  rookProvider,
  spikeProvider,
} from './scaffold-providers.js';

export const PROVIDER_REGISTRY: Record<Provider, ProviderDriver> = {
  // ✅ Fully Implemented (OAuth + Webhooks + Sync)
  [Provider.TERRA]: terraProvider,
  [Provider.OURA]: ouraProvider,
  [Provider.FITBIT]: fitbitProvider,
  [Provider.DEXCOM]: dexcomProvider,
  [Provider.STRAVA]: stravaProvider,

  // 🚧 Pending Implementation (scaffolded structure)
  [Provider.WHOOP]: whoopProvider,
  [Provider.GARMIN]: garminProvider,
  [Provider.WITHINGS]: withingsProvider,
  [Provider.POLAR]: polarProvider,
  [Provider.GOOGLE_FIT]: googleFitProvider,
  [Provider.ABBOTT_LIBRE]: abbottLibreProvider,

  // 📱 Mobile Bridges (different auth flow)
  [Provider.APPLE_HEALTH]: appleHealthProvider,
  [Provider.SAMSUNG_HEALTH]: samsungHealthProvider,

  // ⚠️ No Public API
  [Provider.MYFITNESSPAL]: myFitnessPalProvider,

  // 🔜 Coming Soon (aggregators)
  [Provider.VALIDIC]: validicProvider,
  [Provider.HUMAN_API]: humanApiProvider,
  [Provider.METRIPORT]: metriportProvider,
  [Provider.ROOK]: rookProvider,
  [Provider.SPIKE]: spikeProvider,
};

export function getProvider(provider: Provider): ProviderDriver {
  const driver = PROVIDER_REGISTRY[provider];
  if (!driver) {
    throw new Error(`Provider driver not found: ${provider}`);
  }
  return driver;
}

export function isProviderImplemented(provider: Provider): boolean {
  const implemented: Provider[] = [
    Provider.TERRA,
    Provider.OURA,
    Provider.FITBIT,
    Provider.DEXCOM,
    Provider.STRAVA,
  ];
  return implemented.includes(provider);
}

export function listAvailableProviders(): Provider[] {
  return Object.keys(PROVIDER_REGISTRY) as Provider[];
}

export function listImplementedProviders(): Provider[] {
  return [
    Provider.TERRA,
    Provider.OURA,
    Provider.FITBIT,
    Provider.DEXCOM,
    Provider.STRAVA,
  ];
}
