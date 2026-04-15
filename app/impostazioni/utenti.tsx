import React, { useState } from 'react';
import {
  YStack,
  XStack,
  SizableText,
  Button,
  SafeArea,
  ScrollView,
  Card,
  Separator,
  Input,
  BlinkSelect,
  useBlinkToast,
  Spinner,
} from '@blinkdotnew/mobile-ui';
import { AppHeader } from '@/components/AppHeader';
import { useRouter } from 'expo-router';
import { useUsers, AppUser } from '@/hooks/useUsers';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Alert, StyleSheet, Platform, View, TouchableOpacity, FlatList, Modal } from 'react-native';
import { formatDate } from '@/lib/date';
import { LoadingOverlay } from '../../components/LoadingOverlay';

const Badge = ({ children, theme }: any) => (
  <View style={{ 
    backgroundColor: theme === 'success' ? '#10b98122' : theme === 'destructive' ? '#ef444422' : theme === 'active' ? '#4A90D922' : '#f59e0b22',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme === 'success' ? '#10b98144' : theme === 'destructive' ? '#ef444444' : theme === 'active' ? '#4A90D944' : '#f59e0b44'
  }}>
    <SizableText size="$1" color={theme === 'success' ? '#10b981' : theme === 'destructive' ? '#ef4444' : theme === 'active' ? '#4A90D9' : '#f59e0b'} fontWeight="700">
      {children}
    </SizableText>
  </View>
);

