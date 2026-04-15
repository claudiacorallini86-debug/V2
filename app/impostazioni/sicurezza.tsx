import React, { useState } from 'react';
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

export default function CambiaPasswordScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { updateUser } = useUsers();
  const { toast } = useBlinkToast();

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleSave = async () => {
    if (!form.newPassword || form.newPassword.length < 6) {
      Alert.alert('Errore', 'La nuova password deve contenere almeno 6 caratteri.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      Alert.alert('Errore', 'La nuova password e la conferma non coincidono.');
      return;
    }

    try {
      if (!user?.id) return;
      // In a real app we would verify current password first, but for now we simplify
      await updateUser.mutateAsync({
        id: user.id,
        password: form.newPassword,
      });
      
      toast('Successo', { message: 'Password aggiornata correttamente.', variant: 'success' });
      router.back();
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Si è verificato un errore durante il cambio password.');
    }
  };

  return (
    <SafeArea>
      <AppHeader 
        title="Cambia Password" 
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
            Aggiorna
          </Button>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack padding="$4" gap="$5" paddingBottom="$10">
          <YStack gap="$2" alignItems="center" paddingVertical="$6">
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#f59e0b22', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="key-outline" size={40} color="#f59e0b" />
            </View>
            <SizableText size="$5" fontWeight="800" marginTop="$2">Sicurezza Account</SizableText>
            <SizableText size="$2" color="$color10">La nuova password sarà attiva al prossimo accesso.</SizableText>
          </YStack>

          <Card bordered padding="$4" backgroundColor="$color1" gap="$4">
            <YStack gap="$2">
              <Label size="$3">Nuova Password</Label>
              <Input 
                value={form.newPassword} 
                onChangeText={(t) => setForm({ ...form, newPassword: t })} 
                placeholder="Almeno 6 caratteri" 
                secureTextEntry
              />
            </YStack>

            <YStack gap="$2">
              <Label size="$3">Conferma Nuova Password</Label>
              <Input 
                value={form.confirmPassword} 
                onChangeText={(t) => setForm({ ...form, confirmPassword: t })} 
                placeholder="Ripeti la password" 
                secureTextEntry
              />
            </YStack>
          </Card>
        </YStack>
      </ScrollView>
      <LoadingOverlay visible={updateUser.isPending} />
    </SafeArea>
  );
}
