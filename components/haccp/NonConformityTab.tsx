import React, { useState, useMemo } from 'react';
import {
  YStack,
  XStack,
  SizableText,
  Button,
  Card,
  Separator,
  Input,
  BlinkSelect,
  useBlinkToast,
  Badge,
  Spinner,
  Theme,
} from '@blinkdotnew/mobile-ui';
import { useHaccp, NonConformity } from '@/hooks/useHaccp';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, Alert, View, TouchableOpacity } from 'react-native';
import { formatDate } from '@/lib/date';
import { LoadingOverlay } from '@/components/LoadingOverlay';

export function NonConformityTab() {
  const { nonConformities, addNonConformity, updateNonConformity, isLoading } = useHaccp();
  const { toast } = useBlinkToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [form, setForm] = useState({
    description: '',
    category: 'Igiene',
    severity: 'media' as any,
    detectedAt: new Date().toISOString().split('T')[0],
    responsible: '',
    targetDate: '',
  });

  const handleAdd = async () => {
    if (!form.description || !form.detectedAt) {
      Alert.alert('Errore', 'Descrizione e data sono obbligatorie.');
      return;
    }

    try {
      await addNonConformity.mutateAsync(form);
      toast('Non conformità aperta', { variant: 'success' });
      setForm({
        description: '',
        category: 'Igiene',
        severity: 'media',
        detectedAt: new Date().toISOString().split('T')[0],
        responsible: '',
        targetDate: '',
      });
      setIsFormOpen(false);
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Errore durante il salvataggio.');
    }
  };

  if (isLoading) return <XStack padding="$10" justifyContent="center"><Spinner /></XStack>;

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <LoadingOverlay 
        visible={addNonConformity.isPending || updateNonConformity.isPending} 
        message="Operazione in corso..." 
      />
      <YStack padding="$4" gap="$4" paddingBottom="$10">
        
        <Button 
          theme={isFormOpen ? 'alt' : 'active'} 
          icon={isFormOpen ? null : <Ionicons name="add" size={18} color="white" />}
          onPress={() => setIsFormOpen(!isFormOpen)}
        >
          {isFormOpen ? 'Annulla' : 'Segnala Nuova Non Conformità'}
        </Button>

        {isFormOpen && (
          <Card bordered padding="$4" backgroundColor="$color1" gap="$4">
            <YStack gap="$2">
              <SizableText size="$2" color="$color11" fontWeight="600">Descrizione dell'evento</SizableText>
              <Input 
                multiline
                numberOfLines={3}
                value={form.description}
                onChangeText={(t) => setForm({ ...form, description: t })}
                placeholder="Cosa è successo?"
                height={80}
                textAlignVertical="top"
              />
            </YStack>

            <XStack gap="$3">
              <YStack flex={1} gap="$2">
                <SizableText size="$2" color="$color11" fontWeight="600">Categoria</SizableText>
                <BlinkSelect 
                  items={[
                    { label: 'Igiene', value: 'Igiene' },
                    { label: 'Temperatura', value: 'Temperatura' },
                    { label: 'Infrastruttura', value: 'Infrastruttura' },
                    { label: 'Altro', value: 'Altro' },
                  ]}
                  value={form.category}
                  onValueChange={(val) => setForm({ ...form, category: val })}
                />
              </YStack>
              <YStack flex={1} gap="$2">
                <SizableText size="$2" color="$color11" fontWeight="600">Gravità</SizableText>
                <BlinkSelect 
                  items={[
                    { label: 'Bassa', value: 'bassa' },
                    { label: 'Media', value: 'media' },
                    { label: 'Alta', value: 'alta' },
                  ]}
                  value={form.severity}
                  onValueChange={(val) => setForm({ ...form, severity: val })}
                />
              </YStack>
            </XStack>

            <XStack gap="$3">
              <YStack flex={1} gap="$2">
                <SizableText size="$2" color="$color11" fontWeight="600">Data Rilevazione</SizableText>
                <Input 
                  value={form.detectedAt}
                  onChangeText={(t) => setForm({ ...form, detectedAt: t })}
                  placeholder="YYYY-MM-DD"
                />
              </YStack>
              <YStack flex={1} gap="$2">
                <SizableText size="$2" color="$color11" fontWeight="600">Resp. Risoluzione</SizableText>
                <Input 
                  value={form.responsible}
                  onChangeText={(t) => setForm({ ...form, responsible: t })}
                  placeholder="Nome..."
                />
              </YStack>
            </XStack>

            <Button 
              theme="active" 
              onPress={handleAdd}
              disabled={addNonConformity.isPending}
            >
              Apri Non Conformità
            </Button>
          </Card>
        )}

        <YStack gap="$3">
          <SizableText size="$4" fontWeight="800">Elenco Segnalazioni</SizableText>
          
          {nonConformities.length === 0 ? (
            <Card bordered padding="$6" alignItems="center" backgroundColor="$color2">
              <SizableText color="$color10">Nessuna non conformità registrata</SizableText>
            </Card>
          ) : (
            nonConformities.map(nc => (
              <NonConformityCard 
                key={nc.id} 
                nc={nc} 
                isExpanded={expandedId === nc.id}
                onToggle={() => setExpandedId(expandedId === nc.id ? null : nc.id)}
                onUpdate={(data) => updateNonConformity.mutateAsync({ id: nc.id, ...data })}
              />
            ))
          )}
        </YStack>

      </YStack>
    </ScrollView>
  );
}

