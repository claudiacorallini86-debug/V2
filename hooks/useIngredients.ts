import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { blink } from '@/lib/blink'

export interface Ingredient {
  id: string
  name: string
  category: string
  measurementUnit: string
  conservation: string
  allergens: string // Comma separated
  minimumStock: number
  defaultSupplier?: string
  note?: string
  createdAt: string
  conservation_type?: string
}

export interface StockMovement {
  id: string
  ingredientId: string
  lotId?: string
  userId?: string
  type: 'in' | 'out'
  quantity: number
  unit: string
  movedAt: string
  referral?: string
  note?: string
  ingredient_id?: string
  lot_id?: string
  moved_at?: string
}

export interface IngredientLot {
  id: string
  ingredientId: string
  userId?: string
  lotCode: string
  supplier: string
  deliveryDate: string
  expiryDate?: string
  initialQuantity: number
  conservation: string
  status: 'active' | 'exhausted' | 'expired' | 'recalled'
  note?: string
  createdAt: string
  // Join fields
  ingredientName?: string
  ingredient_id?: string
  lot_code?: string
  delivery_date?: string
  expiry_date?: string
  initial_quantity?: string | number
  created_at?: string
}

export interface IngredientPrice {
  id: string
  ingredientId: string
  date: string
  supplier: string
  pricePerUnit: number
  priceUnit: string
  docReferral?: string
  invoiceUrl?: string
  note?: string
  createdAt: string
  ingredient_id?: string
  price_per_unit?: number
  price_unit?: string
  doc_referral?: string
  invoice_url?: string
}

export interface LotPhoto {
  id: string
  lotId: string
  url: string
  urlThumbnail?: string
  sortOrder: number
  createdAt: string
  lot_id?: string
  sort_order?: number
  created_at?: string
}

