import React, { useState } from 'react';
import {
  YStack,
  XStack,
  SizableText,
  Button,
  ScrollView,
  Input,
  Card,
  Theme,
  Separator,
  useBlinkToast,
} from '@blinkdotnew/mobile-ui';
import { useProduction, ProductionBatch } from '@/hooks/useProduction';
import { useRouter } from 'expo-router';
import { Plus, Search, Calendar, Filter, ChevronRight, Package, Info, User } from '@blinkdotnew/mobile-ui';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { exportProductionListToPDF } from '@/lib/export';
import { useSettings } from '@/hooks/useSettings';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

const Badge = ({ children, theme, variant }: any) => (
  <View style={{ 
    backgroundColor: theme === 'active' ? '#4A90D922' : '#f59e0b22',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme === 'active' ? '#4A90D944' : '#f59e0b44'
  }}>
    <SizableText size="$1" color={theme === 'active' ? '#4A90D9' : '#f59e0b'} fontWeight="700">
      {children}
    </SizableText>
  </View>
);

export default function ProduzioneScreen() {
  const router = useRouter();
  const { batches, isLoading } = useProduction();
  const { settings } = useSettings();
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const filteredBatches = batches.filter(b => {
    const matchesSearch = b.productName?.toLowerCase().includes(search.toLowerCase()) || 
                         b.recipeName?.toLowerCase().includes(search.toLowerCase());
    const matchesDate = !dateFilter || b.producedAt.includes(dateFilter);
    return matchesSearch && matchesDate;
  });

  const handleExport = async () => {
    try {
      await exportProductionListToPDF({
        date: new Date().toLocaleDateString('it-IT'),
        batches: filteredBatches,
        settings
      });
    } catch (error: any) {
      Alert.alert('Errore', 'Impossibile generare il PDF delle produzioni.');
    }
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      <YStack 
        padding="$4" 
        gap="$4" 
        backgroundColor="$background" 
        borderBottomWidth={1} 
        borderBottomColor="$color4" 
        elevation={2} 
        zIndex={10}
      >
        <XStack justifyContent="space-between" alignItems="center">
          <XStack gap="$2" alignItems="center">
            <Package size={24} color="$color9" />
            <SizableText size="$6" fontWeight="800">Produzione</SizableText>
          </XStack>
          <XStack gap="$2">
            <Button size="$3" variant="outline" icon={<Ionicons name="document-text-outline" size={16} color="#94a3b8" />} onPress={handleExport}>
              Esporta
            </Button>
            <Button 
              size="$3" 
              theme="active" 
              icon={<Plus size={18} />} 
              onPress={() => router.push('/produzione/nuovo')}
            >
              Nuovo
            </Button>
          </XStack>
        </XStack>

        <XStack gap="$2">
          <YStack flex={1}>
            <Input 
              placeholder="Cerca prodotto o ricetta..." 
              value={search} 
              onChangeText={setSearch}
              size="$3"
              backgroundColor="$color2"
            />
          </YStack>
          <YStack width={140}>
            <Input 
              placeholder="YYYY-MM-DD" 
              value={dateFilter} 
              onChangeText={setDateFilter}
              size="$3"
              backgroundColor="$color2"
            />
          </YStack>
        </XStack>
      </YStack>

      {isLoading ? (
        <LoadingOverlay visible />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <YStack padding="$4" gap="$3" paddingBottom="$8">
            {filteredBatches.length === 0 ? (
              <YStack alignItems="center" justifyContent="center" paddingVertical="$10" gap="$2">
                <Package size={48} color="$color8" />
                <SizableText color="$color10">Nessun lotto di produzione trovato</SizableText>
              </YStack>
            ) : (
              filteredBatches.map((batch) => (
                <BatchCard key={batch.id} batch={batch} />
              ))
            )}
          </YStack>
        </ScrollView>
      )}
    </YStack>
  );
}

function BatchCard({ batch }: { batch: ProductionBatch }) {
  const router = useRouter();
  
  return (
    <Card bordered padding="$4" backgroundColor="$color1" onPress={() => router.push(`/produzione/${batch.id}`)}>
      <YStack gap="$3">
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack gap="$1" flex={1}>
            <SizableText size="$2" color="$color9" fontWeight="600">
              {new Date(batch.producedAt).toLocaleString('it-IT')}
            </SizableText>
            <SizableText size="$5" fontWeight="800" numberOfLines={1}>
              {batch.productName}
            </SizableText>
            <XStack gap="$2" alignItems="center">
              <Badge size="$1" theme="active" variant="outline">
                Ricetta: {batch.recipeName}
              </Badge>
              <XStack gap="$1" alignItems="center">
                <User size={12} color="$color9" />
                <SizableText size="$1" color="$color9">{batch.operatorName}</SizableText>
              </XStack>
            </XStack>
          </YStack>
          <YStack alignItems="flex-end">
            <SizableText size="$5" fontWeight="800" color="$color12">
              {batch.quantityProduced} {batch.unitYield}
            </SizableText>
            <SizableText size="$1" color="$color10">Quantità prodotta</SizableText>
          </YStack>
        </XStack>

        <Separator />

        <XStack justifyContent="space-between">
          <YStack>
            <SizableText size="$1" color="$color10">Costo Batch Congelato</SizableText>
            <SizableText size="$3" fontWeight="700" color="$orange10">
              € {batch.frozenBatchCost.toFixed(2)}
            </SizableText>
          </YStack>
          <YStack alignItems="flex-end">
            <SizableText size="$1" color="$color10">Costo Unitario Congelato</SizableText>
            <SizableText size="$3" fontWeight="700" color="$green10">
              € {batch.frozenUnitCost.toFixed(2)} / {batch.unitYield}
            </SizableText>
          </YStack>
        </XStack>

        {batch.note && (
          <XStack gap="$2" alignItems="center" backgroundColor="$color2" padding="$2" borderRadius="$3">
            <Info size={14} color="$color9" />
            <SizableText size="$1" color="$color11" numberOfLines={1}>{batch.note}</SizableText>
          </XStack>
        )}
      </YStack>
    </Card>
  );
}