import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { blink } from '@/lib/blink';

export interface Product {
  id: string;
  userId?: string;
  name: string;
  type: string;
  saleUnit: string;
  salePrice?: number;
  note?: string;
  createdAt: string;
  // Join fields
  latestRecipeId?: string;
  allergens?: string[];
}

export function useProducts() {
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const data = await (blink.db as any).amelieProduct.list({
        orderBy: { name: 'asc' }
      }) as any[];
      
      const recipes = await (blink.db as any).amelieRecipe.list() as any[];
      const recipeIngredients = await (blink.db as any).amelieRecipeIngredient.list() as any[];
      const ingredients = await (blink.db as any).amelieIngredient.list() as any[];

      return data.map(p => {
        // Find latest recipe for this product (check both snake_case and camelCase)
        const productRecipes = recipes
          .filter(r => {
            const recipeProdId = r.product_id || r.productId;
            return recipeProdId === p.id;
          })
          .sort((a, b) => (Number(b.version || 0)) - (Number(a.version || 0)));
        
        const latestRecipe = productRecipes[0];
        let productAllergens: string[] = [];

        if (latestRecipe) {
          const latestRecipeId = latestRecipe.id;
          const rIngredients = recipeIngredients.filter(ri => {
            const riRecipeId = ri.recipe_id || ri.recipeId;
            return riRecipeId === latestRecipeId;
          });
          const allergenSet = new Set<string>();
          
          rIngredients.forEach(ri => {
            const riIngId = ri.ingredient_id || ri.ingredientId;
            const ing = ingredients.find(i => i.id === riIngId);
            if (ing && ing.allergens) {
              ing.allergens.split(',').forEach((a: string) => allergenSet.add(a.trim()));
            }
          });
          
          productAllergens = Array.from(allergenSet).filter(Boolean);
        }

        return {
          ...p,
          saleUnit: p.sale_unit || p.saleUnit,
          salePrice: p.sale_price !== undefined ? p.sale_price : p.salePrice,
          createdAt: p.created_at || p.createdAt,
          latestRecipeId: latestRecipe?.id,
          allergens: productAllergens,
        } as Product;
      });
    },
  });

  const createProduct = useMutation({
    mutationFn: async (newProduct: Omit<Product, 'id' | 'createdAt'>) => {
      const id = `prod_${Date.now()}`;
      return await (blink.db as any).amelieProduct.create({
        id,
        name: newProduct.name,
        type: newProduct.type,
        saleUnit: newProduct.saleUnit,
        salePrice: newProduct.salePrice,
        note: newProduct.note,
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Product> & { id: string }) => {
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.type !== undefined) updateData.type = data.type;
      if (data.saleUnit !== undefined) updateData.saleUnit = data.saleUnit;
      if (data.salePrice !== undefined) updateData.salePrice = data.salePrice;
      if (data.note !== undefined) updateData.note = data.note;
      
      return await (blink.db as any).amelieProduct.update(id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      // Check if product has recipes
      const recipes = await (blink.db as any).amelieRecipe.list({
        where: { product_id: id }
      }) as any[];

      if (recipes.length > 0) {
        throw new Error(`Impossibile eliminare: il prodotto ha ${recipes.length} ricette collegate.`);
      }

      return await (blink.db as any).amelieProduct.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  return {
    products: productsQuery.data || [],
    isLoading: productsQuery.isLoading,
    createProduct,
    updateProduct,
    deleteProduct,
    refetch: productsQuery.refetch,
  };
}