export function useIngredients() {
  const queryClient = useQueryClient()

  const ingredientsQuery = useQuery({
    queryKey: ['ingredients'],
    queryFn: async () => {
      const data = await blink.db.amelieIngredient.list() as any[]
      return data.map(i => ({
        ...i,
        id: i.id,
        name: i.name || 'Senza Nome',
        measurementUnit: i.measurementUnit || i.measurement_unit || 'kg',
        minimumStock: Number(i.minimumStock || i.minimum_stock || 0),
        createdAt: i.createdAt || i.created_at,
        defaultSupplier: i.defaultSupplier || i.default_supplier,
        conservation: i.conservation || i.conservation_type || 'secco',
      })) as Ingredient[]
    },
  })

  const lotsQuery = useQuery({
    queryKey: ['ingredient-lots'],
    queryFn: async () => {
      try {
        const data = await blink.db.amelieIngredientLot.list({
          orderBy: { delivery_date: 'desc' }
        }) as any[]
        
        return data.map(l => {
          const ingId = l.ingredientId || l.ingredient_id;
          return {
            ...l,
            id: l.id,
            ingredientId: ingId,
            lotCode: l.lotCode || l.lot_code || '',
            deliveryDate: l.deliveryDate || l.delivery_date,
            expiryDate: l.expiryDate || l.expiry_date,
            supplier: l.supplier || '',
            initialQuantity: Number(l.initialQuantity || l.initial_quantity || 0),
            status: l.status || 'active',
            createdAt: l.createdAt || l.created_at,
          } as IngredientLot;
        })
      } catch (error) {
        console.error('Error fetching ingredient lots:', error)
        return []
      }
    },
    enabled: true 
  })

  // Computed data
  const ingredients = useMemo(() => ingredientsQuery.data || [], [ingredientsQuery.data]);
  
  const lots = useMemo(() => {
    const rawLots = lotsQuery.data || [];
    return rawLots.map(l => ({
      ...l,
      ingredientName: ingredients.find(i => i.id === l.ingredientId)?.name || 'Ingrediente sconosciuto',
    })) as IngredientLot[];
  }, [lotsQuery.data, ingredients]);

  const stockQuery = useQuery({
    queryKey: ['stock-movements'],
    queryFn: async () => {
      try {
        const data = await blink.db.amelieStockMovement.list({
          orderBy: { moved_at: 'desc' }
        }) as any[]
        
        return data.map(m => {
          const ingId = m.ingredientId || m.ingredient_id;
          const lId = m.lotId || m.lot_id;
          return {
            ...m,
            id: m.id,
            ingredientId: ingId,
            lotId: lId,
            movedAt: m.movedAt || m.moved_at,
            quantity: Number(m.quantity || 0),
          } as StockMovement
        })
      } catch (error) {
        console.error('Error fetching stock movements:', error)
        return []
      }
    },
    enabled: true
  })

  const movements = useMemo(() => {
    const rawMovs = stockQuery.data || [];
    return rawMovs.map(m => {
      const ingredient = ingredients.find(i => i.id === m.ingredientId);
      const lot = lots.find(l => l.id === m.lotId);
      return {
        ...m,
        ingredientName: ingredient?.name,
        lotCode: lot?.lotCode,
      };
    });
  }, [stockQuery.data, ingredients, lots]);

  // Calcola giacenza attuale per ogni ingrediente
  const stockMap = useMemo(() => {
    return (stockQuery.data || []).reduce((acc: Record<string, number>, mov) => {
      const id = mov.ingredientId
      if (!id) return acc
      
      const qty = Number(mov.quantity) || 0
      if (acc[id] === undefined) acc[id] = 0
      if (mov.type === 'in') acc[id] += qty
      else acc[id] -= qty
      return acc
    }, {} as Record<string, number>)
  }, [stockQuery.data])

  // Calcola giacenza per ogni lotto
  const lotStockMap = useMemo(() => {
    return (stockQuery.data || []).reduce((acc: Record<string, number>, mov) => {
      const id = mov.lotId
      if (!id) return acc
      
      const qty = Number(mov.quantity) || 0
      if (acc[id] === undefined) acc[id] = 0
      if (mov.type === 'in') acc[id] += qty
      else acc[id] -= qty
      return acc
    }, {} as Record<string, number>)
  }, [stockQuery.data])

  const createIngredient = useMutation({
    mutationFn: async (newIngredient: Omit<Ingredient, 'id' | 'createdAt'>) => {
      const id = `ing_${Date.now()}`
      return await blink.db.amelieIngredient.create({
        id,
        name: newIngredient.name,
        category: newIngredient.category,
        measurement_unit: newIngredient.measurementUnit,
        conservation: newIngredient.conservation,
        allergens: newIngredient.allergens,
        minimum_stock: newIngredient.minimumStock,
        default_supplier: newIngredient.defaultSupplier,
        note: newIngredient.note,
      } as any)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
    },
  })

  const updateIngredient = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Ingredient> & { id: string }) => {
      const updateData: any = {}
      if (data.name !== undefined) updateData.name = data.name
      if (data.category !== undefined) updateData.category = data.category
      if (data.measurementUnit !== undefined) updateData.measurement_unit = data.measurementUnit
      if (data.conservation !== undefined) updateData.conservation = data.conservation
      if (data.allergens !== undefined) updateData.allergens = data.allergens
      if (data.minimumStock !== undefined) updateData.minimum_stock = data.minimumStock
      if (data.defaultSupplier !== undefined) updateData.default_supplier = data.defaultSupplier
      if (data.note !== undefined) updateData.note = data.note
      
      return await blink.db.amelieIngredient.update(id, updateData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
    },
  })

  const deleteIngredient = useMutation({
    mutationFn: async (id: string) => {
      const recipeIngredients = await blink.db.amelieRecipeIngredient.list({
        where: { ingredientId: id }
      }) as any[]
      
      const activeLots = await blink.db.amelieIngredientLot.list({
        where: { 
          ingredientId: id,
          status: 'active'
        }
      }) as any[]

      if (recipeIngredients.length > 0 || activeLots.length > 0) {
        throw new Error(`Impossibile eliminare: ingrediente in uso in ${recipeIngredients.length} ricette e ${activeLots.length} lotti attivi.`)
      }

      return await blink.db.amelieIngredient.delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
    },
  })

  const deleteLot = useMutation({
    mutationFn: async (id: string) => {
      // Check if lot has movements (other than the initial one)
      const movements = await blink.db.amelieStockMovement.list({
        where: { lotId: id }
      }) as any[]
      
      // If there are more than 1 movements (in/out), it's being used
      if (movements.length > 1) {
        throw new Error(`Impossibile eliminare: il lotto ha ${movements.length} movimenti registrati.`)
      }

      // Delete the initial movement first
      if (movements.length === 1) {
        await blink.db.amelieStockMovement.delete(movements[0].id)
      }

      return await blink.db.amelieIngredientLot.delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient-lots'] })
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
    },
  })

  const createLot = useMutation({
    mutationFn: async (newLot: Omit<IngredientLot, 'id' | 'createdAt' | 'ingredientName'> & { measurementUnit?: string }) => {
      const id = `lot_${Date.now()}`
      const { measurementUnit, ...rest } = newLot
      
      const lotData = {
        id,
        ingredient_id: rest.ingredientId,
        lot_code: rest.lotCode,
        supplier: rest.supplier,
        delivery_date: rest.deliveryDate,
        expiry_date: rest.expiryDate,
        initial_quantity: rest.initialQuantity,
        conservation: rest.conservation,
        status: rest.status || 'active',
        note: rest.note,
      } as any
      
      await blink.db.amelieIngredientLot.create(lotData)
      
      await blink.db.amelieStockMovement.create({
        id: `mov_${Date.now()}`,
        ingredient_id: rest.ingredientId,
        lot_id: id,
        type: 'in',
        quantity: rest.initialQuantity,
        unit: measurementUnit || 'kg',
        moved_at: rest.deliveryDate,
        referral: `Carico iniziale lotto ${rest.lotCode}`,
      } as any)
      
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient-lots'] })
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
    }
  })

  const updateLot = useMutation({
    mutationFn: async ({ id, ...data }: Partial<IngredientLot> & { id: string }) => {
      const updateData: any = {}
      if (data.ingredientId) updateData.ingredient_id = data.ingredientId
      if (data.lotCode) updateData.lot_code = data.lotCode
      if (data.supplier !== undefined) updateData.supplier = data.supplier
      if (data.deliveryDate) updateData.delivery_date = data.deliveryDate
      if (data.expiryDate !== undefined) updateData.expiry_date = data.expiryDate
      if (data.initialQuantity !== undefined) updateData.initial_quantity = data.initialQuantity
      if (data.conservation !== undefined) updateData.conservation = data.conservation
      if (data.status !== undefined) updateData.status = data.status
      if (data.note !== undefined) updateData.note = data.note
      
      return await blink.db.amelieIngredientLot.update(id, updateData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient-lots'] })
    }
  })

  const createMovement = useMutation({
    mutationFn: async (mov: Omit<StockMovement, 'id' | 'movedAt'>) => {
      const id = `mov_${Date.now()}`
      const movedAt = new Date().toISOString()
      
      const res = await blink.db.amelieStockMovement.create({
        id,
        ingredient_id: mov.ingredientId,
        lot_id: mov.lotId,
        type: mov.type,
        quantity: mov.quantity,
        unit: mov.unit,
        referral: mov.referral,
        note: mov.note,
        moved_at: movedAt,
      } as any)

      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
      queryClient.invalidateQueries({ queryKey: ['ingredient-lots'] })
    }
  })

  return {
    ingredients,
    lots,
    movements,
    isLoading: ingredientsQuery.isLoading || stockQuery.isLoading || lotsQuery.isLoading,
    stockMap,
    lotStockMap,
    createIngredient,
    updateIngredient,
    deleteIngredient,
    createLot,
    updateLot,
    deleteLot,
    createMovement,
    refetch: async () => {
      await ingredientsQuery.refetch()
      await lotsQuery.refetch()
      await stockQuery.refetch()
    },
  }
}

