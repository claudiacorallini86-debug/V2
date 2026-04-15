import React from 'react';
import {
  YStack,
  XStack,
  SizableText,
  Button,
  Card,
  Separator,
  Theme,
  Badge,
  Spinner,
} from '@blinkdotnew/mobile-ui';
import { useLotTraceability } from '@/hooks/useProduction';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Platform, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { formatDate } from '@/lib/date';
import { exportTraceabilityToPDF } from '@/lib/export';
import { useSettings } from '@/hooks/useSettings';

interface Props {
  lotId: string;
  type: 'ingredient' | 'production';
  lotLabel?: string; // Adding optional label for PDF title
}

export function LotTraceability({ lotId, type, lotLabel }: Props) {
  const { data: traceability, isLoading } = useLotTraceability(lotId, type);
  const { settings } = useSettings();

  if (isLoading) {
    return <XStack padding="$10" justifyContent="center"><Spinner /></XStack>;
  }

  const exportPDF = async () => {
    if (!traceability || traceability.length === 0) {
      Alert.alert('Nessun dato', 'Non ci sono dati di tracciabilità da esportare.');
      return;
    }

    try {
      await exportTraceabilityToPDF({
        title: lotLabel || `Lotto ${lotId}`,
        type: type === 'ingredient' ? 'forward' : 'backward',
        items: traceability,
        settings
      });
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Impossibile generare il PDF.');
    }
  };

  return (
    <YStack gap="$4">
      <XStack justifyContent="space-between" alignItems="center">
        <SizableText size="$4" fontWeight="800">
          {type === 'ingredient' ? 'Tracciabilità Forward' : 'Tracciabilità Backward'}
        </SizableText>
        <Button size="$2" variant="outline" icon={<Ionicons name="document-text-outline" size={14} color="#94a3b8" />} onPress={exportPDF}>
          Esporta PDF
        </Button>
      </XStack>

      {type === 'ingredient' ? (
        <YStack gap="$3">
          <SizableText size="$2" color="$color10">
            Questo lotto di ingrediente è stato utilizzato nelle seguenti produzioni:
          </SizableText>
          
          {!traceability || traceability.length === 0 ? (
            <Card bordered padding="$6" alignItems="center" backgroundColor="$color2">
              <SizableText color="$color10">Nessun utilizzo registrato</SizableText>
            </Card>
          ) : (
            traceability.map((t: any) => (
              <Card key={t.id} bordered padding="$3" backgroundColor="$color1">
                <XStack justifyContent="space-between" alignItems="center">
                  <YStack gap="$1" flex={1}>
                    <SizableText size="$2" color="$color9" fontWeight="600">
                      {formatDate(t.producedAt, true)}
                    </SizableText>
                    <SizableText fontWeight="800" size="$4">{t.productName}</SizableText>
                    <SizableText size="$1" color="$color10">Batch ID: {t.batchId}</SizableText>
                  </YStack>
                  <YStack alignItems="flex-end">
                    <SizableText fontWeight="700" color="$color12">{t.quantityUsed} {t.unit}</SizableText>
                    <SizableText size="$1" color="$color10">Quantità usata</SizableText>
                  </YStack>
                </XStack>
              </Card>
            ))
          )}
        </YStack>
      ) : (
        <YStack gap="$3">
          <SizableText size="$2" color="$color10">
            Ingredienti e lotti utilizzati per questa produzione:
          </SizableText>
          
          {!traceability || traceability.length === 0 ? (
            <Card bordered padding="$6" alignItems="center" backgroundColor="$color2">
              <SizableText color="$color10">Nessun dato di tracciabilità</SizableText>
            </Card>
          ) : (
            traceability.map((t: any) => (
              <Card key={t.id} bordered padding="$3" backgroundColor="$color1">
                <YStack gap="$2">
                  <XStack justifyContent="space-between">
                    <SizableText fontWeight="800">{t.ingredientName}</SizableText>
                    <SizableText fontWeight="700" color="$color12">{t.quantityUsed} {t.unit}</SizableText>
                  </XStack>
                  <Separator />
                  <XStack flexWrap="wrap" gap="$2">
                    <DetailBadge label="Lotto" value={t.lotCode} icon={<Ionicons name="list" size={10} color="#94a3b8" />} />
                    <DetailBadge label="Fornitore" value={t.supplier} icon={<Ionicons name="business" size={10} color="#94a3b8" />} />
                    <DetailBadge 
                      label="Consegna" 
                      value={formatDate(t.deliveryDate)} 
                      icon={<Ionicons name="calendar" size={10} color="#94a3b8" />} 
                    />
                    {t.expiryDate && (
                      <DetailBadge 
                        label="Scadenza" 
                        value={formatDate(t.expiryDate)} 
                        icon={<Ionicons name="alert-circle" size={10} color="#ef4444" />}
                        theme={new Date(t.expiryDate) < new Date() ? 'red' : 'green'}
                      />
                    )}
                  </XStack>
                </YStack>
              </Card>
            ))
          )}
        </YStack>
      )}
    </YStack>
  );
}

function DetailBadge({ label, value, icon, theme = 'active' }: { label: string, value: string, icon: any, theme?: any }) {
  return (
    <XStack gap="$1" alignItems="center" backgroundColor="$color3" paddingHorizontal="$2" paddingVertical="$1" borderRadius="$2">
      {icon}
      <SizableText size="$1" color="$color11">{label}: </SizableText>
      <SizableText size="$1" fontWeight="700" color="$color12">{value}</SizableText>
    </XStack>
  );
}