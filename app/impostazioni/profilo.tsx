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
} from '@blinkdotnew/mobile-ui';
import { AppHeader } from '@/components/AppHeader';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Alert, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useUsers } from '@/hooks/useUsers';

import { LoadingOverlay } from '../../components/LoadingOverlay';

export default function ProfiloUtenteScreen() {
  const router = useRouter();
  const { user, signIn } = useAuth();
  const { updateUser } = useUsers();
  const { toast } = useBlinkToast();

  const [form, setForm] = useState({
    displayName: '',
    email: '',
  });

  useEffect(() => {
    if (user) {
      setForm({
        displayName: user.displayName || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!form.displayName.trim()) {
      Alert.alert('Errore', 'Inserisci un nome visualizzato.');
      return;
    }

    try {
      if (!user?.id) return;
      await updateUser.mutateAsync({
        id: user.id,
        displayName: form.displayName.trim(),
        email: form.email.trim().toLowerCase(),
      });
      
      // Update local auth context
      await signIn({
        ...user,
        displayName: form.displayName.trim(),
        email: form.email.trim().toLowerCase(),
      });

      toast('Successo', { message: 'Profilo aggiornato correttamente.', variant: 'success' });
      router.back();
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Si è verificato un errore durante il salvataggio.');
    }
  };

  return (
    <SafeArea>
      <AppHeader 
        title="Profilo Utente" 
        variant="back" 
        onBack={() => router.back()}
        rightSlot={
          <Button 
            size="$3" 
            theme="active" 
            icon={updateUser.isPending ? <Spinner color="white" /> : <Ionicons name="save-outline" size={18} color="white" />} 
            onPress={handleSave}
            disabled={updateUser.isPending}
          >
            Salva
          </Button>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack padding="$4" gap="$5" paddingBottom="$10">
          <YStack gap="$2" alignItems="center" paddingVertical="$6">
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#4A90D9', alignItems: 'center', justifyContent: 'center' }}>
              <SizableText size="$9" color="white" fontWeight="800">
                {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
              </SizableText>
            </View>
            <SizableText size="$5" fontWeight="800" marginTop="$2">{user?.displayName || 'Utente'}</SizableText>
            <SizableText size="$2" color="$color10">{user?.role === 'admin' ? '👑 Amministratore' : '👤 Staff'}</SizableText>
          </YStack>

          <Card bordered padding="$4" backgroundColor="$color1" gap="$4">
            <YStack gap="$2">
              <Label size="$3">Nome Visualizzato</Label>
              <Input 
                value={form.displayName} 
                onChangeText={(t) => setForm({ ...form, displayName: t })} 
                placeholder="es. Marco Rossi" 
              />
            </YStack>

            <YStack gap="$2">
              <Label size="$3">Email</Label>
              <Input 
                value={form.email} 
                onChangeText={(t) => setForm({ ...form, email: t })} 
                placeholder="es. marco@gelateria.it" 
                keyboardType="email-address"
                autoCapitalize="none"
                editable={false} // Prevent email change to keep auth stable
                opacity={0.6}
              />
              <SizableText size="$1" color="$color11">L'email può essere modificata solo da un amministratore.</SizableText>
            </YStack>
          </Card>
        </YStack>
      </ScrollView>
      <LoadingOverlay visible={updateUser.isPending} />
    </SafeArea>
  );
}
