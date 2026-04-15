import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { blink } from '@/lib/blink';
import { useMemo } from 'react';

export interface BatchIngredientUsage {
  id: string;
  batchId: string;
  lotId?: string;
  ingredientId: string;
  nameSnapshot: string;
  quantity: number;
  unit: string;
  priceUsed: number;
  rowCost: number;
  // Join fields
  lotCode?: string;
  supplier?: string;
  deliveryDate?: string;
  expiryDate?: string;
}

export interface ProductionBatch {
  id: string;
  userId?: string;
  productId: string;
  recipeId: string;
  producedAt: string;
  quantityProduced: number;
  unitYield: string;
  frozenBatchCost: number;
  frozenUnitCost: number;
  note?: string;
  createdAt: string;
  // Join fields
  productName?: string;
  recipeName?: string;
  operatorName?: string;
  usages?: BatchIngredientUsage[];
}

export function useProduction() {
  const queryClient = useQueryClient();

  const batchesQuery = useQuery({
    queryKey: ['production-batches'],
    queryFn: async () => {
      const batches = await blink.db.amelieProductionBatch.list({
        orderBy: { produced_at: 'desc' }
      }) as any[];
      
      const products = await blink.db.amelieProduct.list() as any[];
      const recipes = await blink.db.amelieRecipe.list() as any[];
      const users = await blink.db.amelieUser.list() as any[];

      return batches.map(b => {
        const product = products.find(p => p.id === b.product_id || p.id === b.productId);
        const recipe = recipes.find(r => r.id === b.recipe_id || r.id === b.recipeId);
        const user = users.find(u => u.id === b.user_id || u.id === b.userId);
        
        const producedAt = b.produced_at || b.producedAt;
        
        return {
          ...b,
          id: b.id,
          productId: b.product_id || b.productId,
          recipeId: b.recipe_id || b.recipeId,
          producedAt: producedAt,
          quantityProduced: Number(b.quantity_produced || b.quantityProduced || 0),
          unitYield: b.unit_yield || b.unitYield,
          frozenBatchCost: Number(b.frozen_batch_cost || b.frozenBatchCost || 0),
          frozenUnitCost: Number(b.frozen_unit_cost || b.frozenUnitCost || 0),
          createdAt: b.created_at || b.createdAt,
          productName: product?.name || 'Prodotto eliminato',
          recipeName: recipe?.name || 'Ricetta eliminata',
          operatorName: user?.displayName || user?.display_name || 'Sistema',
        } as ProductionBatch;
      });
    },
  });

  const createBatch = useMutation({
    mutationFn: async (data: {
      productId: string;
      recipeId: string;
      quantityProduced: number;
      producedAt: string;
      note?: string;
      userId?: string;
      lotSelections: {
        ingredientId: string;
        lotId: string;
        quantity: number;
        unit: string;
        priceUsed: number;
        rowCost: number;
        nameSnapshot: string;
      }[];
      totalIngredientsCost: number;
      totalBatchCost: number;
      unitYield: string;
    }) => {
      const batchId = `bat_${Date.now()}`;

      // 1. Create Production Batch
      await blink.db.amelieProductionBatch.create({
        id: batchId,
        user_id: data.userId,
        product_id: data.productId,
        recipe_id: data.recipeId,
        produced_at: data.producedAt,
        quantity_produced: Number(data.quantityProduced),
        unit_yield: data.unitYield,
        frozen_batch_cost: Number(data.totalBatchCost),
        frozen_unit_cost: Number(data.totalBatchCost) / (Number(data.quantityProduced) || 1),
        note: data.note,
      } as any);

      // 2. Create Usage Records
      const usages = data.lotSelections.map((sel, idx) => ({
        id: `usage_${batchId}_${idx}`,
        batch_id: batchId,
        lot_id: sel.lotId,
        ingredient_id: sel.ingredientId,
        name_snapshot: sel.nameSnapshot,
        quantity: sel.quantity,
        unit: sel.unit,
        price_used: sel.priceUsed,
        row_cost: sel.rowCost,
      }));

      if (usages.length > 0) {
        await blink.db.amelieBatchIngredientUsage.createMany(usages as any[]);
      }

      // 3. Create Stock Movements (Scalamento magazzino)
      const movements = data.lotSelections.map((sel, idx) => ({
        id: `mov_prod_${batchId}_${idx}`,
        ingredient_id: sel.ingredientId,
        lot_id: sel.lotId,
        user_id: data.userId,
        type: 'out',
        quantity: sel.quantity,
        unit: sel.unit,
        moved_at: data.producedAt,
        referral: `Produzione batch ${batchId}`,
        note: `Utilizzo per produzione prodotto ID: ${data.productId}`,
      }));

      if (movements.length > 0) {
        await blink.db.amelieStockMovement.createMany(movements as any[]);
      }

      return batchId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-batches'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['ingredient-lots'] });
      // Also invalidate traceability queries
      queryClient.invalidateQueries({ queryKey: ['lot-traceability'] });
    },
  });

  const deleteBatch = useMutation({
    mutationFn: async (id: string) => {
      // 1. Delete usages
      const usages = await blink.db.amelieBatchIngredientUsage.list({
        where: { batch_id: id }
      }) as any[];
      
      for (const u of usages) {
        await blink.db.amelieBatchIngredientUsage.delete(u.id);
      }

      // 2. Delete stock movements related to this production
      const movements = await blink.db.amelieStockMovement.list({
        where: { referral: `Produzione batch ${id}` }
      }) as any[];

      for (const m of movements) {
        await blink.db.amelieStockMovement.delete(m.id);
      }

      // 3. Delete the batch itself
      return await blink.db.amelieProductionBatch.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-batches'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['ingredient-lots'] });
    },
  });

  return {
    batches: batchesQuery.data || [],
    isLoading: batchesQuery.isLoading,
    createBatch,
    deleteBatch,
    refetch: () => batchesQuery.refetch(),
  };
}

