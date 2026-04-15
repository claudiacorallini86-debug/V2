import React, { useState, useEffect, useMemo } from 'react';
import {
  YStack,
  XStack,
  SizableText,
  Button,
  SafeArea,
  ScrollView,
  Input,
  Label,
  BlinkSelect,
  useBlinkToast,
  Separator,
  Theme,
  Card,
  Badge,
  Spinner,
  Save,
} from '@blinkdotnew/mobile-ui';
import { AppHeader } from '@/components/AppHeader';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Platform, View } from 'react-native';
import { useProduction } from '@/hooks/useProduction';
import { useProducts } from '@/hooks/useProducts';
import { useRecipes } from '@/hooks/useRecipes';
import { useIngredients } from '@/hooks/useIngredients';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { blink } from '@/lib/blink';
import { useAuth } from '@/context/AuthContext';

export default function NuovoLottoProduzioneScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const toastContext = useBlinkToast();
  const { createBatch } = useProduction();
  const { products } = useProducts();
  const { recipes } = useRecipes();
  const { ingredients, lots: allIngredientLots, lotStockMap } = useIngredients();

  const showToast = (title: string, options: any) => {
    if (toastContext?.toast) {
      toastContext.toast(title, options);
    } else if (typeof toastContext === 'function') {
      (toastContext as any)(title, options);
    } else {
      if (Platform.OS === 'web') alert(`${title}: ${options.message}`);
      else Alert.alert(title, options.message);
    }
  };

  const [form, setForm] = useState({
    productId: '',
    recipeId: '',
    producedAt: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm
    quantityProduced: '',
    note: '',
  });

  const [lotSelections, setLotSelections] = useState<Record<string, {
    lotId: string;
    quantity: number;
    unit: string;
    priceUsed: number;
    rowCost: number;
    nameSnapshot: string;
  }>>({});

  const [ingredientPrices, setIngredientPrices] = useState<Record<string, number>>({});

  // Product options
  const productOptions = useMemo(() => 
    products.map(p => ({ label: p.name, value: p.id })), 
  [products]);

  // Recipe options for selected product
  const productRecipes = useMemo(() => 
    recipes.filter(r => r.productId === form.productId),
  [recipes, form.productId]);

  const recipeOptions = useMemo(() => 
    productRecipes.map(r => ({ label: `${r.name} (v.${r.version})`, value: r.id })),
  [productRecipes]);

  // Selected recipe details
  const selectedRecipe = useMemo(() => 
    recipes.find(r => r.id === form.recipeId),
  [recipes, form.recipeId]);

  // Recipe ingredients
  const [recipeIngredients, setRecipeIngredients] = useState<any[]>([]);
  const [isRecipeLoading, setIsRecipeLoading] = useState(false);

  // Initialize lot selections when recipe changes
  useEffect(() => {
    const fetchRecipeIngredients = async () => {
      if (!form.recipeId) {
        setRecipeIngredients([]);
        setLotSelections({});
        return;
      }
      setIsRecipeLoading(true);
      try {
        const ri = await blink.db.amelieRecipeIngredient.list({
          where: { recipe_id: form.recipeId }
        }) as any[];
        
        const prices: Record<string, number> = {};
        const initialSelections: Record<string, any> = {};

        for (const item of ri) {
          const ingId = item.ingredientId || item.ingredient_id;
          const ing = ingredients.find(i => i.id === ingId);
          
          // Fetch price
          try {
            const p = await blink.db.amelieIngredientPrice.list({
              where: { ingredient_id: ingId },
              orderBy: { date: 'desc' },
              limit: 1
            }) as any[];
            const price = Number(p[0]?.price_per_unit || p[0]?.pricePerUnit || 0);
            prices[ingId] = price;
          } catch (pe) {
            console.warn('Error fetching price for ingredient:', ingId, pe);
            prices[ingId] = 0;
          }

          // Find FIFO lot
          const activeLots = allIngredientLots
            .filter(l => (l.ingredientId === ingId || l.ingredient_id === ingId) && l.status === 'active')
            .sort((a, b) => {
              const dateA = a.deliveryDate || a.delivery_date;
              const dateB = b.deliveryDate || b.delivery_date;
              return new Date(dateA || 0).getTime() - new Date(dateB || 0).getTime();
            });
          
          const qty = Number(item.quantity || 0);
          const rowCost = calculateRowCost(qty, item.unit, prices[ingId], 'kg');

          initialSelections[ingId] = {
            lotId: activeLots[0]?.id || '',
            quantity: qty,
            unit: item.unit,
            priceUsed: prices[ingId],
            rowCost: rowCost,
            nameSnapshot: ing?.name || 'Ingrediente ignoto',
          };
        }
        
        setIngredientPrices(prices);
        setRecipeIngredients(ri);
        setLotSelections(initialSelections);
      } catch (error) {
        console.error('Error fetching recipe ingredients:', error);
        Alert.alert('Errore', 'Impossibile caricare i dettagli della ricetta.');
      } finally {
        setIsRecipeLoading(false);
      }
    };

    fetchRecipeIngredients();
  }, [form.recipeId]); // Only run when recipeId changes to avoid resets on magazzino updates

  function calculateRowCost(qty: number, unit: string, price: number, priceUnit: string) {
    const q = Number(qty);
    const p = Number(price);
    const u = (unit || '').toLowerCase();
    const pu = (priceUnit || '').toLowerCase();

    if ((pu === 'kg' || pu === 'l') && (u === 'g' || u === 'ml')) {
      return (q / 1000) * p;
    } else if ((pu === 'g' || pu === 'ml') && (u === 'kg' || u === 'l')) {
      return (q * 1000) * p;
    }
    return q * p;
  }

  // Cost calculations
  const totalIngredientsCost = useMemo(() => {
    return Object.values(lotSelections).reduce((sum, sel) => sum + (sel.rowCost || 0), 0);
  }, [lotSelections]);

  const overheads = useMemo(() => {
    if (!selectedRecipe) return { waste: 0, energy: 0, labour: 0, total: 0 };
    const waste = totalIngredientsCost * (Number(selectedRecipe.overheadWastePct || 0) / 100);
    const energy = totalIngredientsCost * (Number(selectedRecipe.overheadEnergyPct || 0) / 100);
    const labour = totalIngredientsCost * (Number(selectedRecipe.overheadLabourPct || 0) / 100);
    return { waste, energy, labour, total: waste + energy + labour };
  }, [selectedRecipe, totalIngredientsCost]);

  const totalBatchCost = totalIngredientsCost + overheads.total;

  // Validation
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!form.productId) errors.push('Seleziona un prodotto');
    if (!form.recipeId) errors.push('Seleziona una ricetta');
    
    const qtyVal = parseFloat(form.quantityProduced.replace(',', '.'));
    if (!form.quantityProduced || isNaN(qtyVal) || qtyVal <= 0) {
      errors.push('Inserisci una quantità prodotta valida (maggiore di 0)');
    }
    
    if (recipeIngredients.length === 0 && !isRecipeLoading && form.recipeId) {
      errors.push('La ricetta selezionata non ha ingredienti configurati');
    }

    recipeIngredients.forEach(ri => {
      const ingId = ri.ingredientId || ri.ingredient_id;
      if (!lotSelections[ingId]?.lotId) {
        const ing = ingredients.find(i => i.id === ingId);
        errors.push(`Manca il lotto per: ${ing?.name || 'Ingrediente'}`);
      }
    });
    
    return errors;
  }, [form, recipeIngredients, lotSelections, ingredients, isRecipeLoading]);

  const canSave = validationErrors.length === 0 && !createBatch.isPending && !isRecipeLoading;

  const handleSave = async () => {
    // Re-check validation just in case
    if (validationErrors.length > 0) {
      Alert.alert('Parametri mancanti o errati', `Per favore completa i seguenti campi:\n\n• ${validationErrors.join('\n• ')}`);
      return;
    }

    try {
      const qtyProduced = parseFloat(form.quantityProduced.replace(',', '.'));
      
      await createBatch.mutateAsync({
        productId: form.productId,
        recipeId: form.recipeId,
        quantityProduced: qtyProduced,
        producedAt: form.producedAt,
        note: form.note,
        lotSelections: Object.values(lotSelections),
        totalIngredientsCost: totalIngredientsCost || 0,
        totalBatchCost: totalBatchCost || 0,
        unitYield: selectedRecipe?.unitYield || 'kg',
        userId: user?.id,
      });

      showToast('Successo', { message: 'Lotto di produzione creato correttamente.', variant: 'success' });
      router.back();
    } catch (error: any) {
      console.error('Save production batch error:', error);
      Alert.alert('Errore di salvataggio', error.message || 'Si è verificato un errore durante il salvataggio della produzione. Verifica la connessione e riprova.');
    }
  };

  return (
    <SafeArea>
      <AppHeader 
        title="Nuova Produzione" 
        variant="back" 
        onBack={() => router.back()}
        rightSlot={
          <Button 
            size="$3" 
            theme={canSave ? "active" : "alt"} 
            icon={createBatch.isPending ? <Spinner color="white" /> : <Save size={18} color="white" />} 
            onPress={handleSave}
            disabled={!canSave}
            opacity={canSave ? 1 : 0.5}
          >
            Salva
          </Button>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack padding="$4" gap="$5" paddingBottom="$10">
          
          <YStack gap="$3">
            <XStack gap="$2" alignItems="center">
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#4A90D9', alignItems: 'center', justifyContent: 'center' }}>
                <SizableText size="$1" fontWeight="800" color="white">1</SizableText>
              </View>
              <SizableText size="$4" fontWeight="800">Informazioni Base</SizableText>
            </XStack>
            
            <Card bordered padding="$4" backgroundColor="$color1" gap="$4">
              <YStack gap="$2">
                <FormLabel required>Prodotto</FormLabel>
                <BlinkSelect 
                  items={productOptions}
                  value={form.productId}
                  onValueChange={(val) => setForm({ ...form, productId: val, recipeId: '' })}
                  placeholder="Seleziona prodotto..."
                />
              </YStack>

              <YStack gap="$2">
                <FormLabel required>Ricetta</FormLabel>
                <BlinkSelect 
                  items={recipeOptions}
                  value={form.recipeId}
                  onValueChange={(val) => setForm({ ...form, recipeId: val })}
                  placeholder={form.productId ? "Seleziona ricetta..." : "Scegli prima un prodotto"}
                  disabled={!form.productId}
                />
              </YStack>

              <XStack gap="$3">
                <YStack flex={1} gap="$2">
                  <FormLabel required>Data/Ora Produzione</FormLabel>
                  <Input 
                    value={form.producedAt}
                    onChangeText={(t) => setForm({ ...form, producedAt: t })}
                    placeholder="YYYY-MM-DDTHH:mm"
                  />
                </YStack>
                <YStack flex={1} gap="$2">
                  <FormLabel required>Quantità Prodotta</FormLabel>
                  <XStack alignItems="center" gap="$2">
                    <Input 
                      flex={1}
                      keyboardType="numeric"
                      value={form.quantityProduced}
                      onChangeText={(t) => setForm({ ...form, quantityProduced: t })}
                      placeholder="es. 5.0"
                    />
                    <SizableText color="$color11">{selectedRecipe?.unitYield || 'kg'}</SizableText>
                  </XStack>
                </YStack>
              </XStack>

              <YStack gap="$2">
                <FormLabel>Note</FormLabel>
                <Input 
                  multiline
                  numberOfLines={2}
                  value={form.note}
                  onChangeText={(t) => setForm({ ...form, note: t })}
                  placeholder="Eventuali note sul batch..."
                />
              </YStack>
            </Card>
          </YStack>

          {form.recipeId && (
            <YStack gap="$3">
              <XStack gap="$2" alignItems="center">
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#4A90D9', alignItems: 'center', justifyContent: 'center' }}>
                  <SizableText size="$1" fontWeight="800" color="white">2</SizableText>
                </View>
                <SizableText size="$4" fontWeight="800">Selezione Lotti Ingredienti</SizableText>
              </XStack>

              {isRecipeLoading ? (
                <XStack padding="$4" justifyContent="center"><Spinner /></XStack>
              ) : (
                <YStack gap="$3">
                  {recipeIngredients.map((ri) => {
                    const ingId = ri.ingredientId || ri.ingredient_id;
                    const ing = ingredients.find(i => i.id === ingId);
                    const activeLots = allIngredientLots
                      .filter(l => (l.ingredientId === ingId || l.ingredient_id === ingId) && l.status === 'active')
                      .sort((a, b) => {
                        const dateA = a.deliveryDate || a.delivery_date;
                        const dateB = b.deliveryDate || b.delivery_date;
                        return new Date(dateA || 0).getTime() - new Date(dateB || 0).getTime();
                      });
                    
                    const lotOptions = activeLots.map(l => ({ 
                      label: `${l.lotCode || l.lot_code} (${l.supplier}) - Giac: ${lotStockMap[l.id] ?? 0} ${ri.unit}`, 
                      value: l.id 
                    }));

                    const selection = lotSelections[ingId];
                    const selectedLot = activeLots.find(l => l.id === selection?.lotId);

                    return (
                      <Card key={ri.id} bordered padding="$3" backgroundColor="$color1" gap="$2" borderColor={!selection?.lotId ? '$red8' : '$color4'}>
                        <XStack justifyContent="space-between" alignItems="center">
                          <YStack flex={1}>
                            <SizableText fontWeight="700" color={!selection?.lotId ? '$red10' : '$color12'}>{ing?.name || 'Ingrediente'}</SizableText>
                            <SizableText size="$1" color="$color10">Richiesto: {ri.quantity} {ri.unit}</SizableText>
                          </YStack>
                          {(selectedLot?.expiryDate || selectedLot?.expiry_date) && (
                            <Badge theme={new Date(selectedLot.expiryDate || selectedLot.expiry_date) < new Date() ? 'destructive' : 'success'} size="$1">
                              Scade: {new Date(selectedLot.expiryDate || selectedLot.expiry_date).toLocaleDateString()}
                            </Badge>
                          )}
                        </XStack>

                        <XStack gap="$2">
                          <YStack flex={2}>
                            {activeLots.length === 0 ? (
                              <YStack backgroundColor="$red2" padding="$2" borderRadius="$3" borderWidth={1} borderColor="$red4">
                                <SizableText size="$1" color="$red10" fontWeight="700">
                                  Nessun lotto attivo in magazzino!
                                </SizableText>
                              </YStack>
                            ) : (
                              <BlinkSelect 
                                items={lotOptions}
                                value={selection?.lotId || ''}
                                onValueChange={(val) => {
                                  setLotSelections(prev => ({
                                    ...prev,
                                    [ingId]: {
                                      ...prev[ingId],
                                      lotId: val,
                                    }
                                  }));
                                }}
                                placeholder="Scegli lotto fisico..."
                              />
                            )}
                          </YStack>
                          <YStack flex={1}>
                            <Input 
                              size="$3"
                              keyboardType="numeric"
                              value={selection?.quantity?.toString() || '0'}
                              onChangeText={(t) => {
                                const qty = parseFloat(t) || 0;
                                const price = ingredientPrices[ingId] || 0;
                                const rowCost = calculateRowCost(qty, ri.unit, price, 'kg');
                                setLotSelections(prev => ({
                                  ...prev,
                                  [ingId]: {
                                    ...prev[ingId],
                                    quantity: qty,
                                    rowCost: rowCost,
                                  }
                                }));
                              }}
                            />
                          </YStack>
                        </XStack>
                      </Card>
                    );
                  })}
                </YStack>
              )}
            </YStack>
          )}

          {form.recipeId && !isRecipeLoading && Object.keys(lotSelections).length > 0 && (
            <YStack gap="$3">
              <XStack gap="$2" alignItems="center">
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#4A90D9', alignItems: 'center', justifyContent: 'center' }}>
                  <SizableText size="$1" fontWeight="800" color="white">3</SizableText>
                </View>
                <SizableText size="$4" fontWeight="800">Riepilogo Costi</SizableText>
              </XStack>

              <Card bordered padding="$4" backgroundColor="$color1" gap="$3">
                <YStack gap="$2">
                  <XStack paddingVertical="$1" borderBottomWidth={1} borderColor="$color4">
                    <SizableText flex={2} size="$1" color="$color10" fontWeight="700">Ingrediente</SizableText>
                    <SizableText flex={1} size="$1" color="$color10" fontWeight="700" textAlign="right">Quantità</SizableText>
                    <SizableText flex={1} size="$1" color="$color10" fontWeight="700" textAlign="right">Costo</SizableText>
                  </XStack>
                  {Object.entries(lotSelections).map(([ingId, sel]) => (
                    <XStack key={ingId} paddingVertical="$1">
                      <SizableText flex={2} size="$2" numberOfLines={1}>{sel.nameSnapshot}</SizableText>
                      <SizableText flex={1} size="$2" textAlign="right">{sel.quantity} {sel.unit}</SizableText>
                      <SizableText flex={1} size="$2" textAlign="right">€ {(sel.rowCost || 0).toFixed(2)}</SizableText>
                    </XStack>
                  ))}
                </YStack>

                <Separator />

                <YStack gap="$1">
                  <XStack justifyContent="space-between">
                    <SizableText size="$2" color="$color11">Totale Ingredienti</SizableText>
                    <SizableText size="$2" fontWeight="600">€ {totalIngredientsCost.toFixed(2)}</SizableText>
                  </XStack>
                  <XStack justifyContent="space-between">
                    <SizableText size="$2" color="$color11">Totale Overhead</SizableText>
                    <SizableText size="$2" fontWeight="600">€ {overheads.total.toFixed(2)}</SizableText>
                  </XStack>
                  <XStack justifyContent="space-between" marginTop="$2" paddingVertical="$2" backgroundColor="$orange2" borderRadius="$2" paddingHorizontal="$2">
                    <SizableText size="$3" fontWeight="800" color="$orange10">COSTO TOTALE CONGELATO</SizableText>
                    <SizableText size="$3" fontWeight="800" color="$orange10">€ {totalBatchCost.toFixed(2)}</SizableText>
                  </XStack>
                </YStack>

                <XStack gap="$2" alignItems="center" backgroundColor="$red2" padding="$3" borderRadius="$4">
                  <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
                  <SizableText size="$1" color="$red11" flex={1}>
                    Questi costi saranno congelati e non potranno essere modificati dopo il salvataggio.
                  </SizableText>
                </XStack>
              </Card>
            </YStack>
          )}

          {validationErrors.length > 0 && form.recipeId && !isRecipeLoading && (
            <Card bordered padding="$3" backgroundColor="$red2" borderColor="$red8">
              <YStack gap="$2">
                <XStack gap="$2" alignItems="center">
                  <Ionicons name="warning-outline" size={18} color="#ef4444" />
                  <SizableText fontWeight="700" color="$red10">Parametri mancanti:</SizableText>
                </XStack>
                {validationErrors.map((err, i) => (
                  <SizableText key={i} size="$2" color="$red11">• {err}</SizableText>
                ))}
              </YStack>
            </Card>
          )}

          {!form.recipeId ? (
            <YStack padding="$4" alignItems="center" backgroundColor="$color2" borderRadius="$4" borderWidth={1} borderColor="$color4" gap="$2">
              <Ionicons name="information-circle-outline" size={24} color="#94a3b8" />
              <SizableText color="$color11" textAlign="center">
                Seleziona un prodotto e una ricetta per procedere con la creazione del lotto.
              </SizableText>
            </YStack>
          ) : (
            <Button 
              size="$5" 
              theme={canSave ? "active" : "alt"} 
              marginTop="$4" 
              onPress={handleSave}
              disabled={!canSave}
              opacity={canSave ? 1 : 0.5}
              icon={createBatch.isPending ? <Spinner color="white" /> : <Save size={20} color="white" />}
            >
              {createBatch.isPending ? 'Salvataggio...' : 'Crea Lotto di Produzione'}
            </Button>
          )}

        </YStack>
      </ScrollView>
      <LoadingOverlay visible={createBatch.isPending || isRecipeLoading} message={isRecipeLoading ? "Caricamento ricetta..." : "Creazione batch..."} />
    </SafeArea>
  );
}

const FormLabel = ({ children, required }: { children: string; required?: boolean }) => (
  <XStack gap="$1">
    <SizableText size="$3" color="$color11" fontWeight="600">{children}</SizableText>
    {required && <SizableText color="$red9">*</SizableText>}
  </XStack>
);