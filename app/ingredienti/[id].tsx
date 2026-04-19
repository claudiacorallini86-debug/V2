import React, { useState, useEffect } from 'react'
import {
  YStack,
  XStack,
  SizableText,
  Button,
  Input,
  SafeArea,
  ScrollView,
  useBlinkToast,
  Separator,
  Paragraph,
  Spinner,
  AlertCircle,
} from '@blinkdotnew/mobile-ui'
import { InlineSelect } from '@/components/common/InlineSelect'
import { AppHeader } from '@/components/AppHeader'
import { useIngredients } from '@/hooks/useIngredients'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Save, Trash2, AlertTriangle, CheckCircle2, ChevronLeft, Info, TrendingUp } from '@blinkdotnew/mobile-ui'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import { PriceHistoryTab } from '@/components/ingredienti/PriceHistoryTab'
import {
  INGREDIENT_CATEGORIES,
  CONSERVATION_TYPES,
  MEASUREMENT_UNITS,
  EU_ALLERGENS,
} from '@/constants/ingredients'
import { Alert, Platform } from 'react-native'
import { useAuth } from '@/context/AuthContext'

export default function ModificaIngredienteScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const { updateIngredient, ingredients, deleteIngredient, isLoading: isIngredientsLoading } = useIngredients()
  const toastContext = useBlinkToast()
  
  const showToast = (title: string, options: any) => {
    if (!toastContext) return
    const toastFn = typeof toastContext === 'function' ? toastContext : (toastContext.show || toastContext.show)
    if (typeof toastFn === 'function') {
      toastFn(title, options)
    } else {
      console.warn('Toast function not found in context', toastContext)
      if (Platform.OS !== 'web') {
        import('react-native').then(({ Alert }) => {
          Alert.alert(title, options.message || '')
        })
      } else {
        alert(`${title}: ${options.message || ''}`)
      }
    }
  }

  const [activeTab, setActiveTab] = useState<'details' | 'prices'>('details')
  const ingredient = ingredients.find((i) => i.id === id)

  const [form, setForm] = useState({
    name: '',
    category: INGREDIENT_CATEGORIES[0].value,
    measurementUnit: MEASUREMENT_UNITS[0].value,
    conservation: CONSERVATION_TYPES[0].value,
    defaultSupplier: '',
    minimumStock: '0',
    note: '',
  })
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)

  const isDirty = React.useMemo(() => {
    if (!ingredient) return false;
    
    const currentAllergens = [...selectedAllergens].sort().join(',');
    const originalAllergens = (ingredient.allergens || '')
      .split(',')
      .map(a => a.trim())
      .filter(Boolean)
      .sort()
      .join(',');
    
    return (
      form.name.trim() !== (ingredient.name || '').trim() ||
      form.category !== (ingredient.category || INGREDIENT_CATEGORIES[0].value) ||
      form.measurementUnit !== (ingredient.measurementUnit || MEASUREMENT_UNITS[0].value) ||
      form.conservation !== (ingredient.conservation || CONSERVATION_TYPES[0].value) ||
      form.defaultSupplier.trim() !== (ingredient.defaultSupplier || '').trim() ||
      form.minimumStock !== (ingredient.minimumStock || 0).toString() ||
      form.note.trim() !== (ingredient.note || '').trim() ||
      currentAllergens !== originalAllergens
    );
  }, [form, selectedAllergens, ingredient]);

  useEffect(() => {
    if (ingredient && !hasInitialized) {
      setForm({
        name: ingredient.name || '',
        category: ingredient.category || INGREDIENT_CATEGORIES[0].value,
        measurementUnit: ingredient.measurementUnit || MEASUREMENT_UNITS[0].value,
        conservation: ingredient.conservation || CONSERVATION_TYPES[0].value,
        defaultSupplier: ingredient.defaultSupplier || '',
        minimumStock: (ingredient.minimumStock || 0).toString(),
        note: ingredient.note || '',
      })
      
      const allergens = ingredient.allergens && typeof ingredient.allergens === 'string'
        ? ingredient.allergens.split(',').map(a => a.trim()).filter(Boolean)
        : []
      setSelectedAllergens(allergens)
      setHasInitialized(true)
    }
  }, [ingredient, hasInitialized])

  const toggleAllergen = (allergen: string) => {
    setSelectedAllergens((prev) =>
      prev.includes(allergen)
        ? prev.filter((a) => a !== allergen)
        : [...prev, allergen]
    )
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('Errore', {
        message: 'Il nome dell\'ingrediente è obbligatorio.',
        variant: 'error',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const updateData = {
        id: id as string,
        name: form.name.trim(),
        category: form.category,
        measurementUnit: form.measurementUnit,
        conservation: form.conservation,
        allergens: selectedAllergens.join(', '),
        minimumStock: parseFloat(form.minimumStock) || 0,
        defaultSupplier: form.defaultSupplier.trim(),
        note: form.note.trim(),
      };

      await updateIngredient.mutateAsync(updateData)

      showToast('Aggiornato', {
        message: 'L\'ingrediente è stato aggiornato correttamente.',
        variant: 'success',
      })
      router.back()
    } catch (error: any) {
      console.error('Update ingredient error:', error);
      Alert.alert('Errore di Salvataggio', error.message || 'Impossibile salvare le modifiche. Verifica i dati e riprova.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    const confirmDelete = () => {
      deleteIngredient.mutate(id as string, {
        onSuccess: () => {
          showToast('Eliminato con successo', { variant: 'success' })
          router.back()
        },
        onError: (err: any) => {
          console.error('Delete ingredient error:', err)
          Alert.alert('Errore', err.message || 'Errore durante l\'eliminazione.')
        }
      })
    }

    if (Platform.OS === 'web') {
      if (window.confirm(`Sei sicuro di voler eliminare ${form.name}? Questa azione è irreversibile.`)) {
        confirmDelete()
      }
    } else {
      Alert.alert(
        'Conferma eliminazione',
        `Sei sicuro di voler eliminare ${form.name}? Questa azione è irreversibile.`,
        [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Elimina', style: 'destructive', onPress: confirmDelete }
        ]
      )
    }
  }

  if (!isAdmin) {
    return (
      <SafeArea>
        <AppHeader title="Accesso Negato" variant="back" onBack={() => router.back()} />
        <YStack flex={1} alignItems="center" justifyContent="center" padding="$4" gap="$4">
          <AlertTriangle size={48} color="$orange9" />
          <SizableText textAlign="center" size="$5" fontWeight="700">Accesso Limitato</SizableText>
          <SizableText textAlign="center" color="$color10">Non hai i permessi necessari per modificare gli ingredienti.</SizableText>
          <Button theme="active" onPress={() => router.back()}>Torna alla lista</Button>
        </YStack>
      </SafeArea>
    )
  }

  if (isIngredientsLoading && !ingredient) {
    return (
      <SafeArea>
        <AppHeader title="Caricamento..." variant="back" onBack={() => router.back()} />
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner size="large" color="$color10" />
        </YStack>
      </SafeArea>
    )
  }

  if (!ingredient && !isSubmitting) {
    return (
      <SafeArea>
        <AppHeader title="Ingrediente non trovato" variant="back" onBack={() => router.back()} />
        <YStack flex={1} alignItems="center" justifyContent="center" padding="$4" gap="$4">
          <AlertCircle size={48} color="$red9" />
          <SizableText size="$5" fontWeight="700">Ops! Errore</SizableText>
          <SizableText textAlign="center" color="$color10">L'ingrediente richiesto non è stato trovato o è stato eliminato.</SizableText>
          <Button marginTop="$4" onPress={() => router.back()}>Torna indietro</Button>
        </YStack>
      </SafeArea>
    )
  }

  return (
    <SafeArea>
      <LoadingOverlay 
        visible={updateIngredient.isPending || deleteIngredient.isPending || isSubmitting} 
        message={deleteIngredient.isPending ? "Eliminazione in corso..." : "Salvataggio in corso..."} 
      />
      <AppHeader
        title={activeTab === 'details' ? "Modifica Ingrediente" : "Storico Prezzi"}
        variant="back"
        onBack={() => router.back()}
        rightSlot={
          activeTab === 'details' ? (
            <Button
              size="$3"
              theme="active"
              icon={isSubmitting ? null : <Save size={18} />}
              onPress={handleSave}
              disabled={isSubmitting || !isDirty}
              opacity={isDirty ? 1 : 0.5}
            >
              {isSubmitting ? 'Salvataggio...' : 'Salva'}
            </Button>
          ) : null
        }
      />

      <YStack backgroundColor="$background" borderBottomWidth={1} borderBottomColor="$color4">
        <XStack paddingHorizontal="$4" paddingTop="$2" paddingBottom="$2" gap="$2">
          <Button 
            flex={1}
            size="$3"
            backgroundColor={activeTab === 'details' ? '$color5' : 'transparent'}
            borderColor={activeTab === 'details' ? '$color8' : '$color4'}
            borderWidth={1}
            onPress={() => setActiveTab('details')}
            icon={<Info size={16} color={activeTab === 'details' ? '$color12' : '$color10'} />}
          >
            <SizableText color={activeTab === 'details' ? '$color12' : '$color10'} fontWeight={activeTab === 'details' ? '700' : '400'}>
              Dettagli
            </SizableText>
          </Button>
          <Button 
            flex={1}
            size="$3"
            backgroundColor={activeTab === 'prices' ? '$color5' : 'transparent'}
            borderColor={activeTab === 'prices' ? '$color8' : '$color4'}
            borderWidth={1}
            onPress={() => setActiveTab('prices')}
            icon={<TrendingUp size={16} color={activeTab === 'prices' ? '$color12' : '$color10'} />}
          >
            <SizableText color={activeTab === 'prices' ? '$color12' : '$color10'} fontWeight={activeTab === 'prices' ? '700' : '400'}>
              Storico Prezzi
            </SizableText>
          </Button>
        </XStack>
      </YStack>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        <YStack padding="$4" gap="$4" flex={1}>
          {activeTab === 'details' ? (
            <>
              <YStack gap="$2">
                <FormLabel required>Nome Ingrediente</FormLabel>
                <Input
                  value={form.name}
                  onChangeText={(text) => setForm({ ...form, name: text })}
                  placeholder="es. Latte Intero"
                />
              </YStack>

              <XStack gap="$3">
                <YStack flex={1} gap="$2">
                  <FormLabel>Categoria</FormLabel>
                  <InlineSelect
                    items={INGREDIENT_CATEGORIES}
                    value={form.category}
                    onValueChange={(val) => setForm({ ...form, category: val })}
                  />
                </YStack>
                <YStack flex={1} gap="$2">
                  <FormLabel>Unità di Misura</FormLabel>
                  <InlineSelect
                    items={MEASUREMENT_UNITS}
                    value={form.measurementUnit}
                    onValueChange={(val) => setForm({ ...form, measurementUnit: val })}
                  />
                </YStack>
              </XStack>

              <XStack gap="$3">
                <YStack flex={1} gap="$2">
                  <FormLabel>Conservazione</FormLabel>
                  <InlineSelect
                    items={CONSERVATION_TYPES}
                    value={form.conservation}
                    onValueChange={(val) => setForm({ ...form, conservation: val })}
                  />
                </YStack>
                <YStack flex={1} gap="$2">
                  <FormLabel>Scorta Minima</FormLabel>
                  <Input
                    keyboardType="numeric"
                    value={form.minimumStock}
                    onChangeText={(text) => setForm({ ...form, minimumStock: text })}
                    placeholder="0"
                  />
                </YStack>
              </XStack>

              <YStack gap="$2">
                <FormLabel>Fornitore di Default</FormLabel>
                <Input
                  value={form.defaultSupplier}
                  onChangeText={(text) => setForm({ ...form, defaultSupplier: text })}
                  placeholder="es. Centrale del Latte"
                />
              </YStack>

              <Separator />

              <YStack gap="$3">
                <FormLabel>Allergeni (UE)</FormLabel>
                <Paragraph size="$2" color="$color9" marginBottom="$2">
                  Seleziona gli allergeni presenti in questo ingrediente.
                </Paragraph>
                <XStack flexWrap="wrap" gap="$2">
                  {EU_ALLERGENS.map((allergen) => {
                    const isSelected = selectedAllergens.includes(allergen)
                    return (
                      <Button
                        key={allergen}
                        size="$2"
                        theme={isSelected ? 'active' : 'alt'}
                        variant={'outlined'}
                        onPress={() => toggleAllergen(allergen)}
                        icon={isSelected ? <CheckCircle2 size={14} /> : null}
                      >
                        {allergen}
                      </Button>
                    )
                  })}
                </XStack>
              </YStack>

              <Separator />

              <YStack gap="$2">
                <FormLabel>Note</FormLabel>
                <Input
                  multiline
                  numberOfLines={4}
                  value={form.note}
                  onChangeText={(text) => setForm({ ...form, note: text })}
                  placeholder="Aggiungi note aggiuntive..."
                  height={100}
                  textAlignVertical="top"
                />
              </YStack>

              <YStack gap="$3" marginTop="$4">
                <Button
                  size="$5"
                  theme="active"
                  icon={isSubmitting ? null : <Save size={20} />}
                  onPress={handleSave}
                  disabled={isSubmitting || !isDirty}
                  opacity={isDirty ? 1 : 0.5}
                >
                  {isSubmitting ? 'Salvataggio in corso...' : 'Salva Modifiche'}
                </Button>
                
                <Button
                  size="$5"
                  variant="outlined"
                  theme="destructive"
                  icon={<Trash2 size={20} />}
                  onPress={handleDelete}
                  disabled={isSubmitting}
                >
                  Elimina Ingrediente
                </Button>
              </YStack>
            </>
          ) : (
            <PriceHistoryTab 
              ingredientId={id as string} 
              defaultSupplier={ingredient?.defaultSupplier || ''} 
            />
          )}

          <YStack height={40} />
        </YStack>
      </ScrollView>
    </SafeArea>
  )
}

const FormLabel = ({ children, required }: { children: string; required?: boolean }) => (
  <XStack gap="$1">
    <SizableText size="$3" color="$color11" fontWeight="600">
      {children}
    </SizableText>
    {required && <SizableText color="$red9">*</SizableText>}
  </XStack>
)