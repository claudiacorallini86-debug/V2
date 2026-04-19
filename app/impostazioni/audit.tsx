import React, { useState, useMemo, useCallback } from 'react';
import {
  YStack,
  XStack,
  SizableText,
  Button,
  SafeArea,
  Card,
  Input,
  Spinner,
} from '@blinkdotnew/mobile-ui';
import { InlineSelect } from '@/components/common/InlineSelect';
import { AppHeader } from '@/components/AppHeader';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAudit } from '@/hooks/useAudit';
import { useAuth } from '@/context/AuthContext';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { Ionicons } from '@expo/vector-icons';
import { Alert, StyleSheet, Platform, View, FlatList } from 'react-native';
import { formatDate } from '@/lib/date';

const Badge = ({ children, theme }: any) => (
  <View style={{ 
    backgroundColor: theme === 'alt' ? '#4A90D922' : '#f59e0b22',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme === 'alt' ? '#4A90D944' : '#f59e0b44'
  }}>
    <SizableText size="$1" color={theme === 'alt' ? '#4A90D9' : '#f59e0b'} fontWeight="700">
      {children}
    </SizableText>
  </View>
);

export default function AuditLogScreen() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { logs, isLoading, isFetching, isError, error, refetch } = useAudit();
  
  const [filters, setForm] = useState({
    user: 'all',
    action: 'all',
    entity: 'all',
    search: '',
    startDate: '',
    endDate: '',
  });

  const isAdmin = currentUser?.role === 'admin';

  useFocusEffect(
    useCallback(() => {
      if (isAdmin) {
        refetch();
      }
    }, [isAdmin, refetch])
  );

  const userOptions = useMemo(() => {
    const users = Array.from(new Set(logs.map(l => l.userName))).filter(Boolean);
    return [
      { label: 'Tutti gli utenti', value: 'all' },
      ...users.map(u => ({ label: u!, value: u! }))
    ];
  }, [logs]);

  const entityOptions = useMemo(() => {
    const entities = Array.from(new Set(logs.map(l => l.entity))).filter(Boolean);
    return [
      { label: 'Tutte le entità', value: 'all' },
      ...entities.map(e => ({ label: e, value: e }))
    ];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesUser = filters.user === 'all' || log.userName === filters.user;
      const matchesEntity = filters.entity === 'all' || log.entity === filters.entity;
      const matchesSearch = !filters.search || 
        log.action.toLowerCase().includes(filters.search.toLowerCase()) ||
        (log.entityId || '').toLowerCase().includes(filters.search.toLowerCase());
      
      const parsedLogDate = new Date(log.createdAt);
      const logDate = Number.isNaN(parsedLogDate.getTime()) ? '' : parsedLogDate.toISOString().split('T')[0];
      const matchesStartDate = !filters.startDate || logDate >= filters.startDate;
      const matchesEndDate = !filters.endDate || logDate <= filters.endDate;
      
      return matchesUser && matchesEntity && matchesSearch && matchesStartDate && matchesEndDate;
    });
  }, [logs, filters]);

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

  const exportCSV = () => {
    if (filteredLogs.length === 0) {
      Alert.alert('Nessun dato', 'Non ci sono log da esportare.');
      return;
    }

    const headers = ['Data/Ora', 'Utente', 'Azione', 'Entità', 'ID Entità'];
    const rows = filteredLogs.map(l => [
      formatDate(l.createdAt, true),
      l.userName || 'Sistema',
      l.action,
      l.entity,
      l.entityId || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    if (Platform.OS === 'web') {
      const blob = new (window as any).Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `audit_log_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      Alert.alert('Successo', 'Audit log esportato correttamente.');
    } else {
      Alert.alert('Esportazione CSV', 'L\'esportazione CSV è disponibile nella versione Web.');
    }
  };

  return (
    <SafeArea>
      <YStack flex={1}>
        <LoadingOverlay visible={isFetching} message="Aggiornamento registro attività..." />
        <AppHeader 
          title="Registro Attività" 
          variant="back" 
          onBack={() => router.back()} 
          rightSlot={
            <Button size="$2" variant="outlined" icon={<Ionicons name="download-outline" size={14} color="#94a3b8" />} onPress={exportCSV}>
              Esporta
            </Button>
          }
        />

        <YStack padding="$4" gap="$4" backgroundColor="$background" borderBottomWidth={1} borderBottomColor="$color4">
        <Input 
          size="$3"
          placeholder="Cerca azione o ID..."
          value={filters.search}
          onChangeText={(t) => setForm({ ...filters, search: t })}
          backgroundColor="$color2"
        />
        
        <XStack gap="$2">
          <YStack flex={1}>
            <SizableText size="$1" color="$color10" marginBottom="$1">UTENTE</SizableText>
            <InlineSelect 
              items={userOptions}
              value={filters.user}
              onValueChange={(v) => setForm({ ...filters, user: v })}
            />
          </YStack>
          <YStack flex={1}>
            <SizableText size="$1" color="$color10" marginBottom="$1">ENTITÀ</SizableText>
            <InlineSelect 
              items={entityOptions}
              value={filters.entity}
              onValueChange={(v) => setForm({ ...filters, entity: v })}
            />
          </YStack>
        </XStack>

        <XStack gap="$2">
          <YStack flex={1}>
            <SizableText size="$1" color="$color10" marginBottom="$1">DAL (AAAA-MM-GG)</SizableText>
            <Input 
              size="$3"
              placeholder="2026-04-01"
              value={filters.startDate}
              onChangeText={(t) => setForm({ ...filters, startDate: t })}
              backgroundColor="$color2"
            />
          </YStack>
          <YStack flex={1}>
            <SizableText size="$1" color="$color10" marginBottom="$1">AL (AAAA-MM-GG)</SizableText>
            <Input 
              size="$3"
              placeholder="2026-04-15"
              value={filters.endDate}
              onChangeText={(t) => setForm({ ...filters, endDate: t })}
              backgroundColor="$color2"
            />
          </YStack>
        </XStack>
        </YStack>

        {isLoading ? (
          <YStack flex={1} alignItems="center" justifyContent="center">
            <Spinner />
          </YStack>
        ) : isError ? (
          <YStack flex={1} alignItems="center" justifyContent="center" padding="$4" gap="$3">
            <Ionicons name="alert-circle-outline" size={40} color="#ef4444" />
            <SizableText textAlign="center">
              {error instanceof Error ? error.message : 'Impossibile caricare il registro attività.'}
            </SizableText>
            <Button onPress={() => refetch()}>Riprova</Button>
          </YStack>
        ) : (
          <FlatList 
            data={filteredLogs}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Card bordered padding="$3" marginBottom="$2" backgroundColor="$color1">
                <YStack gap="$1">
                  <XStack justifyContent="space-between" alignItems="center">
                    <SizableText size="$1" color="$color10">{formatDate(item.createdAt, true)}</SizableText>
                    <Badge size="$1" theme="alt">{item.entity}</Badge>
                  </XStack>
                  <SizableText fontWeight="700" size="$3">{item.action}</SizableText>
                  <XStack gap="$2" alignItems="center" marginTop="$1">
                    <Ionicons name="person-outline" size={12} color="#94a3b8" />
                    <SizableText size="$2" color="$color11">{item.userName || 'Sistema'}</SizableText>
                  </XStack>
                  {item.entityId && (
                    <SizableText size="$1" color="$color10" marginTop="$1">ID: {item.entityId}</SizableText>
                  )}
                </YStack>
              </Card>
            )}
            ListEmptyComponent={
              <YStack padding="$10" alignItems="center">
                <SizableText color="$color10">Nessuna attività trovata.</SizableText>
              </YStack>
            }
          />
        )}
      </YStack>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    paddingBottom: 40,
  },
});