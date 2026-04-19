import { useIngredients } from './useIngredients';
import { useProduction } from './useProduction';
import { useHaccp } from './useHaccp';
import { useProducts } from './useProducts';
import { useSales } from './useSales';
import { useMemo } from 'react';

export function useDashboard() {
  const { ingredients, stockMap, lots, isLoading: ingLoading } = useIngredients();
  const { batches, isLoading: prodLoading } = useProduction();
  const { temperatureLogs, nonConformities, isLoading: haccpLoading } = useHaccp();
  const { products, isLoading: productsLoading } = useProducts();
  const { sales, isLoading: salesLoading } = useSales();

  const dashboardData = useMemo(() => {
    // 1. Active products count
    const activeProductsCount = products.length;

    // 2. Low stock ingredients count
    const lowStockIngredients = ingredients.filter(ing => {
      const currentStock = stockMap[ing.id] || 0;
      return currentStock < ing.minimumStock;
    });

    // 3. Lots expiring in 7 days
    const now = new Date();
    const next7Days = new Date();
    next7Days.setDate(now.getDate() + 7);

    const expiringLots = lots.filter(lot => {
      if (!lot.expiryDate || lot.status !== 'active') return false;
      const expiry = new Date(lot.expiryDate);
      return expiry > now && expiry <= next7Days;
    });

    // 4. Production batches this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const batchesThisMonth = batches.filter(batch => {
      const producedAt = new Date(batch.producedAt);
      return producedAt >= startOfMonth;
    });

    // 5. Sales Statistics
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);

    const salesToday = sales.filter(s => new Date(s.soldAt) >= startOfToday)
      .reduce((acc, s) => acc + s.totalPrice, 0);
    const salesThisWeek = sales.filter(s => new Date(s.soldAt) >= startOfWeek)
      .reduce((acc, s) => acc + s.totalPrice, 0);
    const salesThisMonth = sales.filter(s => new Date(s.soldAt) >= startOfMonth)
      .reduce((acc, s) => acc + s.totalPrice, 0);

    // Sales by day (last 7 days for chart)
    const salesByDay = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      
      const total = sales
        .filter(s => {
          const soldDate = new Date(s.soldAt);
          return soldDate >= dayStart && soldDate < dayEnd;
        })
        .reduce((acc, s) => acc + s.totalPrice, 0);
      
      return {
        date: d.toLocaleDateString('it-IT', { weekday: 'short' }),
        fullDate: d.toISOString().split('T')[0],
        total
      };
    }).reverse();

    // Open Non Conformities
    const openNonConformities = nonConformities.filter(nc => nc.status !== 'chiusa');

    return {
      stats: {
        activeProducts: activeProductsCount,
        lowStockCount: lowStockIngredients.length,
        expiringLotsCount: expiringLots.length,
        monthlyBatchesCount: batchesThisMonth.length,
        salesToday,
        salesThisWeek,
        salesThisMonth,
      },
      charts: {
        salesByDay
      },
      alerts: {
        lowStock: lowStockIngredients.map(ing => ({
          id: ing.id,
          name: ing.name,
          currentStock: stockMap[ing.id] || 0,
          minStock: ing.minimumStock,
          unit: ing.measurementUnit,
        })),
        expiringLots: expiringLots.map(lot => {
          const expiry = new Date(lot.expiryDate!);
          const diffTime = Math.abs(expiry.getTime() - now.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return {
            id: lot.id,
            ingredientName: lot.ingredientName,
            lotCode: lot.lotCode,
            daysRemaining: diffDays,
          };
        }),
        openNC: openNonConformities,
      },
      activities: {
        recentBatches: batches.slice(0, 5),
        recentTemps: temperatureLogs.slice(0, 5),
      },
    };
  }, [products, ingredients, stockMap, lots, batches, temperatureLogs, nonConformities, sales]);

  return {
    data: dashboardData,
    isLoading: ingLoading || prodLoading || haccpLoading || productsLoading || salesLoading,
    refetch: async () => {
      // Logic for refetching if needed (handled by react-query internally but if manual is required)
    }
  };
}
