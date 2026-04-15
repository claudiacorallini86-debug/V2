import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { blink } from '@/lib/blink';
import { logAudit } from './useAudit';

import { hashPassword } from '../lib/crypto';

export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  role: 'staff' | 'admin';
  active: boolean;
  createdAt: string;
}

export function useUsers() {
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: ['app-users'],
    queryFn: async () => {
      const data = await blink.db.amelieUser.list() as any[];
      return data.map(u => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName || u.display_name,
        role: u.role || 'staff',
        active: Number(u.active) > 0,
        createdAt: u.created_at || u.createdAt,
      })) as AppUser[];
    }
  });

  const createUser = useMutation({
    mutationFn: async (data: { email: string, displayName: string, role: string, passwordHash: string }) => {
      const passwordHash = await hashPassword(data.passwordHash);
      const res = await blink.db.amelieUser.create({
        id: `u_${Date.now()}`,
        email: data.email,
        display_name: data.displayName,
        role: data.role,
        password_hash: passwordHash,
        active: 1,
      } as any);
      
      await logAudit('Creazione utente', 'Utente', res.id, null, { email: data.email, role: data.role });
      return res;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['app-users'] })
  });

  const updateUser = useMutation({
    mutationFn: async ({ id, ...data }: Partial<AppUser> & { id: string, password?: string }) => {
      const updateData: any = {};
      if (data.displayName !== undefined) updateData.display_name = data.displayName;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.password !== undefined) {
        updateData.password_hash = await hashPassword(data.password);
      }
      
      const res = await blink.db.amelieUser.update(id, updateData);
      await logAudit('Aggiornamento utente', 'Utente', id, null, { email: data.email });
      return res;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['app-users'] })
  });

  const updateUserRole = useMutation({
    mutationFn: async ({ id, role }: { id: string, role: string }) => {
      const userBefore = await blink.db.amelieUser.get(id);
      const res = await blink.db.amelieUser.update(id, { role } as any);
      await logAudit('Cambio ruolo', 'Utente', id, { role: userBefore?.role }, { role });
      return res;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['app-users'] })
  });

  const toggleUserStatus = useMutation({
    mutationFn: async ({ id, active }: { id: string, active: boolean }) => {
      const res = await blink.db.amelieUser.update(id, { active: active ? 1 : 0 } as any);
      await logAudit(active ? 'Riattivazione utente' : 'Disattivazione utente', 'Utente', id);
      return res;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['app-users'] })
  });

  return {
    users: usersQuery.data || [],
    isLoading: usersQuery.isLoading,
    createUser,
    updateUserRole,
    toggleUserStatus,
  };
}
