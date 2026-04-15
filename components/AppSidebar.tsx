import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, usePathname } from 'expo-router'
import { useAuth } from '../context/AuthContext'

const PRIMARY = '#1a1a2e'
const ACCENT = '#4A90D9'
const SURFACE = '#16213e'

interface NavItem {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  iconActive: keyof typeof Ionicons.glyphMap
  route: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: 'grid-outline', iconActive: 'grid', route: '/(tabs)/' },
  { label: 'Ingredienti', icon: 'leaf-outline', iconActive: 'leaf', route: '/(tabs)/ingredienti' },
  { label: 'Ricette', icon: 'book-outline', iconActive: 'book', route: '/(tabs)/ricette' },
  { label: 'Prodotti', icon: 'ice-cream-outline', iconActive: 'ice-cream', route: '/(tabs)/prodotti' },
  { label: 'Magazzino', icon: 'archive-outline', iconActive: 'archive', route: '/(tabs)/magazzino' },
  { label: 'Produzione', icon: 'construct-outline', iconActive: 'construct', route: '/(tabs)/produzione' },
  { label: 'HACCP', icon: 'shield-checkmark-outline', iconActive: 'shield-checkmark', route: '/(tabs)/haccp' },
  { label: 'Impostazioni', icon: 'settings-outline', iconActive: 'settings', route: '/(tabs)/impostazioni' },
]

interface Props {
  visible: boolean
  onClose: () => void
}

export function AppSidebar({ visible, onClose }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  const handleNav = (route: string) => {
    router.push(route as any)
    onClose()
  }

  const handleLogout = async () => {
    await signOut()
    router.replace('/login')
  }

  if (!visible) return null

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]} pointerEvents="box-none">
      {/* Overlay */}
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      />
      {/* Drawer */}
      <View style={styles.drawer}>
        {/* Brand */}
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <Text style={{ fontSize: 22 }}>🍦</Text>
          </View>
          <View>
            <Text style={styles.brandName}>Gelateria Amélie</Text>
            <Text style={styles.brandSub}>Gestionale</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={22} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* User info */}
        {user && (
          <View style={styles.userBox}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {(user.displayName || user.email).charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName} numberOfLines={1}>
                {user.displayName || user.email}
              </Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>
                  {user.role === 'admin' ? '👑 Admin' : '👤 Staff'}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.divider} />

        {/* Nav */}
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.route ||
              pathname.startsWith(item.route.replace('/(tabs)', ''))
            return (
              <TouchableOpacity
                key={item.route}
                style={[styles.navItem, isActive && styles.navItemActive]}
                onPress={() => handleNav(item.route)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={isActive ? item.iconActive : item.icon}
                  size={20}
                  color={isActive ? ACCENT : '#94a3b8'}
                />
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                  {item.label}
                </Text>
                {isActive && <View style={styles.activeBar} />}
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        <View style={styles.divider} />

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Esci</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: SURFACE,
    paddingTop: Platform.OS === 'ios' ? 48 : 32,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 10,
  },
  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: ACCENT + '33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  brandSub: {
    color: '#64748b',
    fontSize: 12,
  },
  closeBtn: {
    marginLeft: 'auto',
    padding: 6,
  },
  userBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    backgroundColor: '#0f3460',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 12,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  userName: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
  },
  roleBadge: {
    marginTop: 2,
  },
  roleText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#1e3a5f',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginHorizontal: 8,
    borderRadius: 10,
    marginBottom: 2,
    gap: 12,
    position: 'relative',
  },
  navItemActive: {
    backgroundColor: ACCENT + '1a',
  },
  navLabel: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  navLabelActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  activeBar: {
    position: 'absolute',
    right: 0,
    top: 8,
    bottom: 8,
    width: 3,
    backgroundColor: ACCENT,
    borderRadius: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 12,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
  },
})
