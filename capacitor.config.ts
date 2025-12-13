import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dukabook.app',
  appName: 'DukaBook',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#2563eb',
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#2563eb'
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    }
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: true
  }
};

export default config;
