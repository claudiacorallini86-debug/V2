import React, { useState, useMemo, useEffect } from 'react';
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
  Checkbox,
  Label,
} from '@blinkdotnew/mobile-ui';
import { useHaccp } from '@/hooks/useHaccp';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, Alert, View } from 'react-native';
import { formatDate } from '@/lib/date';
import { LoadingOverlay } from '@/components/LoadingOverlay';

export function CleaningTab() {
  const { cleaningTasks, checklists, upsertChecklist, addCleaningLogs, isLoading } = useHaccp();
  const { toast } = useBlinkToast();

  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>({});
  const [operatorName, setOperatorName] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  
  const currentChecklist = useMemo(() => 
    checklists.find(c => c.date === today && c.frequency === frequency),
  [checklists, today, frequency]);

  const tasksForFreq = useMemo(() => 
    cleaningTasks.filter(t => t.frequency === frequency),
  [cleaningTasks, frequency]);

  useEffect(() => {
    if (currentChecklist) {
      setOperatorName(currentChecklist.operatorName || '');
      if (currentChecklist.status === 'complete') {
        const initialChecked: Record<string, boolean> = {};
        tasksForFreq.forEach(t => initialChecked[t.id] = true);
        setCheckedTasks(initialChecked);
      }
    } else {
      setOperatorName('');
      setCheckedTasks({});
    }
  }, [currentChecklist, frequency, tasksForFreq]);

  const toggleTask = (taskId: string) => {
    setCheckedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const handleSaveChecklist = async () => {
    if (!operatorName.trim()) {
      Alert.alert('Errore', 'Inserisci il nome dell\'operatore che firma la checklist.');
      return;
    }

    const checkedCount = Object.values(checkedTasks).filter(v => v).length;
    let status: 'complete' | 'partial' | 'not_executed' = 'not_executed';
    
    if (checkedCount === tasksForFreq.length) status = 'complete';
    else if (checkedCount > 0) status = 'partial';

    try {
      await upsertChecklist.mutateAsync({
        id: currentChecklist?.id,
        date: today,
        frequency,
        operatorName: operatorName.trim(),
        status
      });

      const logsToCreate = tasksForFreq
        .filter(t => checkedTasks[t.id])
        .map(t => ({
          taskName: t.taskName,
          frequency: t.frequency,
          status: 'completed',
          note: `Eseguito da ${operatorName}`
        }));

      if (logsToCreate.length > 0) {
        await addCleaningLogs.mutateAsync(logsToCreate);
      }

      toast('Checklist salvata', { variant: 'success' });
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Errore durante il salvataggio.');
    }
  };

  if (isLoading) return <XStack padding="$10" justifyContent="center"><Spinner /></XStack>;

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <LoadingOverlay 
        visible={upsertChecklist.isPending || addCleaningLogs.isPending} 
        message="Salvataggio in corso..." 
      />
      <YStack padding="$4" gap="$4" paddingBottom="$10">
        
        <XStack gap="$2" backgroundColor="$color2" padding="$1" borderRadius="$4">
          <Button 
            flex={1} 
            size="$3" 
            theme={frequency === 'daily' ? 'active' : 'alt'} 
            onPress={() => setFrequency('daily')}
          >
            Giornaliere
          </Button>
          <Button 
            flex={1} 
            size="$3" 
            theme={frequency === 'weekly' ? 'active' : 'alt'} 
            onPress={() => setFrequency('weekly')}
          >
            Settimanali
          </Button>
        </XStack>

        <Card bordered padding="$4" backgroundColor="$color1" gap="$4">
          <XStack justifyContent="space-between" alignItems="center">
            <XStack gap="$2" alignItems="center">
              <Ionicons name="list-outline" size={20} color="#4A90D9" />
              <SizableText size="$4" fontWeight="800">
                Checklist {frequency === 'daily' ? 'Giorno' : 'Settimana'}
              </SizableText>
            </XStack>
            {currentChecklist && (
              <Badge theme={currentChecklist.status === 'complete' ? 'success' : 'warning'}>
                {currentChecklist.status.toUpperCase()}
              </Badge>
            )}
          </XStack>

          <YStack gap="$3">
            {tasksForFreq.map(task => (
              <XStack key={task.id} gap="$3" alignItems="center" onPress={() => toggleTask(task.id)}>
                <Checkbox 
                  id={task.id}
                  checked={checkedTasks[task.id] || false}
                  onCheckedChange={() => toggleTask(task.id)}
                  size="$5"
                >
                  <Checkbox.Indicator>
                    <Ionicons name="checkmark" size={18} color="white" />
                  </Checkbox.Indicator>
                </Checkbox>
                <Label 
                  htmlFor={task.id} 
                  flex={1} 
                  size="$3" 
                  color={checkedTasks[task.id] ? '$color12' : '$color11'}
                  fontWeight={checkedTasks[task.id] ? '600' : '400'}
                >
                  {task.taskName}
                </Label>
              </XStack>
            ))}
          </YStack>

          <Separator />

          <YStack gap="$2">
            <XStack gap="$2" alignItems="center">
              <Ionicons name="person-outline" size={16} color="#94a3b8" />
              <SizableText size="$2" color="$color11" fontWeight="600">Firma Operatore</SizableText>
            </XStack>
            <Input 
              value={operatorName}
              onChangeText={setOperatorName}
              placeholder="Nome e Cognome..."
            />
          </YStack>

          <Button 
            theme="active" 
            onPress={handleSaveChecklist}
            disabled={upsertChecklist.isPending}
            icon={upsertChecklist.isPending ? <Spinner color="white" /> : <Ionicons name="save-outline" size={18} color="white" />}
          >
            Salva e Firma Checklist
          </Button>
        </Card>

        <Button 
          variant="outline" 
          icon={<Ionicons name="time-outline" size={18} color="#94a3b8" />}
          onPress={() => setShowHistory(!showHistory)}
        >
          {showHistory ? 'Nascondi Storico Pulizie' : 'Visualizza Storico Pulizie'}
        </Button>

        {showHistory && (
          <YStack gap="$3">
            {checklists.map(checklist => (
              <Card key={checklist.id} bordered padding="$3" backgroundColor="$color1">
                <XStack justifyContent="space-between" alignItems="center">
                  <YStack gap="$1">
                    <XStack gap="$2" alignItems="center">
                      <Ionicons name="calendar-outline" size={14} color="#94a3b8" />
                      <SizableText fontWeight="700">{formatDate(checklist.date)}</SizableText>
                      <Badge size="$1" theme="alt">{checklist.frequency.toUpperCase()}</Badge>
                    </XStack>
                    <SizableText size="$2" color="$color11">Firmato da: {checklist.operatorName}</SizableText>
                  </YStack>
                  <Badge theme={checklist.status === 'complete' ? 'success' : 'warning'}>
                    {checklist.status.toUpperCase()}
                  </Badge>
                </XStack>
              </Card>
            ))}
          </YStack>
        )}

      </YStack>
    </ScrollView>
  );
}