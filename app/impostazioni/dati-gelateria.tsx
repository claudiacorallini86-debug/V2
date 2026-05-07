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
  useBlinkToast,
  Card,
  Spinner,
  Switch,
} from '@blinkdotnew/mobile-ui';
import { AppHeader } from '@/components/AppHeader';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Alert, View } from 'react-native';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/context/AuthContext';

import { LoadingOverlay } from '../../components/LoadingOverlay';

export default function DatiGelateriaScreen() {
  const router = useRouter();
  const { settings, isLoading, updateSettings } = useSettings();
  const { show } = useBlinkToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [form, setForm] = useState({
    store_name: '',
    store_address: '',
    store_vat: '',
    store_phone: '',
    store_email: '',
  });

  const [haccpAutoFill, setHaccpAutoFill] = useState(false);

  useEffect(() => {
    if (Object.keys(settings).length > 0) {
      setForm({
        store_name: settings.store_name || '',
        store_address: settings.store_address || '',
        store_vat: settings.store_vat || '',
        store_phone: settings.store_phone || '',
        store_email: settings.store_email || '',
      });
      setHaccpAutoFill(settings.haccp_auto_fill_enabled === '1');
    }
  }, [settings]);

  const handleSave = async () => {
    if (!form.store_name.trim()) {
      Alert.alert('Errore', 'Inserisci il nome della gelateria.');
      return;
    }

    try {
      await updateSettings.mutateAsync({
        ...form,
        haccp_auto_fill_enabled: haccpAutoFill ? '1' : '0',
      });
      show('Dati gelateria aggiornati correttamente.', { variant: 'success' });
      router.back();
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Si è verificato un errore durante il salvataggio.');
    }
  };

  return (
    <SafeArea>
      <AppHeader 
        title="Dati Gelateria" 
        variant="back" 
        onBack={() => router.back()}
        rightSlot={
          <Button 
            size="$3" 
            theme="active" 
            icon={updateSettings.isPending ? <Spinner color="white" /> : <Ionicons name="save-outline" size={18} color="white" />} 
            onPress={handleSave}
            disabled={updateSettings.isPending || isLoading}
          >
            Salva
          </Button>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack padding="$4" gap="$5" paddingBottom="$10">
          <YStack gap="$2">
            <SizableText size="$3" color="$color10" fontWeight="700" textTransform="uppercase" letterSpacing={1}>
              CONFIGURAZIONE GENERALE
            </SizableText>
            <SizableText size="$2" color="$color11">
              Queste informazioni appariranno negli export PDF (HACCP, Tracciabilità, ecc.).
            </SizableText>
          </YStack>

          <Card bordered padding="$4" backgroundColor="$color1" gap="$4">
            <YStack gap="$2">
              <Label size="$3">Nome Gelateria</Label>
              <Input 
                value={form.store_name} 
                onChangeText={(t) => setForm({ ...form, store_name: t })} 
                placeholder="es. Gelateria Amélie" 
              />
            </YStack>

            <YStack gap="$2">
              <Label size="$3">Indirizzo</Label>
              <Input 
                value={form.store_address} 
                onChangeText={(t) => setForm({ ...form, store_address: t })} 
                placeholder="es. Via Roma, 1, Milano" 
                multiline
                numberOfLines={2}
              />
            </YStack>

            <YStack gap="$2">
              <Label size="$3">Partita IVA</Label>
              <Input 
                value={form.store_vat} 
                onChangeText={(t) => setForm({ ...form, store_vat: t })} 
                placeholder="es. IT01234567890" 
              />
            </YStack>

            <XStack gap="$3">
              <YStack flex={1} gap="$2">
                <Label size="$3">Telefono</Label>
                <Input 
                  value={form.store_phone} 
                  onChangeText={(t) => setForm({ ...form, store_phone: t })} 
                  placeholder="es. +39 02 1234567" 
                  keyboardType="phone-pad"
                />
              </YStack>
              <YStack flex={1} gap="$2">
                <Label size="$3">Email</Label>
                <Input 
                  value={form.store_email} 
                  onChangeText={(t) => setForm({ ...form, store_email: t })} 
                  placeholder="es. info@gelateria.it" 
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </YStack>
            </XStack>
          </Card>

          {/* Sezione HACCP — solo admin */}
          {isAdmin && (
            <>
              <YStack gap="$2" marginTop="$2">
                <SizableText size="$3" color="$color10" fontWeight="700" textTransform="uppercase" letterSpacing={1}>
                  HACCP AVANZATO
                </SizableText>
                <SizableText size="$2" color="$color11">
                  Funzionalità riservate agli amministratori.
                </SizableText>
              </YStack>

              <Card bordered padding="$4" backgroundColor="$color1" gap="$4">
                <XStack justifyContent="space-between" alignItems="center">
                  <YStack flex={1} gap="$1" marginRight="$4">
                    <XStack gap="$2" alignItems="center">
                      <Ionicons name="calendar-outline" size={16} color="#4A90D9" />
                      <SizableText size="$3" fontWeight="700">Compila Giorni Mancanti</SizableText>
                    </XStack>
                    <SizableText size="$2" color="$color11">
                      Abilita il pulsante per la compilazione automatica delle temperature nei giorni senza registrazioni. Visibile solo agli admin.
                    </SizableText>
                  </YStack>
                  <Switch
                    checked={haccpAutoFill}
                    onCheckedChange={setHaccpAutoFill}
                  />
                </XStack>
              </Card>
            </>
          )}
        </YStack>
      </ScrollView>
      <LoadingOverlay visible={updateSettings.isPending} />
    </SafeArea>
  );
}