export function useLotPhotos(lotId?: string) {
  const queryClient = useQueryClient()

  const photosQuery = useQuery({
    queryKey: ['lot-photos', lotId],
    queryFn: async () => {
      if (!lotId) return []
      const data = await blink.db.amelieLotPhoto.list({
        where: { lot_id: lotId },
        orderBy: { sortOrder: 'asc' }
      }) as any[]
      
      return data.map(p => ({
        ...p,
        id: p.id,
        lotId: p.lotId || p.lot_id,
        sortOrder: Number(p.sortOrder ?? p.sort_order ?? 0),
        createdAt: p.createdAt || p.created_at,
      })) as LotPhoto[]
    },
    enabled: !!lotId
  })

  const addPhoto = useMutation({
    mutationFn: async (photo: Omit<LotPhoto, 'id' | 'createdAt'>) => {
      const id = `photo_${Date.now()}`
      return await blink.db.amelieLotPhoto.create({
        id,
        lot_id: photo.lotId,
        url: photo.url,
        url_thumbnail: photo.urlThumbnail,
        sort_order: photo.sortOrder,
      } as any)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lot-photos', lotId] })
    }
  })

  const deletePhoto = useMutation({
    mutationFn: async (id: string) => {
      return await blink.db.amelieLotPhoto.delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lot-photos', lotId] })
    }
  })

  const updatePhotoOrder = useMutation({
    mutationFn: async (photos: { id: string, sortOrder: number }[]) => {
      return await Promise.all(photos.map(p => 
        blink.db.amelieLotPhoto.update(p.id, { sort_order: p.sortOrder } as any)
      ))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lot-photos', lotId] })
    }
  })

  return {
    photos: photosQuery.data || [],
    isLoading: photosQuery.isLoading,
    addPhoto,
    deletePhoto,
    updatePhotoOrder,
  }
}

