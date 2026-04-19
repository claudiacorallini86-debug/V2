import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../context/AuthContext'

const PRIMARY = '#1a1a2e'
const ACCENT = '#4A90D9'

interface Props {
  title: string
  onMenuPress?: () => void
  variant?: 'default' | 'back'
  onBack?: () => void
  rightSlot?: React.ReactNode
}

export function AppHeader({ title, onMenuPress, variant = 'default', onBack, rightSlot }: Props) {
  const { user } = useAuth()
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleOnline = () => setIsOnline(true)
      const handleOffline = () => setIsOnline(false)
      setIsOnline(navigator.onLine)
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }
  }, [])

  return (
    <View style={styles.header}>
      {variant === 'back' ? (
        <TouchableOpacity
          onPress={onBack}
          style={styles.menuBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Ionicons name="arrow-back" size={24} color="#e2e8f0" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={onMenuPress}
          style={styles.menuBtn}
          activeOpacity={0.7}
          
        >
          <Ionicons name="menu" size={24} color="#e2e8f0" />
        </TouchableOpacity>
      )}

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.right}>
        {rightSlot ? (
          rightSlot
        ) : (
          <>
            {/* Online/Offline indicator */}
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, isOnline ? styles.online : styles.offline]} />
              <Text style={[styles.statusText, isOnline ? styles.onlineText : styles.offlineText]}>
                {isOnline ? 'On' : 'Off'}
              </Text>
            </View>

            {user && (
              <View style={styles.userPill}>
                <View style={styles.avatarSmall}>
                  <Text style={styles.avatarSmallText}>
                    {(user.displayName || user.email).charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {user.displayName || user.email.split('@')[0]}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: Platform.OS === 'ios' ? 54 : Platform.OS === 'android' ? 36 : 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
    gap: 10,
    zIndex: 100,
  },
  menuBtn: {
    padding: 8,
    marginRight: 4,
  },
  title: {
    flex: 1,
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  online: {
    backgroundColor: '#22c55e',
  },
  offline: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  onlineText: {
    color: '#22c55e',
  },
  offlineText: {
    color: '#ef4444',
  },
  userPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f3460',
    borderRadius: 20,
    paddingRight: 10,
    paddingLeft: 4,
    paddingVertical: 4,
    gap: 6,
  },
  avatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSmallText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  userInfo: {
    alignItems: 'flex-start',
  },
  userName: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 60,
  },
})
