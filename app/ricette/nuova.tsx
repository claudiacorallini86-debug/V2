import React, { useState, useMemo, useEffect } from 'react';
import {
  YStack,
  XStack,
  SizableText,
  Button,
  Input,
  SafeArea,
  ScrollView,
  BlinkSelect,
  useBlinkToast,
  Separator,
  Card,
  Theme,
  Label,
  Circle,
  Badge,
  Slider,
  Spinner,
} from '@blinkdotnew/mobile-ui';
import { AppHeader } from '@/components/AppHeader';
import { useRecipes, RecipeIngredient } from '@/hooks/useRecipes';
import { useProducts } from '@/hooks/useProducts';
import { useIngredients, Ingredient } from '@/hooks/useIngredients';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Save, Plus, Trash2, ChefHat, Euro, Info, Package, AlertCircle, AlertTriangle } from '@blinkdotnew/mobile-ui';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { RECIPE_UNITS, INGREDIENT_UNITS } from '@/constants/products';
import { Alert, Platform, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { blink } from '@/lib/blink';
import { useAuth } from '@/context/AuthContext';

export default function RecipeBuilderScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isNew = !id || id === 'nuova';
  
  const { recipes, createRecipe, deleteRecipe, isLoading: isRecipesLoading } = useRecipes();
  const { products } = useProducts();
  const { ingredients } = useIngredients();
  const { toast } = useBlinkToast();

  // Fetch all latest prices for live calculation
  const { data: allPrices = [] } = useQuery({
    queryKey: ['all-ingredient-prices'],
    queryFn: async () => {
      return await blink.db.amelieIngredientPrice.list({
        orderBy: { date: 'desc' },
        limit: 500 // Increase limit to ensure we get enough history
      }) as any[];
    }
  });

  const latestPricesMap = useMemo(() => {
    const map: Record<string, any> = {};
    // Ensure we sort by date and then by creation to get the absolute latest
    const sorted = [...allPrices].sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt || 0).getTime();
      const dateB = new Date(b.date || b.createdAt || 0).getTime();
      if (dateA !== dateB) return dateB - dateA;
      const createA = new Date(a.createdAt || a.created_at || 0).getTime();
      const createB = new Date(b.createdAt || b.created_at || 0).getTime();
      return createB - createA;
    });

    sorted.forEach(p => {
      const ingId = p.ingredient_id || p.ingredientId;
      if (ingId && !map[ingId]) {
        map[ingId] = p;
      }
    });
    return map;
  }, [allPrices]);
  
  const recipeToClone = recipes.find(r => r.id === id);

  const [form, setForm] = useState({
    name: '',
    productId: '',
    batchYield: '1',
    unitYield: RECIPE_UNITS[0].value,
    overheadWastePct: 0,
    overheadEnergyPct: 0,
    overheadLabourPct: 0,
    note: '',
  });

  const [recipeIngredients, setRecipeIngredients] = useState<Omit<RecipeIngredient, 'id' | 'recipeId'>[]>([]);

  useEffect(() => {
    if (recipeToClone && !isNew) {
      setForm({
        name: `${recipeToClone.name || ''} (Modificato)`,
        productId: recipeToClone.productId || '',
        batchYield: (recipeToClone.batchYield ?? '1').toString(),
        unitYield: recipeToClone.unitYield || RECIPE_UNITS[0].value,
        overheadWastePct: Number(recipeToClone.overheadWastePct || 0),
        overheadEnergyPct: Number(recipeToClone.overheadEnergyPct || 0),
        overheadLabourPct: Number(recipeToClone.overheadLabourPct || 0),
        note: recipeToClone.note || '',
      });
      setRecipeIngredients((recipeToClone.ingredients || []).map(ri => ({
        ingredientId: ri.ingredientId || '',
        quantity: Number(ri.quantity || 0),
        unit: ri.unit || INGREDIENT_UNITS[0].value,
        isPackaging: !!ri.isPackaging,
      })));
    } else if (isNew) {
      setRecipeIngredients([]);
    }
  }, [recipeToClone, isNew]);

  const addIngredientRow = () => {
    setRecipeIngredients([...recipeIngredients, {
      ingredientId: '',
      quantity: 0,
      unit: INGREDIENT_UNITS[0].value,
      isPackaging: false,
    }]);
  };

  const removeIngredientRow = (index: number) => {
    const ingName = calculatedData.rows[index]?.name || 'questo ingrediente';
    Alert.alert(
      'Conferma eliminazione',
      `Sei sicuro di voler eliminare ${ingName}? Questa azione è irreversibile.`,
      [
        { text: 'Annulla', style: 'cancel' },
        { 
          text: 'Elimina', 
          style: 'destructive', 
          onPress: () => {
            setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index));
          }
        }
      ]
    );
  };

  const updateIngredientRow = (index: number, data: Partial<Omit<RecipeIngredient, 'id' | 'recipeId'>>) => {
    const newIngredients = [...recipeIngredients];
    newIngredients[index] = { ...newIngredients[index], ...data };
    setRecipeIngredients(newIngredients);
  };

  // Calculations
  const calculatedData = useMemo(() => {
    let totalIngredientsCost = 0;

    const rows = recipeIngredients.map(ri => {
      const ingId = ri.ingredientId;
      const ing = ingredients.find(i => i.id === ingId);
      const priceData = latestPricesMap[ingId];
      
      let rowCost = 0;
      if (priceData) {
        const pVal = Number(priceData.price_per_unit ?? priceData.pricePerUnit ?? 0);
        const pUnit = (priceData.price_unit ?? priceData.priceUnit ?? '').toLowerCase();
        const riUnit = (ri.unit ?? '').toLowerCase();
        const riQty = Number(ri.quantity ?? 0);
        
        // Normalize units for calculation (case-insensitive)
        if ((pUnit === 'kg' || pUnit === 'l') && (riUnit === 'g' || riUnit === 'ml')) {
          rowCost = (riQty / 1000) * pVal;
        } else if ((pUnit === 'g' || pUnit === 'ml') && (riUnit === 'kg' || riUnit === 'l')) {
          rowCost = (riQty * 1000) * pVal;
        } else {
          // Default: assume units match or no simple conversion available
          rowCost = riQty * pVal;
        }
      }

      totalIngredientsCost += rowCost;
      
      return {
        ...ri,
        name: ing?.name || 'Seleziona...',
        allergens: ing?.allergens || '',
        rowCost,
      };
    });

    const totalWaste = totalIngredientsCost * (Number(form.overheadWastePct) / 100);
    const totalEnergy = totalIngredientsCost * (Number(form.overheadEnergyPct) / 100);
    const totalLabour = totalIngredientsCost * (Number(form.overheadLabourPct) / 100);
    const totalOverhead = totalWaste + totalEnergy + totalLabour;
    const totalBatchCost = totalIngredientsCost + totalOverhead;
    const costPerUnit = totalBatchCost / (parseFloat(form.batchYield) || 1);

    const allergenSet = new Set<string>();
    rows.forEach(r => {
      if (r.allergens) {
        r.allergens.split(',').forEach((a: string) => allergenSet.add(a.trim()));
      }
    });

    return {
      rows,
      totalIngredientsCost,
      totalOverhead,
      totalBatchCost,
      costPerUnit,
      allergens: Array.from(allergenSet).filter(Boolean),
    };
  }, [recipeIngredients, ingredients, form, latestPricesMap]);

  const isValid = useMemo(() => {
    return (
      form.name.trim().length > 0 &&
      form.productId.length > 0 &&
      recipeIngredients.length > 0 &&
      recipeIngredients.every(ri => ri.ingredientId && ri.quantity > 0)
    );
  }, [form, recipeIngredients]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Errore', 'Inserisci il nome della ricetta.');
      return;
    }
    if (!form.productId) {
      Alert.alert('Errore', 'Seleziona un prodotto collegato.');
      return;
    }
    if (recipeIngredients.length === 0) {
      Alert.alert('Errore', 'Aggiungi almeno un ingrediente.');
      return;
    }

    try {
      await createRecipe.mutateAsync({
        recipe: {
          name: form.name.trim(),
          productId: form.productId,
          batchYield: parseFloat(form.batchYield) || 1,
          unitYield: form.unitYield,
          overheadWastePct: form.overheadWastePct,
          overheadEnergyPct: form.overheadEnergyPct,
          overheadLabourPct: form.overheadLabourPct,
          note: form.note.trim(),
        } as any,
        ingredients: recipeIngredients,
      });
      toast('Salvata', { message: 'Ricetta salvata con successo.', variant: 'success' });
      router.back();
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Errore durante il salvataggio.');
    }
  };

  const handleDelete = async () => {
    if (!recipeToClone || isNew) return;

    const confirmDelete = () => {
      deleteRecipe.mutate(recipeToClone.id, {
        onSuccess: () => {
          toast('Eliminata', { message: 'Ricetta rimossa correttamente.', variant: 'success' });
          router.back();
        },
        onError: (err: any) => {
          Alert.alert('Errore', err.message || 'Impossibile eliminare la ricetta.');
        }
      });
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Sei sicuro di voler eliminare ${recipeToClone.name}? Questa azione è irreversibile.`)) confirmDelete();
    } else {
      Alert.alert(
        'Conferma eliminazione', 
        `Sei sicuro di voler eliminare ${recipeToClone.name}? Questa azione è irreversibile.`, 
        [
          { text: 'Annulla', style: 'cancel' }, 
          { text: 'Elimina', style: 'destructive', onPress: confirmDelete }
        ]
      );
    }
  };

  return (
    <SafeArea>
      <AppHeader 
        title={isNew ? "Nuovo Recipe Builder" : "Dettaglio Ricetta"} 
        variant="back" 
        onBack={() => router.back()} 
        rightSlot={
          isAdmin ? (
            <Button 
              size="$3" 
              theme="active" 
              icon={<Save size={18} />} 
              onPress={handleSave}
              disabled={createRecipe.isPending || !isValid}
              opacity={isValid ? 1 : 0.5}
            >
              Salva v{recipeToClone ? recipeToClone.version + 1 : 1}
            </Button>
          ) : null
        }
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {isRecipesLoading && !recipeToClone && !isNew ? (
          <YStack padding="$8" alignItems="center">
            <Spinner size="large" color="$active" />
            <SizableText marginTop="$2">Caricamento ricetta...</SizableText>
          </YStack>
        ) : (
          <YStack padding="$4" gap="$4">
          <YStack gap="$2">
            <FormLabel required>Nome Ricetta</FormLabel>
            <Input 
              value={form.name} 
              onChangeText={(t) => setForm({ ...form, name: t })} 
              placeholder="es. Ricetta Base Fiordilatte" 
            />
          </YStack>

          <XStack gap="$3">
            <YStack flex={1} gap="$2">
              <FormLabel required>Prodotto Collegato</FormLabel>
              <BlinkSelect 
                items={[
                  { label: 'Seleziona prodotto...', value: '' },
                  ...products.map(p => ({ label: p.name, value: p.id }))
                ]} 
                value={form.productId} 
                onValueChange={(v) => setForm({ ...form, productId: v })} 
              />
            </YStack>
          </XStack>

          <XStack gap="$3">
            <YStack flex={1} gap="$2">
              <FormLabel required>Resa per Batch</FormLabel>
              <Input 
                keyboardType="numeric" 
                value={form.batchYield} 
                onChangeText={(t) => setForm({ ...form, batchYield: t })} 
                placeholder="es. 5" 
              />
            </YStack>
            <YStack flex={1} gap="$2">
              <FormLabel required>Unità Resa</FormLabel>
              <BlinkSelect 
                items={RECIPE_UNITS} 
                value={form.unitYield} 
                onValueChange={(v) => setForm({ ...form, unitYield: v })} 
              />
            </YStack>
          </XStack>

          <Separator />

          <YStack gap="$3">
            <XStack justifyContent="space-between" alignItems="center">
              <FormLabel required>Ingredienti</FormLabel>
              <Button size="$2" theme="active" icon={<Plus size={14} />} onPress={addIngredientRow}>
                Aggiungi
              </Button>
            </XStack>

            {recipeIngredients.length === 0 ? (
              <YStack padding="$4" alignItems="center" backgroundColor="$color2" borderRadius="$4" borderStyle="dashed" borderWidth={1} borderColor="$color5">
                <ChefHat size={32} color="$color8" />
                <SizableText color="$color10" textAlign="center">Nessun ingrediente aggiunto.</SizableText>
              </YStack>
            ) : (
              <YStack gap="$3">
                {recipeIngredients.map((ri, index) => {
                  const calculatedRow = calculatedData.rows[index];
                  return (
                    <Card key={index} bordered padding="$3" backgroundColor="$color1">
                      <YStack gap="$3">
                        <XStack justifyContent="space-between" alignItems="center">
                          <XStack gap="$2" alignItems="center">
                            <SizableText fontWeight="700">Riga #{index + 1}</SizableText>
                            {calculatedRow?.rowCost > 0 && (
                              <Badge theme="success" size="$1">
                                {calculatedRow.rowCost.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                              </Badge>
                            )}
                          </XStack>
                          <Button 
                            size="$2" 
                            circular 
                            theme="destructive" 
                            icon={<Trash2 size={14} />} 
                            onPress={() => removeIngredientRow(index)} 
                          />
                        </XStack>
                        
                        <YStack gap="$2">
                          <Label size="$2">Ingrediente</Label>
                          <BlinkSelect 
                            items={[
                              { label: 'Seleziona ingrediente...', value: '' },
                              ...ingredients.map(i => ({ label: i.name, value: i.id }))
                            ]}
                            value={ri.ingredientId}
                            onValueChange={(v) => updateIngredientRow(index, { ingredientId: v })}
                          />
                          {ri.ingredientId && (
                            <XStack gap="$2" alignItems="center">
                              {latestPricesMap[ri.ingredientId] ? (
                                <XStack gap="$2" flex={1} justifyContent="space-between" alignItems="center">
                                  <SizableText size="$1" color="$color10">
                                    Rif: {Number(latestPricesMap[ri.ingredientId].price_per_unit || latestPricesMap[ri.ingredientId].pricePerUnit).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })} / {latestPricesMap[ri.ingredientId].price_unit || latestPricesMap[ri.ingredientId].priceUnit}
                                  </SizableText>
                                  {calculatedRow?.rowCost > 0 && (
                                    <SizableText size="$1" fontWeight="700" color="$active">
                                      Tot: {calculatedRow.rowCost.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                                    </SizableText>
                                  )}
                                </XStack>
                              ) : (
                                <XStack gap="$1" alignItems="center">
                                  <AlertCircle size={10} color="$orange10" />
                                  <SizableText size="$1" color="$orange10">Nessun prezzo trovato</SizableText>
                                </XStack>
                              )}
                            </XStack>
                          )}
                        </YStack>

                        <XStack gap="$3">
                          <YStack flex={1} gap="$2">
                            <Label size="$2">Quantità</Label>
                            <Input 
                              keyboardType="numeric" 
                              size="$3"
                              value={(ri.quantity ?? 0).toString()} 
                              onChangeText={(t) => updateIngredientRow(index, { quantity: parseFloat(t) || 0 })} 
                            />
                          </YStack>
                          <YStack flex={1} gap="$2">
                            <Label size="$2">Unità</Label>
                            <BlinkSelect 
                              size="$3"
                              items={INGREDIENT_UNITS}
                              value={ri.unit}
                              onValueChange={(v) => updateIngredientRow(index, { unit: v })}
                            />
                          </YStack>
                        </XStack>

                        <XStack alignItems="center" gap="$2">
                          <TouchableOpacity 
                            onPress={() => updateIngredientRow(index, { isPackaging: !ri.isPackaging })}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                          >
                            <Circle 
                              size={20} 
                              borderWidth={2} 
                              borderColor={ri.isPackaging ? '$active' : '$color8'}
                              backgroundColor={ri.isPackaging ? '$active' : 'transparent'}
                            />
                            <SizableText size="$2">Packaging / Materiale consumo</SizableText>
                          </TouchableOpacity>
                        </XStack>
                      </YStack>
                    </Card>
                  );
                })}
              </YStack>
            )}
          </YStack>

          <Separator />

          <YStack gap="$4">
            <FormLabel>Overhead (Costi Indiretti)</FormLabel>
            
            <OverheadSlider 
              label="Sprechi" 
              value={form.overheadWastePct} 
              onChange={(v) => setForm({ ...form, overheadWastePct: v })} 
            />
            <OverheadSlider 
              label="Energia" 
              value={form.overheadEnergyPct} 
              onChange={(v) => setForm({ ...form, overheadEnergyPct: v })} 
            />
            <OverheadSlider 
              label="Manodopera" 
              value={form.overheadLabourPct} 
              onChange={(v) => setForm({ ...form, overheadLabourPct: v })} 
            />
          </YStack>

          <Separator />

          <YStack gap="$2">
            <FormLabel>Allergeni calcolati</FormLabel>
            {calculatedData.allergens.length === 0 ? (
              <SizableText size="$2" color="$color10">Nessun allergene rilevato dagli ingredienti.</SizableText>
            ) : (
              <XStack flexWrap="wrap" gap="$1.5">
                {calculatedData.allergens.map((a, i) => (
                  <Badge key={i} size="$1" theme="warning">{a}</Badge>
                ))}
              </XStack>
            )}
          </YStack>

          {/* Real-time Food Cost Panel */}
          <Card bordered padding="$4" backgroundColor="$color2" borderColor="$active" borderWidth={1}>
            <YStack gap="$3">
              <XStack justifyContent="space-between" alignItems="center">
                <SizableText fontWeight="800" size="$4" color="$active">FOOD COST ANALYSIS</SizableText>
                <Euro size={20} color="$active" />
              </XStack>
              
              <Separator borderColor="$active" opacity={0.3} />
              
              <CostRow label="Costo Ingredienti (Attuale)" value={calculatedData.totalIngredientsCost} />
              <CostRow label="Overhead Totale" value={calculatedData.totalOverhead} isSub />
              
              <Separator />
              
              <XStack justifyContent="space-between">
                <SizableText fontWeight="800" size="$5">COSTO TOTALE BATCH</SizableText>
                <SizableText fontWeight="800" size="$5" color="$green10">
                  {calculatedData.totalBatchCost.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                </SizableText>
              </XStack>
              
              <YStack gap="$2" marginTop="$2" padding="$3" backgroundColor="$background" borderRadius="$4">
                <XStack justifyContent="space-between" alignItems="center">
                  <YStack>
                    <SizableText size="$3" fontWeight="700" color="$color12">Costo Attuale</SizableText>
                    <SizableText size="$1" color="$color10">Live con prezzi correnti</SizableText>
                  </YStack>
                  <SizableText fontWeight="800" size="$5" color="$active">
                    {calculatedData.costPerUnit.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })} / {form.unitYield}
                  </SizableText>
                </XStack>

                {recipeToClone?.lastBatchCost !== undefined && (
                  <>
                    <Separator opacity={0.5} marginVertical="$1" />
                    <XStack justifyContent="space-between" alignItems="center">
                      <YStack>
                        <SizableText size="$3" fontWeight="700" color="$color11">Costo Ultimo Lotto</SizableText>
                        <SizableText size="$1" color="$color10">
                          Creato il {new Date(recipeToClone.lastBatchDate!).toLocaleDateString('it-IT')}
                        </SizableText>
                      </YStack>
                      <SizableText fontWeight="700" size="$4" color="$color11">
                        {recipeToClone.lastBatchCost.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })} / {recipeToClone.unitYield}
                      </SizableText>
                    </XStack>

                    {(() => {
                      const current = calculatedData.costPerUnit;
                      const last = recipeToClone.lastBatchCost;
                      if (last > 0) {
                        const diffPct = ((current - last) / last) * 100;
                        if (diffPct > 5) {
                          return (
                            <YStack marginTop="$2" padding="$2" backgroundColor="$orange2" borderRadius="$3" borderWidth={1} borderColor="$orange5" gap="$1">
                              <XStack gap="$2" alignItems="center">
                                <AlertTriangle size={14} color="$orange10" />
                                <SizableText size="$2" fontWeight="700" color="$orange10">AUMENTO COSTI RILEVATO</SizableText>
                              </XStack>
                              <SizableText size="$2" color="$orange11">
                                I costi sono aumentati del {diffPct.toFixed(1)}% dall'ultimo lotto prodotto.
                              </SizableText>
                            </YStack>
                          );
                        }
                      }
                      return null;
                    })()}
                  </>
                )}
              </YStack>
            </YStack>
          </Card>

          <YStack gap="$2">
            <FormLabel>Note Ricetta</FormLabel>
            <Input 
              multiline 
              numberOfLines={3} 
              value={form.note} 
              onChangeText={(t) => setForm({ ...form, note: t })} 
              placeholder="Istruzioni di preparazione..." 
              height={100}
              textAlignVertical="top"
            />
          </YStack>

          <YStack gap="$3" marginTop="$4">
            <Button
              size="$5"
              theme="active"
              icon={createRecipe.isPending ? <Spinner color="white" /> : <Save size={20} color="white" />}
              onPress={handleSave}
              disabled={createRecipe.isPending || isRecipesLoading || !isValid}
              opacity={isValid ? 1 : 0.5}
            >
              {isNew ? 'Crea Ricetta' : `Salva v${recipeToClone ? recipeToClone.version + 1 : 1}`}
            </Button>
            
            {!isNew && isAdmin && (
              <Button
                size="$5"
                variant="outline"
                theme="destructive"
                icon={<Trash2 size={20} color="$red10" />}
                onPress={handleDelete}
                disabled={deleteRecipe.isPending}
              >
                Elimina Ricetta
              </Button>
            )}
          </YStack>

          <YStack height={40} />
        </YStack>
        )}
      </ScrollView>
      <LoadingOverlay visible={createRecipe.isPending || deleteRecipe.isPending} message={deleteRecipe.isPending ? "Eliminazione..." : "Salvataggio..."} />
    </SafeArea>
  );
}

const FormLabel = ({ children, required }: { children: string; required?: boolean }) => (
  <XStack gap="$1">
    <SizableText size="$3" color="$color11" fontWeight="600">{children}</SizableText>
    {required && <SizableText color="$red9">*</SizableText>}
  </XStack>
);

const OverheadSlider = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
  <YStack gap="$2">
    <XStack justifyContent="space-between">
      <SizableText size="$2" fontWeight="600">{label}</SizableText>
      <SizableText size="$2" fontWeight="800" color="$active">{value}%</SizableText>
    </XStack>
    <Slider 
      value={[value]} 
      max={50} 
      step={1} 
      onValueChange={(v) => onChange(v[0])} 
    />
  </YStack>
);

const CostRow = ({ label, value, isSub = false }: { label: string; value: number; isSub?: boolean }) => (
  <XStack justifyContent="space-between">
    <SizableText size={isSub ? "$2" : "$3"} color={isSub ? "$color10" : "$color12"} paddingLeft={isSub ? "$2" : 0}>
      {label}
    </SizableText>
    <SizableText size={isSub ? "$2" : "$3"} fontWeight={isSub ? "400" : "600"}>
      {value.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
    </SizableText>
  </XStack>
);