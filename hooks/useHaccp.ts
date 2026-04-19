import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { blink } from '@/lib/blink';
import { useMemo } from 'react';

export interface HaccpEquipment {
  id: string;
  name: string;
  minTemp: number;
  maxTemp: number;
  created_at: string;
}

export interface TemperatureLog {
  id: string;
  equipmentName: string;
  temperature: number;
  recordedAt: string;
  outOfRange: boolean;
  note?: string;
  autoFilled?: boolean;
  created_at: string;
}

export interface FillSummaryItem {
  equipmentName: string;
  filledCount: number;
  refTemperature: number;
}

export interface CleaningTask {
  id: string;
  taskName: string;
  frequency: 'daily' | 'weekly';
}

export interface CleaningLog {
  id: string;
  taskName: string;
  frequency: string;
  status: string;
  recordedAt: string;
  note?: string;
}

export interface HaccpChecklist {
  id: string;
  date: string;
  frequency: 'daily' | 'weekly';
  operatorName: string;
  status: 'complete' | 'partial' | 'not_executed';
  created_at: string;
}

export interface NonConformity {
  id: string;
  description: string;
  category: string;
  severity: 'bassa' | 'media' | 'alta';
  correctiveAction?: string;
  status: 'aperta' | 'in_corso' | 'chiusa';
  detectedAt: string;
  closedAt?: string;
  responsible?: string;
  targetDate?: string;
}

