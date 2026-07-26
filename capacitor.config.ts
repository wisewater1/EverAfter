import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.everafterai.app',
  appName: 'EverAfter',
  webDir: 'dist',
  ios: {
    // Web content extends under the notch/home indicator; the app handles
    // its own safe-area padding via viewport-fit=cover + CSS env() insets.
    contentInset: 'never',
    backgroundColor: '#0f172a',
  },
  server: {
    // Bundled-assets mode (capacitor://localhost). Do NOT set a remote
    // server.url for App Store builds — remote-URL shells are a known
    // Guideline 4.2 rejection pattern.
    iosScheme: 'capacitor',
  },
};

export default config;
