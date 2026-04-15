import React, { useState } from 'react'
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
  Paragraph,
} from '@blinkdotnew/mobile-ui'
import { AppHeader } from '@/components/AppHeader'
import { useIngredients } from '@/hooks/useIngredients'
import { useRouter } from 'expo-router'
import { Save, CheckCircle2 } from '@blinkdotnew/mobile-ui'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import {
  INGREDIENT_CATEGORIES,
  CONSERVATION_TYPES,
  MEASUREMENT_UNITS,
  EU_ALLERGENS,
} from '@/constants/ingredients'
import { Alert, Platform } from 'react-native'

export default function NuovoIngredienteScreen() {
  const router = useRouter()
  const { createIngredient, ingredients } = useIngredients()
  const toastContext = useBlinkToast()
  
  const showToast = (title: string, options: any) => {
    if (!toastContext) return
    const toastFn = typeof toastContext === 'function' ? toastContext : (toastContext.toast || toastContext.show)
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

  const isValid = form.name.trim().length > 0;

  const toggleAllergen = (allergen: string) => {
    setSelectedAllergens((prev) =>
      prev.includes(allergen)
        ? prev.filter((a) => a !== allergen)
        : [...prev, allergen]
    )
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Errore', 'Il nome dell\'ingrediente è obbligatorio.')
      return
    }

    // Verifica univocità nome
    const exists = ingredients.some(
      (ing) => ing.name.toLowerCase() === form.name.trim().toLowerCase()
    )
    if (exists) {
      Alert.alert('Errore', 'Esiste già un ingrediente con questo nome.')
      return
    }

    setIsSubmitting(true)
    try {
      await createIngredient.mutateAsync({
        name: form.name.trim(),
        category: form.category,
        measurementUnit: form.measurementUnit,
        conservation: form.conservation,
        allergens: selectedAllergens.join(', '),
        minimumStock: parseFloat(form.minimumStock) || 0,
        defaultSupplier: form.defaultSupplier.trim(),
        note: form.note.trim(),
      })

      showToast('Salvataggio con successo', {
        message: 'L\'ingrediente è stato creato correttamente.',
        variant: 'success',
      })
      router.back()
    } catch (error) {
      Alert.alert('Errore', 'Impossibile salvare l\'ingrediente. Riprova.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SafeArea>
      <LoadingOverlay visible={createIngredient.isPending} message="Salvataggio in corso..." />
      <AppHeader
        title="Nuovo Ingrediente"
        variant="back"
        onBack={() => router.back()}
        rightSlot={
          <Button
            size="$3"
            theme="active"
            icon={isSubmitting ? null : <Save size={18} />}
            onPress={handleSave}
            disabled={isSubmitting || !isValid}
            opacity={isValid ? 1 : 0.5}
          >
            {isSubmitting ? 'Salvataggio...' : 'Salva'}
          </Button>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack padding="$4" gap="$4">
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
              <BlinkSelect
                items={INGREDIENT_CATEGORIES}
                value={form.category}
                onValueChange={(val) => setForm({ ...form, category: val })}
              />
            </YStack>
            <YStack flex={1} gap="$2">
              <FormLabel>Unità di Misura</FormLabel>
              <BlinkSelect
                items={MEASUREMENT_UNITS}
                value={form.measurementUnit}
                onValueChange={(val) => setForm({ ...form, measurementUnit: val })}
              />
            </YStack>
          </XStack>

          <XStack gap="$3">
            <YStack flex={1} gap="$2">
              <FormLabel>Conservazione</FormLabel>
              <BlinkSelect
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
                    variant={isSelected ? 'solid' : 'outline'}
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

          <Button
            size="$5"
            theme="active"
            marginTop="$4"
            icon={isSubmitting ? null : <Save size={20} />}
            onPress={handleSave}
            disabled={isSubmitting || !isValid}
            opacity={isValid ? 1 : 0.5}
          >
            {isSubmitting ? 'Salvataggio in corso...' : 'Salva Ingrediente'}
          </Button>

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