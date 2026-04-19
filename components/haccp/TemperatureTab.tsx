import React, { useState, useMemo } from 'react';
import {
  YStack,
  XStack,
  SizableText,
  Button,
  Card,
  Separator,
  Input,
  useBlinkToast,
  Badge,
  Spinner,
} from '@blinkdotnew/mobile-ui';
import { InlineSelect } from '@/components/common/InlineSelect';
import { useHaccp, TemperatureLog } from '@/hooks/useHaccp';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, Alert, Platform, View, TouchableOpacity } from 'react-native';
import { formatDate } from '@/lib/date';
import { useAuth } from '@/context/AuthContext';
import { LoadingOverlay } from '@/components/LoadingOverlay';

export function TemperatureTab() {
  const { equipment, temperatureLogs, addTemperatureLog, fillMissingDays, createEquipment, deleteEquipment, isLoading } = useHaccp();
  const { show } = useBlinkToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const showAlert = (title: string, message?: string) => {
    if (Platform.OS === 'web') {
      window.alert(message ? `${title}\n${message}` : title);
    } else {
      Alert.alert(title, message);
    }
  };

  // Form rilevazione
  const [form, setForm] = useState({ equipmentId: '', temperature: '', note: '' });

  // Storico
  const [search, setSearch] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // Gestione attrezzature
  const [showEquipmentMgmt, setShowEquipmentMgmt] = useState(false);
  const [newEq, setNewEq] = useState({ name: '', min: '', max: '' });

  // Stato dialog "Compila giorni mancanti"
  const [fillPreview, setFillPreview] = useState<{ missingCount: number; refLog: TemperatureLog } | null>(null);
  const [isFillLoading, setIsFillLoading] = useState(false);

  const selectedEquipment = useMemo(
    () => equipment.find(e => e.id === form.equipmentId),
    [equipment, form.equipmentId]
  );

  const dailyLogs = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return temperatureLogs.filter(l => l.recordedAt.startsWith(today));
  }, [temperatureLogs]);

  const outOfRangeLogs = useMemo(() => dailyLogs.filter(l => l.outOfRange), [dailyLogs]);

  const filteredHistory = useMemo(
    () =>
      temperatureLogs.filter(
        l =>
          l.equipmentName.toLowerCase().includes(search.toLowerCase()) ||
          (l.note || '').toLowerCase().includes(search.toLowerCase())
      ),
    [temperatureLogs, search]
  );

  // Trova l'ultimo record manuale (non auto-compilato)
  const lastManualLog = useMemo(() => {
    return temperatureLogs.find(l => !l.autoFilled) ?? null;
  }, [temperatureLogs]);

  // Calcola quanti giorni mancano tra l'ultimo manuale e ieri
  const computeMissingDays = (refLog: TemperatureLog): string[] => {
    const existingDates = new Set(
      temperatureLogs.map(l => l.recordedAt.substring(0, 10))
    );
    const refDate = new Date(refLog.recordedAt);
    refDate.setHours(0, 0, 0, 0);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);

    const missing: string[] = [];
    const cursor = new Date(refDate);
    cursor.setDate(cursor.getDate() + 1);
    while (cursor <= yesterday) {
      const ds = cursor.toISOString().substring(0, 10);
      if (!existingDates.has(ds)) missing.push(ds);
      cursor.setDate(cursor.getDate() + 1);
    }
    return missing;
  };

  const handlePreviewFill = () => {
    if (!lastManualLog) {
      showAlert('Nessun record di riferimento', 'Inserisci almeno una rilevazione manuale per poter compilare i giorni mancanti.');
      return;
    }
    const missing = computeMissingDays(lastManualLog);
    if (missing.length === 0) {
      show('Nessun giorno mancante da compilare.', { variant: 'success' });
      return;
    }
    setFillPreview({ missingCount: missing.length, refLog: lastManualLog });
  };

  const handleConfirmFill = async () => {
    if (!fillPreview) return;
    setIsFillLoading(true);
    try {
      const filled = await fillMissingDays.mutateAsync(fillPreview.refLog);
      const count = Array.isArray(filled) ? filled.length : fillPreview.missingCount;
      show(`${count} giorni compilati automaticamente.`, { variant: 'success' });
    } catch (e: any) {
      show(`Errore: ${e.message}`, { variant: 'error' });
    } finally {
      setIsFillLoading(false);
      setFillPreview(null);
    }
  };

  const handleAddLog = async () => {
    if (!form.equipmentId || !form.temperature) {
      showAlert('Errore', 'Seleziona un\'attrezzatura e inserisci la temperatura.');
      return;
    }
    const temp = parseFloat(form.temperature.replace(',', '.'));
    if (isNaN(temp)) {
      showAlert('Errore', 'Inserisci una temperatura valida.');
      return;
    }
    const outOfRange = selectedEquipment
      ? temp < selectedEquipment.minTemp || temp > selectedEquipment.maxTemp
      : false;
    try {
      await addTemperatureLog.mutateAsync({
        equipmentName: selectedEquipment?.name || 'Sconosciuta',
        temperature: temp,
        outOfRange,
        note: form.note.trim() || undefined,
      });
      if (outOfRange) {
        showAlert(
          '⚠️ ATTENZIONE',
          `Temperatura FUORI RANGE per ${selectedEquipment?.name}!\nRange previsto: ${selectedEquipment?.minTemp}°C / ${selectedEquipment?.maxTemp}°C`
        );
      }
      show('Rilevazione salvata', { variant: 'success' });
      setForm({ equipmentId: '', temperature: '', note: '' });
    } catch (error: any) {
      showAlert('Errore', error.message || 'Errore durante il salvataggio.');
    }
  };

  const handleAddEquipment = async () => {
    if (!newEq.name.trim() || newEq.min === '' || newEq.max === '') {
      show('Errore: Compila nome, temperatura minima e massima.', { variant: 'error' });
      return;
    }
    const min = parseFloat(newEq.min.replace(',', '.'));
    const max = parseFloat(newEq.max.replace(',', '.'));
    if (isNaN(min) || isNaN(max) || min >= max) {
      show('Errore: Soglie non valide. Min deve essere inferiore a Max.', { variant: 'error' });
      return;
    }
    try {
      await createEquipment.mutateAsync({ name: newEq.name.trim(), minTemp: min, maxTemp: max });
      show('Attrezzatura aggiunta', { variant: 'success' });
      setNewEq({ name: '', min: '', max: '' });
    } catch (e: any) {
      show(`Errore: ${e.message} Impossibile aggiungere l'attrezzatura.'}`, { variant: 'error' });
    }
  };

  const handleDeleteEquipment = (id: string, name: string) => {
    const doDelete = async () => {
      try {
        await deleteEquipment.mutateAsync(id);
        show('Attrezzatura eliminata', { variant: 'success' });
      } catch (e: any) {
        show(`Errore: ${e.message} Impossibile eliminare l'attrezzatura.`, { variant: 'error' });
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Sei sicuro di voler eliminare ${name}? Questa azione è irreversibile.`)) {
        doDelete();
      }
    } else {
      Alert.alert(
        'Conferma eliminazione',
        `Sei sicuro di voler eliminare ${name}? Questa azione è irreversibile.`,
        [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Elimina', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  if (isLoading) return <XStack padding="$10" justifyContent="center"><Spinner /></XStack>;

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <LoadingOverlay
        visible={addTemperatureLog.isPending || createEquipment.isPending || deleteEquipment.isPending || isFillLoading}
        message="Operazione in corso..."
      />

      {/* Dialog conferma compilazione giorni mancanti */}
      {fillPreview && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          zIndex: 999,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}>
          <View style={{
            backgroundColor: '#1a2234',
            borderRadius: 16,
            padding: 24,
            width: '100%',
            maxWidth: 420,
            borderWidth: 1,
            borderColor: '#2d3a50',
          }}>
            <XStack gap="$2" alignItems="center" marginBottom="$3">
              <Ionicons name="calendar-outline" size={22} color="#4A90D9" />
              <SizableText size="$5" fontWeight="800" color="$color12">
                Compila Giorni Mancanti
              </SizableText>
            </XStack>

            <YStack gap="$2" marginBottom="$4">
              <SizableText size="$3" color="$color11">
                Verranno creati automaticamente{' '}
                <SizableText size="$3" fontWeight="800" color="$color12">
                  {fillPreview.missingCount} {fillPreview.missingCount === 1 ? 'giorno' : 'giorni'}
                </SizableText>{' '}
                con i seguenti valori di riferimento:
              </SizableText>

              <View style={{
                backgroundColor: '#0f1823',
                borderRadius: 10,
                padding: 12,
                marginTop: 8,
                borderWidth: 1,
                borderColor: '#2d3a50',
                gap: 4,
              }}>
                <XStack gap="$2" alignItems="center">
                  <Ionicons name="hardware-chip-outline" size={14} color="#94a3b8" />
                  <SizableText size="$2" color="$color11">
                    Attrezzatura:{' '}
                    <SizableText size="$2" fontWeight="700" color="$color12">
                      {fillPreview.refLog.equipmentName}
                    </SizableText>
                  </SizableText>
                </XStack>
                <XStack gap="$2" alignItems="center">
                  <Ionicons name="thermometer-outline" size={14} color="#94a3b8" />
                  <SizableText size="$2" color="$color11">
                    Temperatura:{' '}
                    <SizableText size="$2" fontWeight="700" color="$color12">
                      {fillPreview.refLog.temperature.toFixed(1)}°C
                    </SizableText>
                  </SizableText>
                </XStack>
                {fillPreview.refLog.note && (
                  <XStack gap="$2" alignItems="center">
                    <Ionicons name="chatbubble-outline" size={14} color="#94a3b8" />
                    <SizableText size="$2" color="$color11" fontStyle="italic">
                      Nota: {fillPreview.refLog.note}
                    </SizableText>
                  </XStack>
                )}
              </View>

              <SizableText size="$1" color="$color10" marginTop="$1">
                I record auto-compilati saranno marcati con un'etichetta speciale e non sovrascriveranno dati esistenti.
              </SizableText>
            </YStack>

            <XStack gap="$3">
              <Button
                flex={1}
                variant="outlined"
                onPress={() => setFillPreview(null)}
                disabled={isFillLoading}
              >
                Annulla
              </Button>
              <Button
                flex={1}
                theme="active"
                onPress={handleConfirmFill}
                disabled={isFillLoading}
                icon={isFillLoading ? <Spinner color="white" size="small" /> : <Ionicons name="checkmark-circle-outline" size={18} color="white" />}
              >
                Conferma
              </Button>
            </XStack>
          </View>
        </View>
      )}

      <YStack padding="$4" gap="$4" paddingBottom="$10">

        {/* Banner fuori range */}
        {outOfRangeLogs.length > 0 && (
          <YStack
            padding="$3"
            backgroundColor="$red2"
            borderRadius="$4"
            borderWidth={2}
            borderColor="$red8"
            gap="$2"
          >
            <XStack gap="$2" alignItems="center">
              <Ionicons name="alert-circle" size={20} color="#ef4444" />
              <SizableText size="$3" fontWeight="800" color="$red10">
                ATTENZIONE: Temperatura fuori range!
              </SizableText>
            </XStack>
            <YStack gap="$1">
              {outOfRangeLogs.map(log => (
                <SizableText key={log.id} size="$2" color="$red11">
                  • {log.equipmentName}: {log.temperature}°C alle{' '}
                  {new Date(log.recordedAt).toLocaleTimeString('it-IT', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </SizableText>
              ))}
            </YStack>
          </YStack>
        )}

        {/* Pulsante Compila Giorni Mancanti */}
        <TouchableOpacity
          onPress={handlePreviewFill}
          activeOpacity={0.8}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: '#1a2a3f',
            borderWidth: 1.5,
            borderColor: '#4A90D9',
            borderRadius: 12,
            paddingVertical: 12,
            paddingHorizontal: 16,
          }}
        >
          <Ionicons name="calendar-outline" size={18} color="#4A90D9" />
          <SizableText size="$3" fontWeight="700" color="#4A90D9">
            Compila Giorni Mancanti
          </SizableText>
          {lastManualLog && (
            <View style={{
              backgroundColor: '#0f1823',
              borderRadius: 20,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderWidth: 1,
              borderColor: '#2d3a50',
            }}>
              <SizableText size="$1" color="$color10">
                dal {lastManualLog.recordedAt.substring(0, 10)}
              </SizableText>
            </View>
          )}
        </TouchableOpacity>

        {/* Form nuova rilevazione */}
        <Card bordered padding="$4" backgroundColor="$color1" gap="$4">
          <XStack gap="$2" alignItems="center">
            <Ionicons name="thermometer-outline" size={20} color="#4A90D9" />
            <SizableText size="$4" fontWeight="800">Nuova Rilevazione</SizableText>
          </XStack>

          <YStack gap="$2">
            <SizableText size="$2" color="$color11" fontWeight="600">Attrezzatura *</SizableText>
            <InlineSelect
              items={equipment.map(e => ({ label: e.name, value: e.id }))}
              value={form.equipmentId}
              onValueChange={val => setForm({ ...form, equipmentId: val })}
              placeholder="Seleziona attrezzatura..."
            />
            {selectedEquipment && (
              <XStack gap="$2" marginTop="$1">
                <Badge variant="info">Min: {selectedEquipment.minTemp}°C</Badge>
                <Badge variant="info">Max: {selectedEquipment.maxTemp}°C</Badge>
              </XStack>
            )}
          </YStack>

          <XStack gap="$3">
            <YStack flex={1} gap="$2">
              <SizableText size="$2" color="$color11" fontWeight="600">Temperatura (°C) *</SizableText>
              <Input
                keyboardType="numeric"
                value={form.temperature}
                onChangeText={t => setForm({ ...form, temperature: t })}
                placeholder="es. 3.5"
              />
            </YStack>
            <YStack flex={2} gap="$2">
              <SizableText size="$2" color="$color11" fontWeight="600">Note (opzionali)</SizableText>
              <Input
                value={form.note}
                onChangeText={t => setForm({ ...form, note: t })}
                placeholder="es. Dopo sbrinamento"
              />
            </YStack>
          </XStack>

          <Button
            theme="active"
            onPress={handleAddLog}
            disabled={addTemperatureLog.isPending || !form.equipmentId || !form.temperature}
            opacity={!form.equipmentId || !form.temperature ? 0.6 : 1}
            icon={
              addTemperatureLog.isPending ? (
                <Spinner color="white" />
              ) : (
                <Ionicons name="add" size={18} color="white" />
              )
            }
          >
            Registra Temperatura
          </Button>
        </Card>

        {/* Rilevazioni di oggi */}
        <YStack gap="$2">
          <XStack justifyContent="space-between" alignItems="center">
            <SizableText size="$4" fontWeight="800">Rilevazioni di Oggi</SizableText>
            <Badge variant="info">{dailyLogs.length}</Badge>
          </XStack>

          {dailyLogs.length === 0 ? (
            <Card bordered padding="$4" alignItems="center" backgroundColor="$color2">
              <SizableText color="$color10">Nessuna rilevazione per oggi</SizableText>
            </Card>
          ) : (
            dailyLogs.map(log => <TemperatureLogCard key={log.id} log={log} />)
          )}
        </YStack>

        <Separator />

        {/* Gestione attrezzature */}
        <TouchableOpacity
          onPress={() => setShowEquipmentMgmt(!showEquipmentMgmt)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <XStack gap="$2" alignItems="center">
            <Ionicons name="settings-outline" size={18} color="#4A90D9" />
            <SizableText size="$3" fontWeight="700" color="$active">
              Gestione Attrezzature
            </SizableText>
          </XStack>
          <Ionicons
            name={showEquipmentMgmt ? 'chevron-up' : 'chevron-down'}
            size={18}
            color="#94a3b8"
          />
        </TouchableOpacity>

        {showEquipmentMgmt && (
          <YStack gap="$3">
            {/* Elenco attrezzature */}
            <YStack gap="$2">
              {equipment.map(e => (
                <XStack
                  key={e.id}
                  padding="$3"
                  backgroundColor="$color1"
                  borderRadius="$4"
                  borderWidth={1}
                  borderColor="$color4"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <YStack>
                    <SizableText fontWeight="700">{e.name}</SizableText>
                    <SizableText size="$1" color="$color10">
                      Range: {e.minTemp}°C — {e.maxTemp}°C
                    </SizableText>
                  </YStack>
                  <TouchableOpacity
                    onPress={() => handleDeleteEquipment(e.id, e.name)}
                    style={{ padding: 6 }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </XStack>
              ))}
              {equipment.length === 0 && (
                <SizableText color="$color10" textAlign="center">Nessuna attrezzatura configurata</SizableText>
              )}
            </YStack>

            {/* Form aggiungi */}
            <Card bordered padding="$4" backgroundColor="$color2" gap="$3">
              <SizableText size="$3" fontWeight="700">Aggiungi Attrezzatura</SizableText>
              <Input
                value={newEq.name}
                onChangeText={t => setNewEq({ ...newEq, name: t })}
                placeholder="Nome (es. Frigo 3, Abbattitore 2)"
              />
              <XStack gap="$2">
                <Input
                  flex={1}
                  keyboardType="numeric"
                  value={newEq.min}
                  onChangeText={t => setNewEq({ ...newEq, min: t })}
                  placeholder="Min °C"
                />
                <Input
                  flex={1}
                  keyboardType="numeric"
                  value={newEq.max}
                  onChangeText={t => setNewEq({ ...newEq, max: t })}
                  placeholder="Max °C"
                />
              </XStack>
              <Button
                theme="active"
                onPress={handleAddEquipment}
                disabled={createEquipment.isPending}
                icon={
                  createEquipment.isPending ? (
                    <Spinner color="white" />
                  ) : (
                    <Ionicons name="add-circle-outline" size={18} color="white" />
                  )
                }
              >
                Aggiungi
              </Button>
            </Card>
          </YStack>
        )}

        <Separator />

        {/* Storico */}
        <TouchableOpacity
          onPress={() => setShowHistory(!showHistory)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <XStack gap="$2" alignItems="center">
            <Ionicons name="time-outline" size={18} color="#94a3b8" />
            <SizableText size="$3" fontWeight="600" color="$color11">
              {showHistory ? 'Nascondi Storico' : 'Visualizza Storico Completo'}
            </SizableText>
          </XStack>
          <Ionicons name={showHistory ? 'chevron-up' : 'chevron-down'} size={18} color="#94a3b8" />
        </TouchableOpacity>

        {showHistory && (
          <YStack gap="$3">
            <Input
              value={search}
              onChangeText={t => setSearch(t)}
              placeholder="Filtra per attrezzatura o note..."
              backgroundColor="$color1"
            />
            {filteredHistory.slice(0, 50).map(log => (
              <TemperatureLogCard key={log.id} log={log} />
            ))}
            {filteredHistory.length === 0 && (
              <Card bordered padding="$4" alignItems="center" backgroundColor="$color2">
                <SizableText color="$color10">Nessuna rilevazione trovata</SizableText>
              </Card>
            )}
          </YStack>
        )}
      </YStack>
    </ScrollView>
  );
}

function TemperatureLogCard({ log }: { log: TemperatureLog }) {
  return (
    <Card
      bordered
      padding="$3"
      backgroundColor="$color1"
      borderColor={log.outOfRange ? '$red6' : log.autoFilled ? '$yellow6' : '$color4'}
    >
      <XStack justifyContent="space-between" alignItems="center">
        <YStack gap="$1" flex={1}>
          <XStack gap="$2" alignItems="center">
            <SizableText fontWeight="700">{log.equipmentName}</SizableText>
            {log.autoFilled && (
              <View style={{
                backgroundColor: '#2a2010',
                borderRadius: 6,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderWidth: 1,
                borderColor: '#92400e',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 3,
              }}>
                <Ionicons name="flash-outline" size={10} color="#f59e0b" />
                <SizableText size="$1" color="#f59e0b" fontWeight="700">AUTO</SizableText>
              </View>
            )}
          </XStack>
          <XStack gap="$2" alignItems="center">
            <Ionicons name="calendar-outline" size={12} color="#94a3b8" />
            <SizableText size="$1" color="$color10">
              {formatDate(log.recordedAt, true)}
            </SizableText>
          </XStack>
          {log.note && (
            <SizableText size="$1" color="$color11" fontStyle="italic" marginTop="$1">
              {log.note}
            </SizableText>
          )}
        </YStack>
        <YStack alignItems="flex-end" gap="$1">
          <SizableText
            size="$5"
            fontWeight="800"
            color={log.outOfRange ? '$red10' : '$green10'}
          >
            {log.temperature.toFixed(1)}°C
          </SizableText>
          {log.outOfRange && (
            <XStack gap="$1" alignItems="center">
              <Ionicons name="alert-circle" size={12} color="#ef4444" />
              <SizableText size="$1" color="$red10" fontWeight="700">FUORI RANGE</SizableText>
            </XStack>
          )}
        </YStack>
      </XStack>
    </Card>
  );
}
