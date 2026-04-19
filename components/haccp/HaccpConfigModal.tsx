import React, { useState } from 'react';
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
  Card,
  Spinner,
} from '@blinkdotnew/mobile-ui';
import { useHaccp } from '@/hooks/useHaccp';
import { Modal, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function HaccpConfigModal({ isOpen, onClose }: Props) {
  const { equipment, createEquipment, isLoading } = useHaccp();
  const { show } = useBlinkToast();

  const [newEq, setNewEq] = useState({ name: '', min: '', max: '' });

  const handleAddEquipment = async () => {
    if (!newEq.name || newEq.min === '' || newEq.max === '') return;
    try {
      await createEquipment.mutateAsync({
        name: newEq.name,
        minTemp: parseFloat(newEq.min),
        maxTemp: parseFloat(newEq.max)
      });
      show('Attrezzatura aggiunta', { variant: 'success' });
      setNewEq({ name: '', min: '', max: '' });
    } catch (e) {
      show('Errore', { variant: 'error' });
    }
  };

  return (
    <Modal visible={isOpen} animationType="slide" onRequestClose={onClose}>
      <YStack flex={1} backgroundColor="$background">
        <XStack padding="$4" justifyContent="space-between" alignItems="center" borderBottomWidth={1} borderBottomColor="$color4">
          <XStack gap="$2" alignItems="center">
            <Ionicons name="settings-outline" size={20} color="#4A90D9" />
            <SizableText size="$5" fontWeight="800">Configurazione HACCP</SizableText>
          </XStack>
          <Button circular size="$3" chromeless icon={<Ionicons name="close" size={20} color="#94a3b8" />} onPress={onClose} />
        </XStack>

        <ScrollView showsVerticalScrollIndicator={false}>
          <YStack padding="$4" gap="$6">
            
            {/* Equipment Section */}
            <YStack gap="$4">
              <SizableText size="$4" fontWeight="700">Attrezzature e Soglie</SizableText>
              
              <Card bordered padding="$3" backgroundColor="$color2" gap="$3">
                <SizableText size="$2" fontWeight="600">Aggiungi Nuova</SizableText>
                <YStack gap="$2">
                  <Input 
                    value={newEq.name}
                    onChangeText={(t) => setNewEq({...newEq, name: t})}
                    placeholder="Nome (es. Frigo 3)"
                  />
                  <XStack gap="$2">
                    <Input 
                      flex={1}
                      keyboardType="numeric"
                      value={newEq.min}
                      onChangeText={(t) => setNewEq({...newEq, min: t})}
                      placeholder="Min °C"
                    />
                    <Input 
                      flex={1}
                      keyboardType="numeric"
                      value={newEq.max}
                      onChangeText={(t) => setNewEq({...newEq, max: t})}
                      placeholder="Max °C"
                    />
                  </XStack>
                  <Button 
                    theme="active" 
                    onPress={handleAddEquipment}
                    disabled={createEquipment.isPending}
                  >
                    Aggiungi
                  </Button>
                </YStack>
              </Card>

              <YStack gap="$2">
                {equipment.map(e => (
                  <XStack key={e.id} padding="$3" backgroundColor="$color1" borderRadius="$4" borderWidth={1} borderColor="$color4" justifyContent="space-between" alignItems="center">
                    <YStack>
                      <SizableText fontWeight="700">{e.name}</SizableText>
                      <SizableText size="$1" color="$color10">Range: {e.minTemp}°C / {e.maxTemp}°C</SizableText>
                    </YStack>
                  </XStack>
                ))}
              </YStack>
            </YStack>

            <Separator />

            {/* Note about cleaning tasks */}
            <YStack padding="$4" backgroundColor="$color3" borderRadius="$4">
              <SizableText size="$2" color="$color11" textAlign="center">
                I template delle pulizie sono pre-caricati. Contatta il supporto tecnico per modifiche strutturali ai template.
              </SizableText>
            </YStack>

          </YStack>
        </ScrollView>
      </YStack>
    </Modal>
  );
}
