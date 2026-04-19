import React, { useState } from 'react';
import {
  YStack,
  XStack,
  SizableText,
  Button,
  ScrollView,
} from '@blinkdotnew/mobile-ui';
import { TemperatureTab } from '@/components/haccp/TemperatureTab';
import { CleaningTab } from '@/components/haccp/CleaningTab';
import { NonConformityTab } from '@/components/haccp/NonConformityTab';
import { Ionicons } from '@expo/vector-icons';
import { Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useHaccp } from '@/hooks/useHaccp';
import { useSettings } from '@/hooks/useSettings';
import { exportHaccpToPDF } from '@/lib/export';

export default function HaccpScreen() {
  const [activeTab, setActiveTab] = useState('temp');
  const { user } = useAuth();
  const { temperatureLogs, checklists, nonConformities, isLoading } = useHaccp();
  const { settings } = useSettings();

  const exportMonthlyPDF = async () => {
    const now = new Date();
    const monthNames = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
    ];
    const label = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    
    try {
      await exportHaccpToPDF({
        month: label,
        temperatureLogs,
        checklists,
        nonConformities,
        settings
      });
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Impossibile generare il PDF.');
    }
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Header — stesso stile delle altre pagine */}
      <YStack
        paddingHorizontal="$4"
        paddingVertical="$3"
        backgroundColor="$background"
        borderBottomWidth={1}
        borderBottomColor="$color4"
        zIndex={10}
      >
        <XStack justifyContent="space-between" alignItems="center">
          <XStack gap="$2" alignItems="center">
            <Ionicons name="shield-checkmark-outline" size={24} color="#4A90D9" />
            <SizableText size="$6" fontWeight="800">Registro HACCP</SizableText>
          </XStack>
          <Button
            size="$3"
            theme="active"
            icon={<Ionicons name="document-text-outline" size={14} color="white" />}
            onPress={exportMonthlyPDF}
            disabled={isLoading}
          >
            Esporta PDF
          </Button>
        </XStack>
      </YStack>

      {/* Tab bar */}
      <XStack backgroundColor="$color1" borderBottomWidth={1} borderColor="$color4">
        <TabButton
          icon="thermometer-outline"
          label="Temperature"
          active={activeTab === 'temp'}
          onPress={() => setActiveTab('temp')}
        />
        <TabButton
          icon="checkmark-done-outline"
          label="Pulizie"
          active={activeTab === 'cleaning'}
          onPress={() => setActiveTab('cleaning')}
        />
        <TabButton
          icon="warning-outline"
          label="Non Conf."
          active={activeTab === 'nc'}
          onPress={() => setActiveTab('nc')}
        />
      </XStack>

      {/* Content */}
      <YStack flex={1}>
        {activeTab === 'temp' && <TemperatureTab />}
        {activeTab === 'cleaning' && <CleaningTab />}
        {activeTab === 'nc' && <NonConformityTab />}
      </YStack>
    </YStack>
  );
}

function TabButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: string;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.tabButton, active && styles.activeTab]}
    >
      <XStack gap="$2" alignItems="center">
        <Ionicons name={icon as any} size={16} color={active ? '#4A90D9' : '#94a3b8'} />
        <SizableText
          size="$2"
          fontWeight={active ? '800' : '500'}
          color={active ? '$active' : '$color10'}
        >
          {label}
        </SizableText>
      </XStack>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderColor: 'transparent',
  },
  activeTab: {
    borderColor: '#4A90D9',
  },
});