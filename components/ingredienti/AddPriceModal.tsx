import React, { useState } from 'react'
import { 
  YStack, 
  XStack, 
  SizableText, 
  Button, 
  Input, 
  useBlinkToast,
  Separator,
  Theme,
  Dialog,
  Adapt,
  Sheet,
  ScrollView,
} from '@blinkdotnew/mobile-ui'
import { InlineSelect } from '@/components/common/InlineSelect'
import { Save, X, Calendar as CalendarIcon, Upload, Package, FileText } from '@blinkdotnew/mobile-ui'
import { Modal, Platform, StyleSheet, TouchableOpacity } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { blink } from '@/lib/blink'
import { useIngredientPrices } from '@/hooks/useIngredients'
import { LoadingOverlay } from '@/components/LoadingOverlay'

interface Props {
  ingredientId: string
  defaultSupplier: string
  isOpen: boolean
  onClose: () => void
}

const PRICE_UNITS = [
  { label: 'kg', value: 'kg' },
  { label: 'g', value: 'g' },
  { label: 'L', value: 'L' },
  { label: 'mL', value: 'mL' },
  { label: 'pz', value: 'pz' },
]

export function AddPriceModal({ ingredientId, defaultSupplier, isOpen, onClose }: Props) {
  const { addPrice } = useIngredientPrices(ingredientId)
  const toastContext = useBlinkToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Safe toast helper
  const showToast = (title: string, options: any) => {
    if (!toastContext) {
      console.warn('Toast context is null')
      return
    }
    
    // Support multiple toast shapes: function, { toast: fn }, { show: fn }
    const ctx: any = toastContext
    const toastFn = typeof ctx === 'function'
      ? ctx
      : (ctx?.toast || ctx?.show)

    if (typeof toastFn === 'function') {
      toastFn(title, options)
    } else {
      console.warn('Toast function not found in context', toastContext)
      // Fallback to Alert
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
    date: new Date().toISOString().split('T')[0],
    supplier: defaultSupplier || '',
    pricePerUnit: '',
    priceUnit: 'kg',
    docReferral: '',
    note: '',
  })
  
  const [invoiceImage, setInvoiceImage] = useState<string | null>(null)

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    })

    if (!result.canceled) {
      setInvoiceImage(result.assets[0].uri)
    }
  }

  const handleSave = async () => {
    if (!form.pricePerUnit || isNaN(parseFloat(form.pricePerUnit))) {
      showToast('Errore', { message: 'Inserisci un prezzo valido.', variant: 'error' })
      return
    }

    setIsSubmitting(true)
    try {
      let invoiceUrl = ''
      
      if (invoiceImage) {
        const fileExtension = invoiceImage.split('.').pop() || 'jpg'
        const fileName = `invoice_${Date.now()}.${fileExtension}`
        const fileResponse = await fetch(invoiceImage)
        const fileBlob = await fileResponse.blob()
        const uploadResult: any = await blink.storage.upload(fileBlob, fileName)
        invoiceUrl = uploadResult.url || uploadResult.publicUrl || ''
      }

      const newPrice = {
        ingredientId,
        date: form.date,
        supplier: form.supplier,
        pricePerUnit: parseFloat(form.pricePerUnit),
        priceUnit: form.priceUnit,
        docReferral: form.docReferral,
        invoiceUrl,
        note: form.note,
      }

      // Use the mutation directly
      await addPrice.mutateAsync(newPrice)
      
      showToast('Successo', { message: 'Prezzo aggiunto correttamente.', variant: 'success' })
      resetForm()
      onClose()
    } catch (error: any) {
      console.error('Error in handleSave:', error)
      const errorMsg = error.message || 'Errore durante il salvataggio.'
      showToast('Errore', { message: errorMsg, variant: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Format price for preview (Safe for all platforms)
  const formatPricePreview = (price: number) => {
    const val = Number(price)
    if (isNaN(val)) return '0,00 €'
    
    // Manual Italian formatting
    const fixed = val.toFixed(5)
    const [int, dec] = fixed.split('.')
    
    // Clean up decimals: at least 2, up to 5
    let finalDec = dec.replace(/0+$/, '')
    if (finalDec.length < 2) finalDec = dec.substring(0, 2)
    
    const formattedInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    return `${formattedInt},${finalDec} €`
  }

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      supplier: defaultSupplier || '',
      pricePerUnit: '',
      priceUnit: 'kg',
      docReferral: '',
      note: '',
    })
    setInvoiceImage(null)
  }

  return (
    <Modal transparent visible={isOpen} animationType="slide" onRequestClose={onClose}>
      <YStack flex={1} backgroundColor="rgba(0,0,0,0.5)" justifyContent="flex-end">
        <Theme name="dark">
          <YStack 
            backgroundColor="$background" 
            borderTopLeftRadius="$6" 
            borderTopRightRadius="$6" 
            padding="$4" 
            gap="$4"
            height="85%"
          >
            <XStack justifyContent="space-between" alignItems="center">
              <SizableText size="$6" fontWeight="800">Aggiungi Prezzo</SizableText>
              <Button circular size="$3" chromeless icon={<X size={20} />} onPress={onClose} />
            </XStack>
            
            <Separator />
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <YStack gap="$4" paddingBottom="$8">
                <YStack gap="$2">
                  <SizableText size="$3" fontWeight="600">Data Rilevazione</SizableText>
                  <Input 
                    value={form.date} 
                    onChangeText={(val) => setForm({ ...form, date: val })}
                    placeholder="YYYY-MM-DD"
                  />
                </YStack>

                <YStack gap="$2">
                  <SizableText size="$3" fontWeight="600">Fornitore</SizableText>
                  <Input 
                    value={form.supplier} 
                    onChangeText={(val) => setForm({ ...form, supplier: val })}
                    placeholder="Nome fornitore"
                  />
                </YStack>

                <XStack gap="$3">
                  <YStack flex={2} gap="$2">
                    <SizableText size="$3" fontWeight="600">Prezzo per Unità (€)</SizableText>
                    <Input 
                      keyboardType="numeric"
                      value={form.pricePerUnit} 
                      onChangeText={(val) => setForm({ ...form, pricePerUnit: val })}
                      placeholder="es. 3.2500"
                    />
                  </YStack>
                  <YStack flex={1} gap="$2">
                    <SizableText size="$3" fontWeight="600">Unità</SizableText>
                    <InlineSelect 
                      items={PRICE_UNITS}
                      value={form.priceUnit}
                      onValueChange={(val) => setForm({ ...form, priceUnit: val })}
                    />
                  </YStack>
                </XStack>

                {form.pricePerUnit && !isNaN(parseFloat(form.pricePerUnit)) && (form.priceUnit === 'kg' || form.priceUnit === 'L') && (
                  <YStack backgroundColor="$color2" padding="$3" borderRadius="$4" borderWidth={1} borderColor="$color5">
                    <SizableText size="$2" color="$color11">
                      Anteprima conversione:
                    </SizableText>
                    <SizableText size="$3" fontWeight="700" color="$green10">
                      {formatPricePreview(parseFloat(form.pricePerUnit))}/{form.priceUnit} = {formatPricePreview(parseFloat(form.pricePerUnit) / 1000)}/{form.priceUnit === 'kg' ? 'g' : 'mL'}
                    </SizableText>
                  </YStack>
                )}

                <YStack gap="$2">
                  <SizableText size="$3" fontWeight="600">Riferimento Documento</SizableText>
                  <Input 
                    value={form.docReferral} 
                    onChangeText={(val) => setForm({ ...form, docReferral: val })}
                    placeholder="es. Fattura n. 123"
                  />
                </YStack>

                <YStack gap="$2">
                  <SizableText size="$3" fontWeight="600">Note</SizableText>
                  <Input 
                    multiline
                    numberOfLines={3}
                    value={form.note} 
                    onChangeText={(val) => setForm({ ...form, note: val })}
                    placeholder="Eventuali annotazioni"
                    height={80}
                    textAlignVertical="top"
                  />
                </YStack>

                <YStack gap="$2">
                  <SizableText size="$3" fontWeight="600">Immagine Fattura (opzionale)</SizableText>
                  <XStack gap="$3" alignItems="center">
                    <Button 
                      icon={<Upload size={18} />} 
                      variant="outlined"
                      onPress={handlePickImage}
                    >
                      {invoiceImage ? 'Cambia Immagine' : 'Carica Foto'}
                    </Button>
                    {invoiceImage && (
                      <SizableText size="$2" color="$color10" numberOfLines={1}>Selezionata</SizableText>
                    )}
                  </XStack>
                </YStack>

                <Button 
                  size="$5" 
                  theme="active" 
                  icon={isSubmitting ? null : <Save size={20} />}
                  onPress={handleSave}
                  disabled={isSubmitting}
                  marginTop="$4"
                >
                  {isSubmitting ? 'Salvataggio...' : 'Aggiungi Prezzo'}
                </Button>
              </YStack>
            </ScrollView>
          </YStack>
        </Theme>
      </YStack>
      <LoadingOverlay visible={isSubmitting} message="Caricamento immagine e salvataggio..." />
    </Modal>
  )
}