export function useHaccp() {
  const queryClient = useQueryClient();

  // --- Equipment ---
  const equipmentQuery = useQuery({
    queryKey: ['haccp-equipment'],
    queryFn: async () => {
      const data = await (blink.db as any).amelieHaccpEquipment.list() as any[];
      return data.map(e => ({
        id: e.id,
        name: e.name,
        minTemp: Number(e.minTemp || e.min_temp),
        maxTemp: Number(e.maxTemp || e.max_temp),
        created_at: e.created_at
      })) as HaccpEquipment[];
    }
  });

  const createEquipment = useMutation({
    mutationFn: async (data: Omit<HaccpEquipment, 'id' | 'created_at'>) => {
      return await (blink.db as any).amelieHaccpEquipment.create({
        id: `eq_${Date.now()}`,
        name: data.name,
        min_temp: data.minTemp,
        max_temp: data.maxTemp
      } as any);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['haccp-equipment'] })
  });

  const deleteEquipment = useMutation({
    mutationFn: async (id: string) => {
      return await (blink.db as any).amelieHaccpEquipment.delete(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['haccp-equipment'] })
  });

  // --- Temperature Logs ---
  const temperatureLogsQuery = useQuery({
    queryKey: ['haccp-temperature-logs'],
    queryFn: async () => {
      const data = await (blink.db as any).amelieHaccpTemperatureLog.list({
        orderBy: { recorded_at: 'desc' }
      }) as any[];
      return data.map(l => ({
        id: l.id,
        equipmentName: l.equipmentName || l.equipment_name,
        temperature: Number(l.temperature),
        recordedAt: l.recordedAt || l.recorded_at,
        outOfRange: Boolean(l.outOfRange || l.out_of_range),
        note: l.note,
        autoFilled: Boolean(Number(l.autoFilled ?? l.auto_filled ?? 0)),
        created_at: l.created_at
      })) as TemperatureLog[];
    }
  });

  const addTemperatureLog = useMutation({
    mutationFn: async (data: Omit<TemperatureLog, 'id' | 'created_at' | 'recordedAt'>) => {
      const recordedAt = new Date().toISOString();
      return await (blink.db as any).amelieHaccpTemperatureLog.create({
        id: `tlog_${Date.now()}`,
        equipment_name: data.equipmentName,
        temperature: data.temperature,
        out_of_range: data.outOfRange ? 1 : 0,
        note: data.note,
        recorded_at: recordedAt,
        auto_filled: 0
      } as any);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['haccp-temperature-logs'] })
  });

  // Calcola preview dei giorni mancanti per TUTTE le attrezzature
  const computeFillPreview = async (): Promise<FillSummaryItem[]> => {
    const allLogs = await (blink.db as any).amelieHaccpTemperatureLog.list({
      orderBy: { recorded_at: 'desc' }
    }) as any[];

    const normalizedLogs = allLogs.map((l: any) => ({
      equipmentName: (l.equipmentName || l.equipment_name) as string,
      temperature: Number(l.temperature),
      recordedAt: (l.recordedAt || l.recorded_at) as string,
      outOfRange: Boolean(Number(l.outOfRange ?? l.out_of_range ?? 0)),
      note: l.note as string | undefined,
      autoFilled: Boolean(Number(l.autoFilled ?? l.auto_filled ?? 0)),
    }));

    // Raggruppa per attrezzatura
    const byEquipment: Record<string, typeof normalizedLogs> = {};
    for (const log of normalizedLogs) {
      if (!byEquipment[log.equipmentName]) byEquipment[log.equipmentName] = [];
      byEquipment[log.equipmentName].push(log);
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);

    const preview: FillSummaryItem[] = [];

    for (const [equipmentName, logs] of Object.entries(byEquipment)) {
      // logs è già ordinato desc, il primo è il più recente
      const lastLog = logs[0];
      const refDate = new Date(lastLog.recordedAt);
      refDate.setHours(0, 0, 0, 0);

      const existingDatesForEq = new Set(logs.map(l => l.recordedAt.substring(0, 10)));

      let missingCount = 0;
      const cursor = new Date(refDate);
      cursor.setDate(cursor.getDate() + 1);
      while (cursor <= yesterday) {
        const dateStr = cursor.toISOString().substring(0, 10);
        if (!existingDatesForEq.has(dateStr)) missingCount++;
        cursor.setDate(cursor.getDate() + 1);
      }

      if (missingCount > 0) {
        preview.push({ equipmentName, filledCount: missingCount, refTemperature: lastLog.temperature });
      }
    }

    return preview;
  };

  const fillMissingDays = useMutation({
    mutationFn: async (): Promise<FillSummaryItem[]> => {
      // Recupera tutti i log dal DB
      const allLogs = await (blink.db as any).amelieHaccpTemperatureLog.list({
        orderBy: { recorded_at: 'desc' }
      }) as any[];

      const normalizedLogs = allLogs.map((l: any) => ({
        equipmentName: (l.equipmentName || l.equipment_name) as string,
        temperature: Number(l.temperature),
        recordedAt: (l.recordedAt || l.recorded_at) as string,
        outOfRange: Boolean(Number(l.outOfRange ?? l.out_of_range ?? 0)),
        note: l.note as string | undefined,
      }));

      // Raggruppa per attrezzatura (già ordinato desc → primo = più recente)
      const byEquipment: Record<string, typeof normalizedLogs> = {};
      for (const log of normalizedLogs) {
        if (!byEquipment[log.equipmentName]) byEquipment[log.equipmentName] = [];
        byEquipment[log.equipmentName].push(log);
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(23, 59, 59, 999);

      const allNewRecords: any[] = [];
      const summary: FillSummaryItem[] = [];
      let idCounter = 0;

      for (const [equipmentName, logs] of Object.entries(byEquipment)) {
        const lastLog = logs[0]; // più recente
        const refDate = new Date(lastLog.recordedAt);
        refDate.setHours(0, 0, 0, 0);

        // Date già presenti per questa attrezzatura
        const existingDatesForEq = new Set(logs.map(l => l.recordedAt.substring(0, 10)));

        const timeSlot = lastLog.recordedAt.substring(11, 19) || '08:00:00';
        const missingDates: string[] = [];

        const cursor = new Date(refDate);
        cursor.setDate(cursor.getDate() + 1);
        while (cursor <= yesterday) {
          const dateStr = cursor.toISOString().substring(0, 10);
          if (!existingDatesForEq.has(dateStr)) {
            missingDates.push(dateStr);
          }
          cursor.setDate(cursor.getDate() + 1);
        }

        if (missingDates.length > 0) {
          missingDates.forEach(dateStr => {
            allNewRecords.push({
              id: `tlog_auto_${Date.now()}_${idCounter++}`,
              equipment_name: equipmentName,
              temperature: lastLog.temperature,
              out_of_range: lastLog.outOfRange ? 1 : 0,
              note: lastLog.note || null,
              recorded_at: `${dateStr}T${timeSlot}`,
              auto_filled: 1
            });
          });
          summary.push({ equipmentName, filledCount: missingDates.length, refTemperature: lastLog.temperature });
        }
      }

      if (allNewRecords.length === 0) return [];

      await (blink.db as any).amelieHaccpTemperatureLog.createMany(allNewRecords as any[]);
      return summary;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['haccp-temperature-logs'] })
  });

  // --- Cleaning Tasks ---
  const cleaningTasksQuery = useQuery({
    queryKey: ['haccp-cleaning-tasks'],
    queryFn: async () => {
      const data = await (blink.db as any).amelieHaccpCleaningTask.list() as any[];
      return data.map(t => ({
        id: t.id,
        taskName: t.taskName || t.task_name,
        frequency: t.frequency
      })) as CleaningTask[];
    }
  });

  const createCleaningTask = useMutation({
    mutationFn: async (data: Omit<CleaningTask, 'id'>) => {
      return await (blink.db as any).amelieHaccpCleaningTask.create({
        id: `ct_${Date.now()}`,
        task_name: data.taskName,
        frequency: data.frequency
      } as any);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['haccp-cleaning-tasks'] })
  });

  const deleteCleaningTask = useMutation({
    mutationFn: async (id: string) => {
      return await (blink.db as any).amelieHaccpCleaningTask.delete(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['haccp-cleaning-tasks'] })
  });

  // --- Checklists ---
  const checklistsQuery = useQuery({
    queryKey: ['haccp-checklists'],
    queryFn: async () => {
      const data = await (blink.db as any).amelieHaccpChecklist.list({
        orderBy: { date: 'desc' }
      }) as any[];
      return data.map(c => ({
        ...c,
        operatorName: c.operatorName || c.operator_name
      })) as HaccpChecklist[];
    }
  });

  const upsertChecklist = useMutation({
    mutationFn: async (data: Omit<HaccpChecklist, 'id' | 'created_at'> & { id?: string }) => {
      const id = data.id || `chk_${Date.now()}`;
      return await (blink.db as any).amelieHaccpChecklist.upsert({
        id,
        date: data.date,
        frequency: data.frequency,
        operator_name: data.operatorName,
        status: data.status
      } as any);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['haccp-checklists'] })
  });

  // --- Cleaning Logs (executions) ---
  const cleaningLogsQuery = useQuery({
    queryKey: ['haccp-cleaning-logs'],
    queryFn: async () => {
      const data = await (blink.db as any).amelieHaccpCleaningLog.list({
        orderBy: { recorded_at: 'desc' }
      }) as any[];
      return data.map(l => ({
        id: l.id,
        taskName: l.taskName || l.task_name,
        frequency: l.frequency,
        status: l.status,
        recordedAt: l.recordedAt || l.recorded_at,
        note: l.note
      })) as CleaningLog[];
    }
  });

  const addCleaningLogs = useMutation({
    mutationFn: async (logs: Omit<CleaningLog, 'id' | 'recordedAt'>[]) => {
      const recordedAt = new Date().toISOString();
      const newLogs = logs.map((l, i) => ({
        id: `clog_${Date.now()}_${i}`,
        task_name: l.taskName,
        frequency: l.frequency,
        status: l.status,
        note: l.note,
        recorded_at: recordedAt
      }));
      return await (blink.db as any).amelieHaccpCleaningLog.createMany(newLogs as any[]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['haccp-cleaning-logs'] })
  });

  // --- Non Conformities ---
  const nonConformitiesQuery = useQuery({
    queryKey: ['haccp-non-conformities'],
    queryFn: async () => {
      const data = await (blink.db as any).amelieHaccpNonConformity.list({
        orderBy: { detected_at: 'desc' }
      }) as any[];
      return data.map(nc => ({
        id: nc.id,
        description: nc.description,
        category: nc.category,
        severity: nc.severity,
        correctiveAction: nc.correctiveAction || nc.corrective_action,
        status: nc.status,
        detectedAt: nc.detectedAt || nc.detected_at,
        closedAt: nc.closedAt || nc.closed_at,
        responsible: nc.responsible,
        targetDate: nc.targetDate || nc.target_date
      })) as NonConformity[];
    }
  });

  const addNonConformity = useMutation({
    mutationFn: async (data: Omit<NonConformity, 'id' | 'status' | 'closedAt'>) => {
      return await (blink.db as any).amelieHaccpNonConformity.create({
        id: `nc_${Date.now()}`,
        description: data.description,
        category: data.category,
        severity: data.severity,
        detected_at: data.detectedAt,
        status: 'aperta',
        responsible: data.responsible,
        target_date: data.targetDate
      } as any);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['haccp-non-conformities'] })
  });

  const updateNonConformity = useMutation({
    mutationFn: async (data: Partial<NonConformity> & { id: string }) => {
      const updateData: any = { ...data };
      if (data.correctiveAction) updateData.corrective_action = data.correctiveAction;
      if (data.closedAt) updateData.closed_at = data.closedAt;
      if (data.targetDate) updateData.target_date = data.targetDate;
      
      return await (blink.db as any).amelieHaccpNonConformity.update(data.id, updateData);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['haccp-non-conformities'] })
  });

  return {
    equipment: equipmentQuery.data || [],
    temperatureLogs: temperatureLogsQuery.data || [],
    cleaningTasks: cleaningTasksQuery.data || [],
    checklists: checklistsQuery.data || [],
    cleaningLogs: cleaningLogsQuery.data || [],
    nonConformities: nonConformitiesQuery.data || [],
    isLoading: 
      equipmentQuery.isLoading || 
      temperatureLogsQuery.isLoading || 
      cleaningTasksQuery.isLoading || 
      checklistsQuery.isLoading ||
      cleaningLogsQuery.isLoading ||
      nonConformitiesQuery.isLoading,
    createEquipment,
    deleteEquipment,
    addTemperatureLog,
    fillMissingDays,
    computeFillPreview,
    createCleaningTask,
    deleteCleaningTask,
    upsertChecklist,
    addCleaningLogs,
    addNonConformity,
    updateNonConformity,
    refetch: async () => {
      await equipmentQuery.refetch();
      await temperatureLogsQuery.refetch();
      await cleaningTasksQuery.refetch();
      await checklistsQuery.refetch();
      await cleaningLogsQuery.refetch();
      await nonConformitiesQuery.refetch();
    }
  };
}
