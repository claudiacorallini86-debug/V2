import React from 'react';
import {
  YStack,
  XStack,
  SizableText,
  Button,
  SafeArea,
  ScrollView,
  Separator,
  Card,
  Trash2,
} from '@blinkdotnew/mobile-ui';
import { AppHeader } from '@/components/AppHeader';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useProduction } from '@/hooks/useProduction';
import { LotTraceability } from '@/components/magazzino/LotTraceability';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { Ionicons } from '@expo/vector-icons';
import { formatDate } from '@/lib/date';
import { Alert, Platform } from 'react-native';
import { useAuth } from '@/context/AuthContext';

export default function ProductionBatchDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { batches, isLoading, deleteBatch } = useProduction();

  const batch = batches.find(b => b.id === id);

  const handleDelete = async () => {
    if (!batch) return;

    const confirmDelete = () => {
      deleteBatch.mutate(batch.id, {
        onSuccess: () => {
          Alert.alert('Successo', 'Lotto eliminato correttamente.');
          router.back();
        },
        onError: (err: any) => {
          Alert.alert('Errore', err.message || 'Impossibile eliminare il lotto.');
        }
      });
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Sei sicuro di voler eliminare questo lotto di produzione? Questa azione è irreversibile.`)) confirmDelete();
    } else {
      Alert.alert(
        'Conferma eliminazione', 
        `Sei sicuro di voler eliminare questo lotto di produzione? Questa azione è irreversibile.`, 
        [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Elimina', style: 'destructive', onPress: confirmDelete }
        ]
      );
    }
  };

  if (isLoading && !batch) {
    return <LoadingOverlay visible />;
  }

  if (!batch) {
    return (
      <SafeArea>
        <AppHeader title="Batch non trovato" variant="back" onBack={() => router.back()} />
        <YStack flex={1} alignItems="center" justifyContent="center" padding="$4">
          <Ionicons name="alert-circle-outline" size={48} color="#94a3b8" />
          <SizableText marginTop="$2">Lotto di produzione non trovato.</SizableText>
          <Button marginTop="$4" onPress={() => router.back()}>Torna indietro</Button>
        </YStack>
      </SafeArea>
    );
  }

  return (
    <SafeArea>
      <AppHeader title="Dettaglio Produzione" variant="back" onBack={() => router.back()} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack padding="$4" gap="$4" paddingBottom="$10">
          
          <Card bordered padding="$4" backgroundColor="$color1" gap="$3">
            <YStack gap="$1">
              <SizableText size="$2" color="$color9" fontWeight="600">PRODOTTO PRODOTTO</SizableText>
              <SizableText size="$6" fontWeight="800" color="$color12">{batch.productName || 'Caricamento...'}</SizableText>
              <SizableText size="$3" color="$color11">Ricetta: {batch.recipeName || 'N/D'}</SizableText>
            </YStack>

            <Separator />

            <XStack justifyContent="space-between">
              <YStack gap="$1">
                <XStack gap="$2" alignItems="center">
                  <Ionicons name="time-outline" size={14} color="#94a3b8" />
                  <SizableText size="$2" color="$color10">Data Produzione</SizableText>
                </XStack>
                <SizableText fontWeight="700" color="$color12">{formatDate(batch.producedAt, true)}</SizableText>
              </YStack>
              <YStack gap="$1" alignItems="flex-end">
                <XStack gap="$2" alignItems="center">
                  <Ionicons name="person-outline" size={14} color="#94a3b8" />
                  <SizableText size="$2" color="$color10">Operatore</SizableText>
                </XStack>
                <SizableText fontWeight="700" color="$color12">{batch.operatorName || 'Sistema'}</SizableText>
              </YStack>
            </XStack>

            <XStack justifyContent="space-between" backgroundColor="$color2" padding="$3" borderRadius="$4">
              <YStack>
                <SizableText size="$1" color="$color10">Quantità Prodotta</SizableText>
                <SizableText size="$5" fontWeight="800">{batch.quantityProduced} {batch.unitYield}</SizableText>
              </YStack>
              <YStack alignItems="flex-end">
                <SizableText size="$1" color="$color10">Costo Unitario</SizableText>
                <SizableText size="$5" fontWeight="800" color="$green10">€ {batch.frozenUnitCost.toFixed(2)}</SizableText>
              </YStack>
            </XStack>

            {batch.note && (
              <YStack gap="$1" backgroundColor="$color2" padding="$3" borderRadius="$4">
                <SizableText size="$1" color="$color10" fontWeight="700">NOTE</SizableText>
                <SizableText size="$2">{batch.note}</SizableText>
              </YStack>
            )}
          </Card>

          <Separator />

          <LotTraceability 
            lotId={batch.id} 
            type="production" 
            lotLabel={`Produzione: ${batch.productName} - ${formatDate(batch.producedAt, true)}`} 
          />

          {isAdmin && (
            <Button
              size="$5"
              variant="outline"
              theme="destructive"
              marginTop="$4"
              onPress={handleDelete}
              disabled={deleteBatch.isPending}
              icon={<Trash2 size={20} color="$red10" />}
            >
              Elimina Produzione
            </Button>
          )}

        </YStack>
      </ScrollView>
      <LoadingOverlay visible={deleteBatch.isPending} />
    </SafeArea>
  );
}