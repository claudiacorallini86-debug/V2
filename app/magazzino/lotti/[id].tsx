import React, { useState, useEffect } from 'react';
import { StyleSheet, Alert, Platform, TouchableOpacity } from 'react-native';
import {
  YStack,
  XStack,
  SizableText,
  Button,
  SafeArea,
  ScrollView,
  Input,
  Label,
  BlinkSelect,
  useBlinkToast,
  Separator,
  Theme,
  Badge,
  Spinner,
} from '@blinkdotnew/mobile-ui';
import { AppHeader } from '@/components/AppHeader';
import { useIngredients, IngredientLot } from '@/hooks/useIngredients';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Save, Calendar, Info, Package, AlertTriangle, Trash2 } from '@blinkdotnew/mobile-ui';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { LotPhotos } from '@/components/magazzino/LotPhotos';
import { LotTraceability } from '@/components/magazzino/LotTraceability';

const STATUS_OPTIONS = [
  { label: 'Attivo', value: 'active' },
  { label: 'Esaurito', value: 'exhausted' },
  { label: 'Scaduto', value: 'expired' },
  { label: 'Ritirato', value: 'recalled' },
];

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderColor: 'transparent',
  },
  tabButtonActive: {
    borderColor: '#4A90D9',
  },
});

export default function LottoDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { lots, updateLot, deleteLot, isLoading, lotStockMap, ingredients } = useIngredients();
  const { toast } = useBlinkToast();

  const [activeTab, setActiveTab] = useState<'info' | 'traceability'>('info');

  const lot = lots.find(l => l.id === id);
  const ingredient = ingredients.find(i => i.id === lot?.ingredientId);

  const [form, setForm] = useState({
    lotCode: '',
    supplier: '',
    deliveryDate: '',
    expiryDate: '',
    initialQuantity: '',
    conservation: '',
    status: 'active' as any,
    note: '',
  });

  useEffect(() => {
    if (lot) {
      setForm({
        lotCode: lot.lotCode,
        supplier: lot.supplier,
        deliveryDate: lot.deliveryDate,
        expiryDate: lot.expiryDate || '',
        initialQuantity: lot.initialQuantity.toString(),
        conservation: lot.conservation,
        status: lot.status,
        note: lot.note || '',
      });
    }
  }, [lot]);

  const handleSave = async () => {
    if (!lot) return;

    try {
      await updateLot.mutateAsync({
        id: lot.id,
        lotCode: form.lotCode,
        supplier: form.supplier,
        deliveryDate: form.deliveryDate,
        expiryDate: form.expiryDate || undefined,
        initialQuantity: parseFloat(form.initialQuantity),
        conservation: form.conservation,
        status: form.status,
        note: form.note,
      });

      toast('Aggiornato', { message: 'Lotto aggiornato correttamente.', variant: 'success' });
      router.back();
    } catch (error: any) {
      console.error('Update lot error:', error);
      Alert.alert('Errore', error.message || 'Errore durante il salvataggio.');
    }
  };

  const handleDelete = async () => {
    if (!lot) return;

    const confirmDelete = () => {
      deleteLot.mutate(lot.id, {
        onSuccess: () => {
          toast('Eliminato', { message: 'Lotto rimosso correttamente.', variant: 'success' });
          router.back();
        },
        onError: (err: any) => {
          Alert.alert('Errore', err.message || 'Impossibile eliminare il lotto.');
        }
      });
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Sei sicuro di voler eliminare ${lot.lotCode}? Questa azione è irreversibile.`)) confirmDelete();
    } else {
      Alert.alert(
        'Conferma eliminazione', 
        `Sei sicuro di voler eliminare ${lot.lotCode}? Questa azione è irreversibile.`, 
        [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Elimina', style: 'destructive', onPress: confirmDelete }
        ]
      );
    }
  };

  if (isLoading && !lot) {
    return <LoadingOverlay visible message="Caricamento..." />;
  }

  if (!lot) {
    return (
      <SafeArea>
        <AppHeader title="Lotto non trovato" variant="back" onBack={() => router.back()} />
        <YStack flex={1} alignItems="center" justifyContent="center" padding="$4">
          <Package size={48} color="$color8" />
          <SizableText marginTop="$2">Lotto non trovato o eliminato.</SizableText>
          <Button marginTop="$4" onPress={() => router.back()}>Torna indietro</Button>
        </YStack>
      </SafeArea>
    );
  }

  const stock = lotStockMap[lot.id] ?? lot.initialQuantity;

  return (
    <SafeArea>
      <AppHeader
        title="Dettaglio Lotto"
        variant="back"
        onBack={() => router.back()}
        rightSlot={
          activeTab === 'info' && (
            <Button
              size="$3"
              theme="active"
              icon={<Save size={18} />}
              onPress={handleSave}
              disabled={updateLot.isPending}
            >
              Salva
            </Button>
          )
        }
      />

      <XStack backgroundColor="$color1" borderBottomWidth={1} borderColor="$color4">
        <TabButton
          label="Informazioni"
          active={activeTab === 'info'}
          onPress={() => setActiveTab('info')}
        />
        <TabButton
          label="Tracciabilità"
          active={activeTab === 'traceability'}
          onPress={() => setActiveTab('traceability')}
        />
      </XStack>

      <ScrollView showsVerticalScrollIndicator={false}>
        {activeTab === 'info' ? (
          <YStack padding="$4" gap="$4">
            <YStack gap="$1" padding="$3" backgroundColor="$color2" borderRadius="$4">
              <SizableText size="$2" color="$color9" fontWeight="600">INGREDIENTE</SizableText>
              <SizableText size="$5" fontWeight="800">{lot.ingredientName}</SizableText>
              <XStack gap="$2" marginTop="$2" alignItems="center">
                <SizableText size="$2" color="$color9">Giacenza attuale lotto:</SizableText>
                <SizableText size="$4" fontWeight="800" color={stock <= 0 ? '$color10' : '$green10'}>
                  {stock} {ingredient?.measurementUnit || 'kg'}
                </SizableText>
              </XStack>
            </YStack>

            <Separator />

            <YStack gap="$2">
              <FormLabel required>Stato Lotto</FormLabel>
              <BlinkSelect
                items={STATUS_OPTIONS}
                value={form.status}
                onValueChange={(val) => setForm({ ...form, status: val })}
              />
            </YStack>

            <YStack gap="$2">
              <FormLabel required>Codice Lotto</FormLabel>
              <Input
                value={form.lotCode}
                onChangeText={(t) => setForm({ ...form, lotCode: t })}
              />
            </YStack>

            <YStack gap="$2">
              <FormLabel required>Fornitore</FormLabel>
              <Input
                value={form.supplier}
                onChangeText={(t) => setForm({ ...form, supplier: t })}
              />
            </YStack>

            <XStack gap="$3">
              <YStack flex={1} gap="$2">
                <FormLabel required>Data Consegna</FormLabel>
                <Input
                  value={form.deliveryDate}
                  onChangeText={(t) => setForm({ ...form, deliveryDate: t })}
                />
              </YStack>
              <YStack flex={1} gap="$2">
                <FormLabel>Data Scadenza</FormLabel>
                <Input
                  value={form.expiryDate}
                  onChangeText={(t) => setForm({ ...form, expiryDate: t })}
                />
              </YStack>
            </XStack>

            <XStack gap="$3">
              <YStack flex={1} gap="$2">
                <FormLabel required>Quantità Iniziale</FormLabel>
                <Input
                  keyboardType="numeric"
                  value={form.initialQuantity}
                  onChangeText={(t) => setForm({ ...form, initialQuantity: t })}
                />
              </YStack>
              <YStack flex={1} gap="$2">
                <FormLabel required>Conservazione</FormLabel>
                <Input
                  value={form.conservation}
                  onChangeText={(t) => setForm({ ...form, conservation: t })}
                />
              </YStack>
            </XStack>

            <YStack gap="$2">
              <FormLabel>Note</FormLabel>
              <Input
                multiline
                numberOfLines={3}
                value={form.note}
                onChangeText={(t) => setForm({ ...form, note: t })}
                height={80}
                textAlignVertical="top"
              />
            </YStack>

            <LotPhotos lotId={id as string} />

            <YStack gap="$2" marginTop="$4">
              <Button
                size="$5"
                theme="active"
                onPress={handleSave}
                disabled={updateLot.isPending}
                icon={updateLot.isPending ? null : <Save size={20} />}
              >
                Salva Modifiche
              </Button>

              <Button
                size="$5"
                variant="outline"
                theme="destructive"
                onPress={handleDelete}
                disabled={deleteLot.isPending || updateLot.isPending}
                icon={deleteLot.isPending ? <Spinner size="small" /> : <Trash2 size={20} color="$red10" />}
              >
                Elimina Lotto
              </Button>
            </YStack>

            <YStack height={40} />
          </YStack>
        ) : (
          <YStack padding="$4" gap="$4">
            <LotTraceability
              lotId={id as string}
              type="ingredient"
              lotLabel={`Ingrediente: ${lot.ingredientName} - Lotto: ${lot.lotCode}`}
            />
            <YStack height={40} />
          </YStack>
        )}
      </ScrollView>
      <LoadingOverlay visible={updateLot.isPending || deleteLot.isPending} message={deleteLot.isPending ? "Eliminazione..." : "Salvataggio..."} />
    </SafeArea>
  );
}

function TabButton({ label, active, onPress }: { label: string, active: boolean, onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.tabButton, active && styles.tabButtonActive]}
      onPress={onPress}
    >
      <SizableText
        size="$3"
        fontWeight={active ? "800" : "600"}
        color={active ? "$active" : "$color10"}
      >
        {label}
      </SizableText>
    </TouchableOpacity>
  );
}

const FormLabel = ({ children, required }: { children: string; required?: boolean }) => (
  <XStack gap="$1">
    <SizableText size="$3" color="$color11" fontWeight="600">{children}</SizableText>
    {required && <SizableText color="$red9">*</SizableText>}
  </XStack>
);
