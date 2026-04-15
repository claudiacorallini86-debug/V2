import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button, YStack, SizableText, H1 } from '@blinkdotnew/mobile-ui';
import { Ionicons } from '@expo/vector-icons';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Pagina non trovata' }} />
      <YStack flex={1} alignItems="center" justifyContent="center" padding="$4" backgroundColor="#0d1117">
        <Ionicons name="alert-circle-outline" size={80} color="#4A90D9" />
        <SizableText size="$9" fontWeight="800" color="white" marginTop="$4">404</SizableText>
        <SizableText size="$5" color="#94a3b8" textAlign="center" marginTop="$2">
          Oops! La pagina che stai cercando non esiste o è stata spostata.
        </SizableText>
        
        <Link href="/(tabs)" asChild>
          <Button theme="active" size="$5" marginTop="$8">
            Torna alla Dashboard
          </Button>
        </Link>
      </YStack>
    </>
  );
}
