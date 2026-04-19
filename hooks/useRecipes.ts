import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { blink } from '@/lib/blink';
import { useMemo } from 'react';

export interface RecipeIngredient {
  id?: string;
  recipeId?: string;
  ingredientId: string;
  quantity: number;
  unit: string;
  isPackaging: boolean;
  sortOrder?: number;
  // Join fields
  name?: string;
  pricePerUnit?: number;
  priceUnit?: string;
  rowCost?: number;
  allergens?: string;
}

export interface Recipe {
  id: string;
  userId?: string;
  productId?: string;
  version: number;
  name: string;
  batchYield: number;
  unitYield: string;
  overheadWastePct: number;
  overheadEnergyPct: number;
  overheadLabourPct: number;
  note?: string;
  createdAt: string;
  // Computed fields
  ingredients: RecipeIngredient[];
  totalIngredientsCost: number;
  totalOverheadCost: number;
  totalBatchCost: number;
  costPerUnit: number;
  allergens: string[];
  // Batch fields
  lastBatchCost?: number;
  lastBatchDate?: string;
}

export function useRecipes() {
  const queryClient = useQueryClient();

  const recipesQuery = useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const recipes = await (blink.db as any).amelieRecipe.list({
        orderBy: { created_at: 'desc' }
      }) as any[];
      
      const rIngredients = await (blink.db as any).amelieRecipeIngredient.list() as any[];
      const ingredients = await (blink.db as any).amelieIngredient.list() as any[];
      const prices = await (blink.db as any).amelieIngredientPrice.list({
        orderBy: { date: 'desc' },
        limit: 500
      }) as any[];
      const batches = await (blink.db as any).amelieProductionBatch.list({
        orderBy: { produced_at: 'desc' }
      }) as any[];

      return recipes.map(r => {
        // Find latest batch for this recipe
        const recipeBatches = batches.filter(b => (b.recipe_id === r.id || b.recipeId === r.id));
        const latestBatch = recipeBatches[0];

        const recipeIngs = rIngredients
          .filter(ri => (ri.recipe_id === r.id || ri.recipeId === r.id))
          .map(ri => {
            const riIngId = ri.ingredient_id || ri.ingredientId;
            const ing = ingredients.find(i => i.id === riIngId);
            const latestPrice = prices
              .filter(p => (p.ingredient_id === riIngId || p.ingredientId === riIngId))
              .sort((a, b) => {
                const dateA = new Date(a.date || a.createdAt).getTime();
                const dateB = new Date(b.date || b.createdAt).getTime();
                if (dateA !== dateB) return dateB - dateA;
                const createA = new Date(a.createdAt || a.created_at || 0).getTime();
                const createB = new Date(b.createdAt || b.created_at || 0).getTime();
                return createB - createA;
              })[0];
            
            // Normalize units for cost calculation
            let pricePerBaseUnit = Number(latestPrice?.price_per_unit ?? latestPrice?.pricePerUnit ?? 0);
            const priceUnit = (latestPrice?.price_unit ?? latestPrice?.priceUnit ?? '').toLowerCase();
            const riUnit = (ri.unit ?? '').toLowerCase();
            const riQty = Number(ri.quantity ?? 0);

            let rowCost = riQty * pricePerBaseUnit;
            if ((priceUnit === 'kg' || priceUnit === 'l') && (riUnit === 'g' || riUnit === 'ml')) {
              rowCost = (riQty / 1000) * pricePerBaseUnit;
            } else if ((priceUnit === 'g' || priceUnit === 'ml') && (riUnit === 'kg' || riUnit === 'l')) {
              rowCost = (riQty * 1000) * pricePerBaseUnit;
            }

            return {
              ...ri,
              ingredientId: riIngId,
              quantity: riQty,
              unit: riUnit,
              isPackaging: Number(ri.is_packaging ?? ri.isPackaging ?? 0) > 0,
              name: ing?.name,
              pricePerUnit: pricePerBaseUnit,
              priceUnit: priceUnit,
              rowCost,
              allergens: ing?.allergens,
            } as RecipeIngredient;
          });

        const batchYield = Number(r.batch_yield || r.batchYield || 1);
        const overheadWaste = Number(r.overhead_waste_pct || r.overheadWastePct || 0);
        const overheadEnergy = Number(r.overhead_energy_pct || r.overheadEnergyPct || 0);
        const overheadLabour = Number(r.overhead_labour_pct || r.overheadLabourPct || 0);

        const totalIngredientsCost = recipeIngs.reduce((sum, ri) => sum + (ri.rowCost || 0), 0);
        const wasteCost = totalIngredientsCost * (overheadWaste / 100);
        const energyCost = totalIngredientsCost * (overheadEnergy / 100);
        const labourCost = totalIngredientsCost * (overheadLabour / 100);
        const totalOverheadCost = wasteCost + energyCost + labourCost;
        const totalBatchCost = totalIngredientsCost + totalOverheadCost;
        const costPerUnit = totalBatchCost / (batchYield || 1);

        const allergenSet = new Set<string>();
        recipeIngs.forEach(ri => {
          if (ri.allergens) {
            ri.allergens.split(',').forEach((a: string) => allergenSet.add(a.trim()));
          }
        });

        return {
          ...r,
          productId: r.product_id || r.productId,
          version: Number(r.version || 1),
          batchYield,
          unitYield: r.unit_yield || r.unitYield || 'kg',
          overheadWastePct: overheadWaste,
          overheadEnergyPct: overheadEnergy,
          overheadLabourPct: overheadLabour,
          createdAt: r.created_at || r.createdAt,
          ingredients: recipeIngs,
          totalIngredientsCost,
          totalOverheadCost,
          totalBatchCost,
          costPerUnit,
          allergens: Array.from(allergenSet).filter(Boolean),
          lastBatchCost: latestBatch ? Number(latestBatch.frozen_unit_cost || latestBatch.frozenUnitCost || 0) : undefined,
          lastBatchDate: latestBatch ? (latestBatch.produced_at || latestBatch.producedAt) : undefined,
        } as Recipe;
      });
    },
  });

  const createRecipe = useMutation({
    mutationFn: async (data: {
      recipe: Omit<Recipe, 'id' | 'version' | 'createdAt' | 'ingredients' | 'totalIngredientsCost' | 'totalOverheadCost' | 'totalBatchCost' | 'costPerUnit' | 'allergens'>;
      ingredients: Omit<RecipeIngredient, 'id' | 'recipeId'>[];
    }) => {
      // Find latest version for this product
      const productRecipes = (recipesQuery.data || []).filter(r => r.productId === data.recipe.productId);
      const nextVersion = productRecipes.length > 0 
        ? Math.max(...productRecipes.map(r => r.version)) + 1 
        : 1;

      const recipeId = `rec_${Date.now()}`;
      
      // Create recipe
      await (blink.db as any).amelieRecipe.create({
        id: recipeId,
        name: data.recipe.name,
        product_id: data.recipe.productId,
        version: nextVersion,
        batch_yield: data.recipe.batchYield,
        unit_yield: data.recipe.unitYield,
        overhead_waste_pct: data.recipe.overheadWastePct,
        overhead_energy_pct: data.recipe.overheadEnergyPct,
        overhead_labour_pct: data.recipe.overheadLabourPct,
        note: data.recipe.note,
      } as any);

      // Create ingredients
      if (data.ingredients.length > 0) {
        await (blink.db as any).amelieRecipeIngredient.createMany(
          data.ingredients.map((ri, index) => ({
            id: `ri_${recipeId}_${index}`,
            recipe_id: recipeId,
            ingredient_id: ri.ingredientId,
            quantity: ri.quantity,
            unit: ri.unit,
            is_packaging: ri.isPackaging ? 1 : 0,
            sort_order: index,
          } as any))
        );
      }

      return recipeId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // Products depend on recipes for allergens
    },
  });

  const deleteRecipe = useMutation({
    mutationFn: async (id: string) => {
      // Check if recipe has production batches
      const batches = await (blink.db as any).amelieProductionBatch.list({
        where: { recipe_id: id }
      }) as any[];

      if (batches.length > 0) {
        throw new Error(`Impossibile eliminare: la ricetta è stata utilizzata in ${batches.length} lotti di produzione.`);
      }

      // Delete recipe ingredients first
      const rIngredients = await (blink.db as any).amelieRecipeIngredient.list({
        where: { recipe_id: id }
      }) as any[];
      
      for (const ri of rIngredients) {
        await (blink.db as any).amelieRecipeIngredient.delete(ri.id);
      }

      return await (blink.db as any).amelieRecipe.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  return {
    recipes: recipesQuery.data || [],
    isLoading: recipesQuery.isLoading,
    createRecipe,
    deleteRecipe,
    refetch: recipesQuery.refetch,
  };
}
