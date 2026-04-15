import React from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuth } from '../../context/AuthContext'

const ACCENT = '#4A90D9'

export default function ImpostazioniScreen() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await signOut()
    router.replace('/login')
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      {/* Profile */}
      <View style={styles.profileCard}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>
            {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.profileName}>{user?.displayName || 'Utente'}</Text>
        <Text style={styles.profileEmail}>{user?.email}</Text>
        <View style={[styles.rolePill, user?.role === 'admin' ? styles.adminPill : styles.staffPill]}>
          <Text style={styles.rolePillText}>
            {user?.role === 'admin' ? '👑 Amministratore' : '👤 Staff'}
          </Text>
        </View>
      </View>

      {/* Account section */}
      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.section}>
        <SettingRow icon="person-outline" label="Profilo utente" onPress={() => router.push('/impostazioni/profilo')} />
        <View style={styles.rowDivider} />
        <SettingRow icon="key-outline" label="Cambia password" onPress={() => router.push('/impostazioni/sicurezza')} />
      </View>

      {user?.role === 'admin' && (
        <>
          <Text style={styles.sectionTitle}>Amministrazione</Text>
          <View style={styles.section}>
            <SettingRow
              icon="people-outline"
              label="Gestione utenti"
              onPress={() => router.push('/impostazioni/utenti')}
            />
            <View style={styles.rowDivider} />
            <SettingRow
              icon="list-outline"
              label="Registro attività"
              onPress={() => router.push('/impostazioni/audit')}
            />
            <View style={styles.rowDivider} />
            <SettingRow icon="business-outline" label="Dati gelateria" onPress={() => router.push('/impostazioni/dati-gelateria')} />
          </View>
        </>
      )}

      <Text style={styles.sectionTitle}>App</Text>
      <View style={styles.section}>
        <SettingRow icon="information-circle-outline" label="Informazioni" onPress={() => {}} coming />
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>Esci dall'account</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Gelateria Amélie v1.0.0 — © 2024</Text>
    </ScrollView>
  )
}

function SettingRow({
  icon,
  label,
  onPress,
  coming = false,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
  coming?: boolean
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7} disabled={coming}>
      <Ionicons name={icon} size={20} color="#94a3b8" />
      <Text style={styles.rowLabel}>{label}</Text>
      {coming && (
        <View style={styles.comingBadge}>
          <Text style={styles.comingText}>Presto</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={16} color="#334155" />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d1117' },
  container: { padding: 20, paddingBottom: 48 },
  profileCard: {
    backgroundColor: '#16213e',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    gap: 6,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  profileName: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  profileEmail: { color: '#64748b', fontSize: 13 },
  rolePill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginTop: 4,
  },
  adminPill: { backgroundColor: '#f59e0b22' },
  staffPill: { backgroundColor: '#4A90D922' },
  rolePillText: { fontSize: 13, fontWeight: '600', color: '#e2e8f0' },
  sectionTitle: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  section: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 12,
  },
  rowLabel: { flex: 1, color: '#e2e8f0', fontSize: 15 },
  rowDivider: { height: 1, backgroundColor: '#1e3a5f', marginLeft: 48 },
  comingBadge: {
    backgroundColor: '#f59e0b22',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 4,
  },
  comingText: { color: '#f59e0b', fontSize: 11, fontWeight: '600' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7f1d1d33',
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#ef444444',
    marginBottom: 20,
  },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: '700' },
  version: { color: '#334155', fontSize: 12, textAlign: 'center' },
})