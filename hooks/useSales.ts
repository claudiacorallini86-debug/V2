import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { blink } from '@/lib/blink';
import { useMemo } from 'react';

export interface Sale {
  id: string;
  productId: string;
  quantity: number;
  totalPrice: number;
  soldAt: string;
  userId?: string;
  // Join fields
  productName?: string;
}

export function useSales() {
  const queryClient = useQueryClient();

  const salesQuery = useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      try {
        const data = await blink.db.amelieSale.list({
          orderBy: { sold_at: 'desc' }
        }) as any[];
        
        const products = await blink.db.amelieProduct.list() as any[];

        return data.map(s => ({
          ...s,
          productId: s.productId || s.product_id,
          totalPrice: Number(s.totalPrice || s.total_price || 0),
          quantity: Number(s.quantity || 0),
          soldAt: s.soldAt || s.sold_at,
          productName: products.find(p => p.id === (s.productId || s.product_id))?.name || 'Prodotto sconosciuto'
        })) as Sale[];
      } catch (error) {
        console.error('Error fetching sales:', error);
        return [];
      }
    },
  });

  const sales = useMemo(() => salesQuery.data || [], [salesQuery.data]);

  const createSale = useMutation({
    mutationFn: async (newSale: Omit<Sale, 'id' | 'soldAt'>) => {
      const id = `sale_${Date.now()}`;
      const soldAt = new Date().toISOString();
      return await blink.db.amelieSale.create({
        id,
        ...newSale,
        product_id: newSale.productId,
        total_price: newSale.totalPrice,
        sold_at: soldAt,
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });

  return {
    sales,
    isLoading: salesQuery.isLoading,
    createSale,
    refetch: salesQuery.refetch,
  };
}
