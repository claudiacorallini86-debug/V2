import React, { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { Slot, usePathname } from 'expo-router'
import { AppHeader } from '../../components/AppHeader'
import { AppSidebar } from '../../components/AppSidebar'

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/(tabs)': 'Dashboard',
  '/(tabs)/index': 'Dashboard',
  '/ingredienti': 'Ingredienti',
  '/(tabs)/ingredienti': 'Ingredienti',
  '/ricette': 'Ricette',
  '/(tabs)/ricette': 'Ricette',
  '/prodotti': 'Prodotti',
  '/(tabs)/prodotti': 'Prodotti',
  '/magazzino': 'Magazzino',
  '/(tabs)/magazzino': 'Magazzino',
  '/produzione': 'Produzione',
  '/(tabs)/produzione': 'Produzione',
  '/haccp': 'HACCP',
  '/(tabs)/haccp': 'HACCP',
  '/impostazioni': 'Impostazioni',
  '/(tabs)/impostazioni': 'Impostazioni',
}

export default function TabsLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  const title = ROUTE_TITLES[pathname] ?? 'Gelateria Amélie'

  return (
    <View style={styles.root}>
      <AppHeader title={title} onMenuPress={() => setSidebarOpen(true)} />
      <View style={styles.content}>
        <Slot />
      </View>
      <AppSidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  content: {
    flex: 1,
  },
})
