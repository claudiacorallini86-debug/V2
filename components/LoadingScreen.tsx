import React from 'react';
import { View, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { YStack, SizableText } from '@blinkdotnew/mobile-ui';

export function LoadingScreen({ message = 'Caricamento in corso...' }: { message?: string }) {
  return (
    <View style={styles.container}>
      <YStack alignItems="center" gap="$6">
        <Image 
          source={require('../assets/images/icon.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <YStack alignItems="center" gap="$2">
          <ActivityIndicator size="large" color="#4A90D9" />
          <SizableText color="#94a3b8" size="$3" marginTop="$2">
            {message}
          </SizableText>
        </YStack>
        <SizableText color="#475569" size="$1" position="absolute" bottom={40}>
          GELATERIA AMÉLIE PWA v1.0
        </SizableText>
      </YStack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 30,
  },
});
