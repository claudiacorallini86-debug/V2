import React, { useState, useEffect } from 'react';
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
} from '@blinkdotnew/mobile-ui';
import { AppHeader } from '@/components/AppHeader';
import { useIngredients } from '@/hooks/useIngredients';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Platform, View } from 'react-native';
import { LoadingOverlay } from '@/components/LoadingOverlay';

const CONSERVATION_TYPES = [
  { label: 'Secco (Ambiente)', value: 'secco' },
  { label: 'Frigo (+4°C)', value: 'frigo' },
  { label: 'Freezer (-18°C)', value: 'freezer' },
];

export default function NuovoLottoScreen() {
  const router = useRouter();
  const { ingredients, createLot, isLoading } = useIngredients();
  const toastContext = useBlinkToast();
  
  const showToast = (title: string, options: any) => {
    if (!toastContext) return;
    const toastFn = typeof toastContext === 'function' ? toastContext : (toastContext.toast || toastContext.show);
    if (typeof toastFn === 'function') {
      toastFn(title, options);
    }
  };

  const [form, setForm] = useState({
    ingredientId: '',
    lotCode: '',
    supplier: '',
    deliveryDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    initialQuantity: '',
    conservation: 'secco',
    note: '',
  });

  const isValid = form.ingredientId.length > 0 && 
                  form.initialQuantity.length > 0 && 
                  !isNaN(parseFloat(form.initialQuantity)) &&
                  parseFloat(form.initialQuantity) > 0;

  const selectedIngredient = ingredients.find(i => i.id === form.ingredientId);

  useEffect(() => {
    if (selectedIngredient && !form.supplier) {
      setForm(prev => ({ ...prev, supplier: selectedIngredient.defaultSupplier || '' }));
    }
    if (selectedIngredient && selectedIngredient.conservation) {
      setForm(prev => ({ ...prev, conservation: selectedIngredient.conservation }));
    }
  }, [form.ingredientId, selectedIngredient]);

  const generateLotCode = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const code = `L${year}${month}${day}-${random}`;
    setForm(prev => ({ ...prev, lotCode: code }));
  };

  const handleSave = async () => {
    if (!form.ingredientId) {
      Alert.alert('Errore', 'Seleziona un ingrediente.');
      return;
    }
    if (!form.initialQuantity || isNaN(parseFloat(form.initialQuantity))) {
      Alert.alert('Errore', 'Inserisci una quantità valida.');
      return;
    }

    let finalLotCode = form.lotCode.trim();
    if (!finalLotCode) {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      finalLotCode = `L${year}${month}${day}-${random}`;
    }

    try {
      await createLot.mutateAsync({
        ingredientId: form.ingredientId,
        lotCode: finalLotCode,
        supplier: form.supplier.trim() || 'Fornitore non specificato',
        deliveryDate: form.deliveryDate,
        expiryDate: form.expiryDate || undefined,
        initialQuantity: parseFloat(form.initialQuantity),
        conservation: form.conservation,
        status: 'active',
        note: form.note.trim(),
        measurementUnit: selectedIngredient?.measurementUnit || 'kg',
      } as any);

      showToast('Creato', { message: 'Lotto creato con successo.', variant: 'success' });
      router.back();
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Errore durante il salvataggio.');
    }
  };

  return (
    <SafeArea>
      <AppHeader 
        title="Nuovo Lotto" 
        variant="back" 
        onBack={() => router.back()} 
        rightSlot={
          <Button 
            size="$3" 
            theme="active" 
            icon={<Save size={18} />} 
            onPress={handleSave}
            disabled={createLot.isPending || !isValid}
            opacity={isValid ? 1 : 0.5}
          >
            Salva
          </Button>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack padding="$4" gap="$4">
          <YStack gap="$2">
            <FormLabel required>Ingrediente</FormLabel>
            <BlinkSelect 
              items={[
                { label: 'Seleziona ingrediente...', value: '' },
                ...ingredients.map(i => ({ label: i.name, value: i.id }))
              ]} 
              value={form.ingredientId}
              onValueChange={(val) => setForm({ ...form, ingredientId: val })}
            />
          </YStack>

          <YStack gap="$2">
            <FormLabel>Codice Lotto</FormLabel>
            <XStack gap="$2">
              <Input 
                flex={1}
                value={form.lotCode}
                onChangeText={(t) => setForm({ ...form, lotCode: t })}
                placeholder="Lascia vuoto per auto-generazione"
              />
              <Button size="$4" icon={<Ionicons name="refresh" size={18} />} onPress={generateLotCode} variant="outline" />
            </XStack>
          </YStack>

          <YStack gap="$2">
            <FormLabel>Fornitore</FormLabel>
            <Input 
              value={form.supplier}
              onChangeText={(t) => setForm({ ...form, supplier: t })}
              placeholder="es. Centrale del Latte"
            />
          </YStack>

          <XStack gap="$3">
            <YStack flex={1} gap="$2">
              <FormLabel required>Data Consegna</FormLabel>
              <Input 
                value={form.deliveryDate}
                onChangeText={(t) => setForm({ ...form, deliveryDate: t })}
                placeholder="YYYY-MM-DD"
              />
            </YStack>
            <YStack flex={1} gap="$2">
              <FormLabel>Data Scadenza</FormLabel>
              <Input 
                value={form.expiryDate}
                onChangeText={(t) => setForm({ ...form, expiryDate: t })}
                placeholder="YYYY-MM-DD"
              />
            </YStack>
          </XStack>

          <XStack gap="$3">
            <YStack flex={1} gap="$2">
              <FormLabel required>Quantità Iniziale</FormLabel>
              <XStack alignItems="center" gap="$2">
                <Input 
                  flex={1}
                  keyboardType="numeric"
                  value={form.initialQuantity}
                  onChangeText={(t) => setForm({ ...form, initialQuantity: t })}
                  placeholder="0.00"
                />
                <SizableText fontWeight="700">{selectedIngredient?.measurementUnit || '-'}</SizableText>
              </XStack>
            </YStack>
            <YStack flex={1} gap="$2">
              <FormLabel required>Conservazione</FormLabel>
              <BlinkSelect 
                items={CONSERVATION_TYPES}
                value={form.conservation}
                onValueChange={(val) => setForm({ ...form, conservation: val })}
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
              placeholder="Note aggiuntive sul lotto..."
              height={80}
              textAlignVertical="top"
            />
          </YStack>

          <Theme name="alt1">
            <YStack padding="$3" backgroundColor="$background" borderRadius="$4" borderWidth={1} borderColor="$color5" gap="$2">
              <XStack gap="$2" alignItems="center">
                <Ionicons name="information-circle-outline" size={16} color="#4A90D9" />
                <SizableText size="$2" color="$color10" fontWeight="600">Info Magazzino</SizableText>
              </XStack>
              <SizableText size="$2" color="$color11">
                La creazione di un nuovo lotto genera automaticamente un movimento di 'Carico' nel magazzino per la quantità specificata.
              </SizableText>
            </YStack>
          </Theme>

          <Button 
            size="$5" 
            theme="active" 
            marginTop="$4" 
            onPress={handleSave}
            disabled={createLot.isPending || !isValid}
            opacity={isValid ? 1 : 0.5}
            icon={createLot.isPending ? null : <Ionicons name="save-outline" size={20} color="white" />}
          >
            {createLot.isPending ? 'Salvataggio...' : 'Crea Lotto'}
          </Button>

          <YStack height={40} />
        </YStack>
      </ScrollView>
      <LoadingOverlay visible={createLot.isPending} />
    </SafeArea>
  );
}

const FormLabel = ({ children, required }: { children: string; required?: boolean }) => (
  <XStack gap="$1">
    <SizableText size="$3" color="$color11" fontWeight="600">{children}</SizableText>
    {required && <SizableText color="$red9">*</SizableText>}
  </XStack>
);