export function useBatchDetail(batchId?: string) {
  return useQuery({
    queryKey: ['production-batch-detail', batchId],
    queryFn: async () => {
      if (!batchId) return null;
      
      const usages = await blink.db.amelieBatchIngredientUsage.list({
        where: { batch_id: batchId }
      }) as any[];
      
      const lots = await blink.db.amelieIngredientLot.list() as any[];

      return usages.map(u => {
        const lot = lots.find(l => l.id === (u.lot_id || u.lotId));
        return {
          ...u,
          batchId: u.batch_id || u.batchId,
          lotId: u.lot_id || u.lotId,
          ingredientId: u.ingredient_id || u.ingredientId,
          nameSnapshot: u.name_snapshot || u.nameSnapshot,
          quantity: Number(u.quantity || 0),
          priceUsed: Number(u.price_used || u.priceUsed || 0),
          rowCost: Number(u.row_cost || u.rowCost || 0),
          lotCode: lot?.lot_code || lot?.lotCode,
          supplier: lot?.supplier,
          deliveryDate: lot?.delivery_date || lot?.deliveryDate,
          expiryDate: lot?.expiry_date || lot?.expiryDate,
        } as BatchIngredientUsage;
      });
    },
    enabled: !!batchId,
  });
}

export function useLotTraceability(lotId?: string, type: 'ingredient' | 'production' = 'ingredient') {
  return useQuery({
    queryKey: ['lot-traceability', lotId, type],
    queryFn: async () => {
      if (!lotId) return null;

      if (type === 'ingredient') {
        // Forward: Ingredient Lot -> Production Batches
        const usages = await blink.db.amelieBatchIngredientUsage.list({
          where: { lot_id: lotId }
        }) as any[];
        
        const batches = await blink.db.amelieProductionBatch.list() as any[];
        const products = await blink.db.amelieProduct.list() as any[];

        return usages.map(u => {
          const batch = batches.find(b => b.id === (u.batch_id || u.batchId));
          const product = products.find(p => p.id === (batch?.product_id || batch?.productId));
          const producedAt = batch?.produced_at || batch?.producedAt;
          
          return {
            id: u.id,
            batchId: u.batch_id || u.batchId,
            producedAt: producedAt,
            productName: product?.name || 'Prodotto eliminato',
            quantityUsed: u.quantity,
            unit: u.unit,
          };
        });
      } else {
        // Backward: Production Lot (Batch) -> Ingredient Lots used
        const usages = await blink.db.amelieBatchIngredientUsage.list({
          where: { batch_id: lotId }
        }) as any[];
        
        const lots = await blink.db.amelieIngredientLot.list() as any[];
        const ingredients = await blink.db.amelieIngredient.list() as any[];

        return usages.map(u => {
          const lot = lots.find(l => l.id === (u.lot_id || u.lotId));
          const ingredient = ingredients.find(i => i.id === (u.ingredient_id || u.ingredientId));
          return {
            id: u.id,
            ingredientName: ingredient?.name || u.name_snapshot || u.nameSnapshot,
            lotCode: lot?.lot_code || lot?.lotCode,
            supplier: lot?.supplier,
            deliveryDate: lot?.delivery_date || lot?.deliveryDate,
            expiryDate: lot?.expiry_date || lot?.expiryDate,
            quantityUsed: u.quantity,
            unit: u.unit,
          };
        });
      }
    },
    enabled: !!lotId,
  });
}