function NonConformityCard({ nc, isExpanded, onToggle, onUpdate }: { 
  nc: NonConformity, 
  isExpanded: boolean, 
  onToggle: () => void,
  onUpdate: (data: any) => Promise<any>
}) {
  const [action, setAction] = useState(nc.correctiveAction || '');
  const [targetDate, setTargetDate] = useState(nc.targetDate || '');

  const statusThemes: any = {
    aperta: 'destructive',
    in_corso: 'warning',
    chiusa: 'success'
  };

  const severityColors: any = {
    bassa: '$green10',
    media: '$orange10',
    alta: '$red10'
  };

  const handleUpdate = async (status?: string) => {
    try {
      await onUpdate({
        correctiveAction: action,
        targetDate,
        status: status || nc.status,
        closedAt: status === 'chiusa' ? new Date().toISOString().split('T')[0] : nc.closedAt
      });
      toast('Aggiornato', { message: 'Dati aggiornati correttamente.', variant: 'success' });
    } catch (e) {
      toast('Errore', { message: 'Impossibile aggiornare.', variant: 'error' });
    }
  };

  return (
    <Card bordered padding="$0" backgroundColor="$color1" overflow="hidden">
      <TouchableOpacity onPress={onToggle}>
        <YStack padding="$3" gap="$2">
          <XStack justifyContent="space-between" alignItems="center">
            <XStack gap="$2" alignItems="center">
              <Badge theme={statusThemes[nc.status]}>{nc.status.replace('_', ' ').toUpperCase()}</Badge>
              <SizableText size="$1" fontWeight="700" color={severityColors[nc.severity]}>
                {nc.severity.toUpperCase()}
              </SizableText>
            </XStack>
            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color="#94a3b8" />
          </XStack>
          
          <SizableText fontWeight="700" size="$3">{nc.description}</SizableText>
          
          <XStack gap="$3">
            <XStack gap="$1" alignItems="center">
              <Ionicons name="calendar-outline" size={12} color="#94a3b8" />
              <SizableText size="$1" color="$color10">{formatDate(nc.detectedAt)}</SizableText>
            </XStack>
            <Badge size="$1" theme="alt">{nc.category}</Badge>
          </XStack>
        </YStack>
      </TouchableOpacity>

      {isExpanded && (
        <YStack padding="$3" paddingTop="$0" gap="$3" backgroundColor="$color2">
          <Separator />
          
          <YStack gap="$2">
            <SizableText size="$2" fontWeight="600">Azione Correttiva</SizableText>
            <Input 
              multiline
              value={action}
              onChangeText={setAction}
              placeholder="Cosa è stato fatto?"
              backgroundColor="$color1"
            />
          </YStack>

          <XStack gap="$3">
            <YStack flex={1} gap="$1">
              <SizableText size="$1" fontWeight="600">Scadenza Azione</SizableText>
              <Input 
                size="$2"
                value={targetDate}
                onChangeText={setTargetDate}
                placeholder="YYYY-MM-DD"
                backgroundColor="$color1"
              />
            </YStack>
            <YStack flex={1} gap="$1">
              <SizableText size="$1" fontWeight="600">Responsabile</SizableText>
              <SizableText size="$2" fontWeight="700">{nc.responsible || 'N/D'}</SizableText>
            </YStack>
          </XStack>

          <XStack gap="$2">
            <Button flex={1} size="$2" variant="outline" onPress={() => handleUpdate()}>
              Salva Note
            </Button>
            {nc.status !== 'chiusa' && (
              <Button flex={1} size="$2" theme="success" icon={<Ionicons name="checkmark-circle-outline" size={14} color="white" />} onPress={() => handleUpdate('chiusa')}>
                Chiudi
              </Button>
            )}
          </XStack>

          {nc.closedAt && (
            <XStack gap="$2" alignItems="center" alignSelf="center">
              <Ionicons name="checkmark-circle" size={12} color="#166534" />
              <SizableText size="$1" color="$green10">Chiusa il {formatDate(nc.closedAt)}</SizableText>
            </XStack>
          )}
        </YStack>
      )}
    </Card>
  );
}
