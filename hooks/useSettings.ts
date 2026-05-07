import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { blink } from '../lib/blink';

export function useSettings() {
  const queryClient = useQueryClient();

  const { data: settings = {}, isLoading, refetch } = useQuery({
    queryKey: ['amelie-settings'],
    queryFn: async () => {
      const list = await (blink.db as any).amelieSettings.list() as any[];
      const map: Record<string, string> = {};
      list.forEach(item => {
        map[item.key] = item.value;
      });
      return map;
    },
    staleTime: 0,           // considera sempre stale: ricarica al montaggio
    refetchOnMount: 'always', // ricarica ogni volta che il componente monta (anche rientro)
    refetchOnWindowFocus: true, // ricarica quando l'utente torna sulla finestra
  });

  const updateSettings = useMutation({
    mutationFn: async (newSettings: Record<string, string>) => {
      const promises = Object.entries(newSettings).map(([key, value]) => 
        (blink.db as any).amelieSettings.upsert({ key, value })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['amelie-settings'] });
    }
  });

  return { settings, isLoading, updateSettings, refetch };
}
