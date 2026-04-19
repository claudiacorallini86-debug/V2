import React, { useState, useEffect, useMemo } from 'react';
import {
  YStack,
  XStack,
  SizableText,
  Button,
  Input,
  Label,
  useBlinkToast,
  Separator,
  Theme,
} from '@blinkdotnew/mobile-ui';
import { InlineSelect } from '@/components/common/InlineSelect';
import { useIngredients } from '@/hooks/useIngredients';
import { Modal, Platform, StyleSheet, TouchableOpacity, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LoadingOverlay } from '@/components/LoadingOverlay';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  type: 'in' | 'out';
  initialIngredientId?: string;
}

export function MovementModal({ isOpen, onClose, type, initialIngredientId }: Props) {
  const { ingredients, lots, createMovement, lotStockMap } = useIngredients();
  const toastContext = useBlinkToast();
  
  const showToast = (title: string, options: any) => {
    if (!toastContext) return;
    const toastFn = typeof toastContext === 'function' ? toastContext : (toastContext.show || toastContext.show);
    if (typeof toastFn === 'function') {
      toastFn(title, options);
    }
  };

  const [form, setForm] = useState({
    ingredientId: '',
    lotId: '',
    quantity: '',
    referral: '',
    note: '',
  });

  useEffect(() => {
    if (isOpen) {
      setForm({
        ingredientId: initialIngredientId || '',
        lotId: '',
        quantity: '',
        referral: '',
        note: '',
      });
    }
  }, [isOpen, initialIngredientId]);

  const selectedIngredient = ingredients.find(i => i.id === form.ingredientId);
  
  const availableLots = useMemo(() => {
    if (!form.ingredientId) return [];
    return lots.filter(l => {
      const ingId = l.ingredientId || l.ingredient_id;
      if (ingId !== form.ingredientId) return false;
      if (type === 'out') {
        return l.status === 'active' || l.status === 'expired' || l.status === 'exhausted';
      }
      return true;
    });
  }, [lots, form.ingredientId, type]);

  const selectedLotStock = form.lotId ? (lotStockMap[form.lotId] ?? 0) : 0;

  const handleSave = async () => {
    if (!form.ingredientId) {
      showToast('Errore', { message: 'Seleziona un ingrediente.', variant: 'error' });
      return;
    }
    if (!form.quantity || isNaN(parseFloat(form.quantity))) {
      showToast('Errore', { message: 'Inserisci una quantità valida.', variant: 'error' });
      return;
    }

    const qty = parseFloat(form.quantity);
    if (type === 'out' && form.lotId && qty > selectedLotStock) {
      showToast('Attenzione', { message: 'La quantità supera la giacenza del lotto.', variant: 'warning' });
    }

    try {
      await createMovement.mutateAsync({
        ingredientId: form.ingredientId,
        lotId: form.lotId || undefined,
        type,
        quantity: qty,
        unit: selectedIngredient?.measurementUnit || 'kg',
        referral: form.referral.trim(),
        note: form.note.trim(),
      });

      showToast('Successo', { message: 'Movimento registrato correttamente.', variant: 'success' });
      onClose();
    } catch (error: any) {
      showToast('Errore', { message: error.message || 'Errore durante il salvataggio.', variant: 'error' });
    }
  };

  const lotItems = useMemo(() => {
    const base = [{ label: 'Seleziona lotto...', value: '' }];
    const items = availableLots.map(l => ({ 
      label: `${l.lotCode || l.lot_code} (Giac: ${lotStockMap[l.id] ?? 0} ${selectedIngredient?.measurementUnit || ''})`, 
      value: l.id 
    }));
    return [...base, ...items];
  }, [availableLots, lotStockMap, selectedIngredient]);

  return (
    <Modal transparent visible={isOpen} animationType="slide" onRequestClose={onClose}>
      <YStack flex={1} backgroundColor="rgba(0,0,0,0.5)" justifyContent="flex-end">
        <Theme name={type === 'in' ? 'alt1' : 'alt2'}>
          <YStack 
            backgroundColor="$background" 
            borderTopLeftRadius="$6" 
            borderTopRightRadius="$6" 
            padding="$4" 
            gap="$4"
            height="80%"
          >
            <XStack justifyContent="space-between" alignItems="center">
              <XStack gap="$2" alignItems="center">
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: type === 'in' ? '#dcfce7' : '#fee2e2', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons 
                    name={type === 'in' ? "arrow-up-circle" : "arrow-down-circle"} 
                    size={20} 
                    color={type === 'in' ? "#166534" : "#991b1b"} 
                  />
                </View>
                <SizableText size="$6" fontWeight="800">
                  {type === 'in' ? 'Carico Magazzino' : 'Scarico Magazzino'}
                </SizableText>
              </XStack>
              <Button circular size="$3" chromeless icon={<Ionicons name="close" size={20} color="#94a3b8" />} onPress={onClose} />
            </XStack>

            <Separator />

            <ScrollView showsVerticalScrollIndicator={false}>
              <YStack gap="$4" paddingBottom="$8">
                <YStack gap="$2">
                  <Label size="$3" fontWeight="600">Ingrediente</Label>
                  <InlineSelect 
                    items={[
                      { label: 'Seleziona ingrediente...', value: '' },
                      ...ingredients.map(i => ({ label: i.name, value: i.id }))
                    ]} 
                    value={form.ingredientId}
                    onValueChange={(val) => setForm({ ...form, ingredientId: val, lotId: '' })}
                  />
                </YStack>

                <YStack gap="$2">
                  <Label size="$3" fontWeight="600">Lotto Specifico (Opzionale)</Label>
                  {form.ingredientId && availableLots.length === 0 ? (
                    <YStack backgroundColor="$red2" padding="$2" borderRadius="$3" borderWidth={1} borderColor="$red4">
                      <SizableText size="$1" color="$red10">
                        Nessun lotto trovato per questo ingrediente.
                      </SizableText>
                    </YStack>
                  ) : (
                    <InlineSelect 
                      items={lotItems} 
                      value={form.lotId}
                      onValueChange={(val) => setForm({ ...form, lotId: val })}
                    />
                  )}
                  {form.lotId && (
                    <SizableText size="$1" color="$color10" marginLeft="$1">
                      Giacenza attuale lotto: {selectedLotStock} {selectedIngredient?.measurementUnit}
                    </SizableText>
                  )}
                </YStack>

                <YStack gap="$2">
                  <Label size="$3" fontWeight="600">Quantità</Label>
                  <XStack gap="$3" alignItems="center">
                    <Input 
                      flex={1}
                      keyboardType="numeric"
                      value={form.quantity}
                      onChangeText={(t) => setForm({ ...form, quantity: t })}
                      placeholder="0.00"
                    />
                    <SizableText fontWeight="700" size="$4">
                      {selectedIngredient?.measurementUnit || '-'}
                    </SizableText>
                  </XStack>
                </YStack>

                <YStack gap="$2">
                  <Label size="$3" fontWeight="600">Riferimento</Label>
                  <Input 
                    value={form.referral}
                    onChangeText={(t) => setForm({ ...form, referral: t })}
                    placeholder="es. DDT n. 45, Ordine #123"
                  />
                </YStack>

                <YStack gap="$2">
                  <Label size="$3" fontWeight="600">Note</Label>
                  <Input 
                    multiline
                    numberOfLines={3}
                    value={form.note}
                    onChangeText={(t) => setForm({ ...form, note: t })}
                    placeholder="Eventuali annotazioni..."
                    height={80}
                    textAlignVertical="top"
                  />
                </YStack>

                <Button 
                  size="$5" 
                  theme="active" 
                  marginTop="$4" 
                  onPress={handleSave}
                  disabled={createMovement.isPending}
                  icon={createMovement.isPending ? null : <Ionicons name="save-outline" size={20} color="white" />}
                >
                  {createMovement.isPending ? 'Salvataggio...' : 'Registra Movimento'}
                </Button>
              </YStack>
            </ScrollView>
          </YStack>
        </Theme>
      </YStack>
      <LoadingOverlay visible={createMovement.isPending} />
    </Modal>
  );
}
