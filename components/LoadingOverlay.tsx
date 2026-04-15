import React from 'react'
import { YStack, Spinner, SizableText, Theme, Image } from '@blinkdotnew/mobile-ui'
import { StyleSheet, Modal, View } from 'react-native'

interface Props {
  visible: boolean
  message?: string
}

export function LoadingOverlay({ visible, message = 'Caricamento in corso...' }: Props) {
  if (!visible) return null

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.container}>
        <Theme name="dark">
          <YStack 
            backgroundColor="$background" 
            padding="$8" 
            borderRadius="$6" 
            gap="$4" 
            alignItems="center"
            elevation={10}
            borderWidth={1}
            borderColor="$color5"
            width={280}
          >
            <View style={styles.logoContainer}>
              <Image 
                source={require('../assets/images/icon.png')} 
                style={styles.logo}
              />
            </View>
            <Spinner size="large" color="#4A90D9" />
            <SizableText color="$color12" fontWeight="800" textAlign="center" marginTop="$2">{message}</SizableText>
            <SizableText color="$color10" size="$1" letterSpacing={1}>GELATERIA AMÉLIE</SizableText>
          </YStack>
        </Theme>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(13, 17, 23, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: '#1a1a2e',
    elevation: 5,
  },
  logo: {
    width: '100%',
    height: '100%',
  }
})