export default function UserManagementScreen() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { users, isLoading, createUser, updateUserRole, toggleUserStatus } = useUsers();
  const { toast } = useBlinkToast();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    displayName: '',
    email: '',
    password: '',
    role: 'staff',
  });

  const isAdmin = currentUser?.role === 'admin';

  if (!isAdmin) {
    return (
      <SafeArea>
        <AppHeader title="Accesso Negato" variant="back" onBack={() => router.back()} />
        <YStack flex={1} alignItems="center" justifyContent="center" padding="$4">
          <Ionicons name="lock-closed-outline" size={48} color="#ef4444" />
          <SizableText marginTop="$2" textAlign="center">Non hai i permessi per visualizzare questa pagina.</SizableText>
          <Button marginTop="$4" onPress={() => router.back()}>Torna indietro</Button>
        </YStack>
      </SafeArea>
    );
  }

  const handleCreateUser = async () => {
    if (!newUser.displayName || !newUser.email || !newUser.password) {
      Alert.alert('Errore', 'Compila tutti i campi obbligatori.');
      return;
    }

    try {
      await createUser.mutateAsync({
        displayName: newUser.displayName,
        email: newUser.email,
        role: newUser.role,
        passwordHash: newUser.password, // Simple for now, should be hashed properly in real app
      });
      
      toast('Utente creato', { variant: 'success' });
      setIsModalOpen(false);
      setNewUser({ displayName: '', email: '', password: '', role: 'staff' });
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Impossibile creare l\'utente.');
    }
  };

  const handleChangeRole = (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'staff' : 'admin';
    Alert.alert(
      'Cambio Ruolo',
      `Vuoi cambiare il ruolo a ${newRole.toUpperCase()}?`,
      [
        { text: 'Annulla', style: 'cancel' },
        { 
          text: 'Conferma', 
          onPress: () => updateUserRole.mutate({ id: userId, role: newRole }) 
        }
      ]
    );
  };

  const handleToggleStatus = (userId: string, currentStatus: boolean, name: string) => {
    const action = currentStatus ? 'Disattivare' : 'Riattivare';
    Alert.alert(
      `${action} Utente`,
      `Sei sicuro di voler ${action.toLowerCase()} l'utente ${name}? Questa azione è reversibile.`,
      [
        { text: 'Annulla', style: 'cancel' },
        { 
          text: 'Conferma', 
          onPress: () => toggleUserStatus.mutate({ id: userId, active: !currentStatus }) 
        }
      ]
    );
  };

  return (
    <SafeArea>
      <AppHeader 
        title="Gestione Utenti" 
        variant="back" 
        onBack={() => router.back()} 
        rightSlot={
          <Button size="$2" theme="active" icon={<Plus size={14} />} onPress={() => setIsModalOpen(true)}>
            Nuovo
          </Button>
        }
      />

      {isLoading ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner />
        </YStack>
      ) : (
        <FlatList 
          data={users}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card bordered padding="$3" marginBottom="$3" backgroundColor="$color1">
              <XStack justifyContent="space-between" alignItems="center">
                <YStack flex={1} gap="$1">
                  <XStack gap="$2" alignItems="center">
                    <SizableText fontWeight="800" size="$4">{item.displayName}</SizableText>
                    {item.active ? (
                      <Badge size="$1" theme="success">ATTIVO</Badge>
                    ) : (
                      <Badge size="$1" theme="destructive">DISATTIVO</Badge>
                    )}
                  </XStack>
                  <SizableText size="$2" color="$color10">{item.email}</SizableText>
                  <XStack gap="$2" marginTop="$1">
                    <Badge size="$1" theme={item.role === 'admin' ? 'active' : 'alt'}>
                      {item.role.toUpperCase()}
                    </Badge>
                  </XStack>
                </YStack>
                
                <XStack gap="$2">
                  <Button 
                    size="$2" 
                    variant="outline" 
                    icon={<Ionicons name="shield-outline" size={14} color="#94a3b8" />}
                    onPress={() => handleChangeRole(item.id, item.role)}
                    disabled={item.id === currentUser?.id}
                  >
                    Ruolo
                  </Button>
                  <Button 
                    size="$2" 
                    variant="outline"
                    theme={item.active ? 'destructive' : 'active'}
                    icon={<Ionicons name={item.active ? "pause-outline" : "play-outline"} size={14} color={item.active ? "#ef4444" : "#10b981"} />}
                    onPress={() => handleToggleStatus(item.id, item.active, item.displayName)}
                    disabled={item.id === currentUser?.id}
                  >
                    {item.active ? 'Sospendi' : 'Attiva'}
                  </Button>
                </XStack>
              </XStack>
            </Card>
          )}
        />
      )}

      {/* New User Modal */}
      <Modal visible={isModalOpen} animationType="slide" onRequestClose={() => setIsModalOpen(false)}>
        <SafeArea style={{ flex: 1, backgroundColor: '#0d1117' }}>
          <AppHeader title="Nuovo Utente" variant="back" onBack={() => setIsModalOpen(false)} />
          <ScrollView padding="$4">
            <YStack gap="$4">
              <YStack gap="$2">
                <SizableText size="$2" color="$color11" fontWeight="600">Nome Completo</SizableText>
                <Input 
                  value={newUser.displayName}
                  onChangeText={(t) => setNewUser({ ...newUser, displayName: t })}
                  placeholder="es. Mario Rossi"
                />
              </YStack>
              
              <YStack gap="$2">
                <SizableText size="$2" color="$color11" fontWeight="600">Email</SizableText>
                <Input 
                  value={newUser.email}
                  onChangeText={(t) => setNewUser({ ...newUser, email: t })}
                  placeholder="mario@gelateriaamelie.it"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </YStack>

              <YStack gap="$2">
                <SizableText size="$2" color="$color11" fontWeight="600">Password Temporanea</SizableText>
                <Input 
                  value={newUser.password}
                  onChangeText={(t) => setNewUser({ ...newUser, password: t })}
                  placeholder="Inserisci password..."
                  secureTextEntry
                />
              </YStack>

              <YStack gap="$2">
                <SizableText size="$2" color="$color11" fontWeight="600">Ruolo</SizableText>
                <BlinkSelect 
                  items={[
                    { label: 'Staff (Accesso base)', value: 'staff' },
                    { label: 'Admin (Accesso completo)', value: 'admin' },
                  ]}
                  value={newUser.role}
                  onValueChange={(v) => setNewUser({ ...newUser, role: v })}
                />
              </YStack>

              <Separator marginTop="$4" />

              <Button 
                theme="active" 
                size="$5" 
                marginTop="$2"
                onPress={handleCreateUser}
                disabled={createUser.isPending}
                icon={createUser.isPending ? <Spinner color="white" /> : <Save size={18} color="white" />}
              >
                Crea Utente
              </Button>
              
              <Button 
                variant="outline" 
                size="$5"
                onPress={() => setIsModalOpen(false)}
              >
                Annulla
              </Button>
            </YStack>
          </ScrollView>
        </SafeArea>
      </Modal>
      <LoadingOverlay visible={createUser.isPending || updateUserRole.isPending || toggleUserStatus.isPending} />
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    paddingBottom: 40,
  },
});