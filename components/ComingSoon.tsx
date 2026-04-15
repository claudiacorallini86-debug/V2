import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface Props {
  title: string
  icon: keyof typeof Ionicons.glyphMap
  color: string
  description: string
}

export function ComingSoon({ title, icon, color, description }: Props) {
  return (
    <View style={styles.root}>
      <View style={[styles.iconCircle, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={48} color={color} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.desc}>{description}</Text>
      <View style={styles.badge}>
        <Ionicons name="time-outline" size={14} color="#f59e0b" />
        <Text style={styles.badgeText}>Modulo in sviluppo</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0d1117',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  desc: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b22',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#f59e0b44',
  },
  badgeText: {
    color: '#f59e0b',
    fontSize: 13,
    fontWeight: '600',
  },
})
