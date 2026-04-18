import { createClient, AsyncStorageAdapter } from '@blinkdotnew/sdk'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as WebBrowser from 'expo-web-browser'

// v2.1: Native Auth Migration for Expo Go
export const blink = createClient({
  projectId: process.env.EXPO_PUBLIC_BLINK_PROJECT_ID || 'gelateria-amelie-pwa-mm3q7wry',
  publishableKey: process.env.EXPO_PUBLIC_BLINK_PUBLISHABLE_KEY || 'blnk_pk_bKhDPrBaVpNzz0Fo414zYpHsfHrdDxoA',
  authRequired: false,
  auth: {
    mode: 'headless',
    webBrowser: WebBrowser,
    roles: {
      admin: { permissions: ['*'] },
      staff: { permissions: ['read:*'] },
    },
  },
  storage: new AsyncStorageAdapter(AsyncStorage),
})
