import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BlinkProvider, createTamagui, tamaguiDefaultConfig, Theme, BlinkToastProvider } from '@blinkdotnew/mobile-ui';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '../context/AuthContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

const config = createTamagui({ ...tamaguiDefaultConfig });

function WebStyleReset() {
  if (Platform.OS !== 'web') return null;
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          input:focus, textarea:focus { outline: none !important; }
          * { box-sizing: border-box; }
          body { margin: 0; padding: 0; background: #0d1117; }
        `,
      }}
    />
  );
}

// App root layout with providers
export default function RootLayout() {
  useFrameworkReady();

  return (
    <BlinkProvider 
      config={config} 
      defaultTheme="dark"
      projectId={process.env.EXPO_PUBLIC_BLINK_PROJECT_ID || 'gelateria-amelie-pwa-mm3q7wry'}
    >
      <Theme name="dark">
        <BlinkToastProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <WebStyleReset />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="login" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="+not-found" />
              </Stack>
              <StatusBar style="light" />
            </AuthProvider>
          </QueryClientProvider>
        </BlinkToastProvider>
      </Theme>
    </BlinkProvider>
  );
}