export function useIngredientPrices(ingredientId?: string) {
  const queryClient = useQueryClient()

  const pricesQuery = useQuery({
    queryKey: ['ingredient-prices', ingredientId],
    queryFn: async () => {
      if (!ingredientId) return []
      try {
        const data = await blink.db.amelieIngredientPrice.list({
          where: { ingredientId }
        }) as any[]
        
        return data.map(p => {
          const price = Number(p.price_per_unit ?? p.pricePerUnit ?? 0)
          return {
            ...p,
            id: p.id,
            ingredientId: p.ingredient_id || p.ingredientId,
            date: p.date,
            supplier: p.supplier,
            pricePerUnit: isNaN(price) ? 0 : price,
            priceUnit: p.price_unit || p.priceUnit || 'kg',
            docReferral: p.doc_referral || p.docReferral || '',
            invoiceUrl: p.invoice_url || p.invoiceUrl || '',
            note: p.note || '',
            createdAt: p.created_at || p.createdAt,
          } as IngredientPrice
        }).sort((a, b) => {
          const dateA = new Date(a.date || 0).getTime()
          const dateB = new Date(b.date || 0).getTime()
          if (dateA !== dateB) return dateB - dateA
          
          const createA = new Date(a.createdAt || 0).getTime()
          const createB = new Date(b.createdAt || 0).getTime()
          return createB - createA
        })
      } catch (error) {
        console.error('Error in useIngredientPrices:', error)
        return []
      }
    },
    enabled: !!ingredientId
  })

  const addPrice = useMutation({
    mutationFn: async (newPrice: Omit<IngredientPrice, 'id' | 'createdAt'>) => {
      if (!newPrice.ingredientId) {
        throw new Error('ID ingrediente mancante per aggiungere un prezzo')
      }
      
      const id = `prc_${Date.now()}`
      return await blink.db.amelieIngredientPrice.create({
        id,
        ingredient_id: newPrice.ingredientId,
        date: newPrice.date,
        supplier: newPrice.supplier,
        price_per_unit: newPrice.pricePerUnit,
        price_unit: newPrice.priceUnit,
        doc_referral: newPrice.docReferral,
        invoice_url: newPrice.invoiceUrl,
        note: newPrice.note,
      } as any)
    },
    onSuccess: (data, variables) => {
      const id = variables?.ingredientId
      if (id) {
        queryClient.invalidateQueries({ 
          queryKey: ['ingredient-prices', id] 
        })
      }
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
      queryClient.invalidateQueries({ queryKey: ['all-ingredient-prices'] })
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  const currentPrice = useMemo(() => {
    if (!pricesQuery.data || pricesQuery.data.length === 0) return null
    return pricesQuery.data[0]
  }, [pricesQuery.data])

  return {
    prices: pricesQuery.data || [],
    isLoading: pricesQuery.isLoading,
    addPrice,
    currentPrice,
    refetch: pricesQuery.refetch,
  }
}
