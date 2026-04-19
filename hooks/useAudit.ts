import { useQuery } from '@tanstack/react-query';
import { blink } from '@/lib/blink';

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  dataBefore?: string;
  dataAfter?: string;
  ipAddress?: string;
  createdAt: string;
  // Join
  userName?: string;
}

export function useAudit() {
  const auditQuery = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const db = blink.db as any;

      const [logsResult, usersResult] = await Promise.allSettled([
        db.amelieAuditLog.list({
          orderBy: { created_at: 'desc' }
        }) as Promise<any[]>,
        db.amelieUser.list() as Promise<any[]>,
      ]);

      if (logsResult.status !== 'fulfilled') {
        throw logsResult.reason;
      }

      const logs = logsResult.value || [];
      const users = usersResult.status === 'fulfilled' ? usersResult.value || [] : [];

      return logs.map(log => {
        const user = users.find(u => u.id === log.user_id || u.id === log.userId);
        return {
          id: log.id,
          userId: log.user_id || log.userId,
          action: log.action,
          entity: log.entity,
          entityId: log.entity_id || log.entityId,
          dataBefore: log.data_before || log.dataBefore,
          dataAfter: log.data_after || log.dataAfter,
          ipAddress: log.ip_address || log.ipAddress,
          createdAt: log.created_at || log.createdAt,
          userName: user?.displayName || user?.email || 'Sconosciuto',
        } as AuditLog;
      }).sort((left, right) => {
        return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
      });
    }
  });

  return {
    logs: auditQuery.data || [],
    isLoading: auditQuery.isLoading,
    isFetching: auditQuery.isFetching,
    isError: auditQuery.isError,
    error: auditQuery.error,
    refetch: auditQuery.refetch,
  };
}

export async function logAudit(action: string, entity: string, entityId?: string, dataBefore?: any, dataAfter?: any) {
  try {
    const userJson = await blink.auth.me();
    await (blink.db as any).amelieAuditLog.create({
      id: `log_${Date.now()}`,
      user_id: userJson?.id || 'system',
      action,
      entity,
      entity_id: entityId,
      data_before: dataBefore ? JSON.stringify(dataBefore) : undefined,
      data_after: dataAfter ? JSON.stringify(dataAfter) : undefined,
    } as any);
  } catch (error) {
    console.warn('Failed to log audit activity:', error);
  }
}
