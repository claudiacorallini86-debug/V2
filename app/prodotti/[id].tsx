import React, { useState, useEffect } from 'react';
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
  Label,
} from '@blinkdotnew/mobile-ui';
import { InlineSelect } from '@/components/common/InlineSelect';
import { AppHeader } from '@/components/AppHeader';
import { useProducts } from '@/hooks/useProducts';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Save, ChevronLeft, Package, Euro, Info } from '@blinkdotnew/mobile-ui';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { PRODUCT_TYPES, SALE_UNITS } from '@/constants/products';
import { Alert, Platform } from 'react-native';

export default function ProdottoDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const isNew = !id || id === 'nuovo';
  
  const { products, createProduct, updateProduct, deleteProduct, isLoading: isProductsLoading } = useProducts();
  const toastContext = useBlinkToast();

  const showToast = (title: string, options: any) => {
    if (!toastContext) return;
    const ctx: any = toastContext;
    const toastFn = typeof ctx === 'function' ? ctx : (ctx?.toast || ctx?.show);
    if (typeof toastFn === 'function') {
      toastFn(title, options);
    }
  };
  
  const product = products.find(p => p.id === id);

  const [form, setForm] = useState({
    name: '',
    type: PRODUCT_TYPES[0].value,
    saleUnit: SALE_UNITS[0].value,
    salePrice: '',
    note: '',
  });
  const [hasInitialized, setHasInitialized] = useState(false);

  const isValid = form.name.trim().length > 0;

  const isDirty = React.useMemo(() => {
    if (!product || isNew) return false;
    return (
      form.name.trim() !== (product.name || '').trim() ||
      form.type !== (product.type || PRODUCT_TYPES[0].value) ||
      form.saleUnit !== (product.saleUnit || SALE_UNITS[0].value) ||
      form.salePrice !== (product.salePrice?.toString() || '') ||
      form.note.trim() !== (product.note || '').trim()
    );
  }, [form, product, isNew]);

  useEffect(() => {
    if (product && !isNew && !hasInitialized) {
      setForm({
        name: product.name,
        type: product.type,
        saleUnit: product.saleUnit,
        salePrice: product.salePrice?.toString() || '',
        note: product.note || '',
      });
      setHasInitialized(true);
    }
  }, [product, isNew, hasInitialized]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Errore', 'Inserisci il nome del prodotto.');
      return;
    }

    const data = {
      name: form.name.trim(),
      type: form.type,
      saleUnit: form.saleUnit,
      salePrice: form.salePrice ? parseFloat(form.salePrice) : undefined,
      note: form.note.trim(),
    };

    try {
      if (isNew) {
        await createProduct.mutateAsync(data);
        showToast('Creato', { message: 'Prodotto creato con successo.', variant: 'success' });
      } else {
        await updateProduct.mutateAsync({ id: id as string, ...data });
        showToast('Aggiornato', { message: 'Prodotto aggiornato con successo.', variant: 'success' });
      }
      router.back();
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Errore durante il salvataggio.');
    }
  };

  const handleDelete = async () => {
    if (!product || isNew) return;

    const confirmDelete = () => {
      deleteProduct.mutate(product.id, {
        onSuccess: () => {
          showToast('Eliminato', { message: 'Prodotto rimosso correttamente.', variant: 'success' });
          router.back();
        },
        onError: (err: any) => {
          Alert.alert('Errore', err.message || 'Impossibile eliminare il prodotto.');
        }
      });
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Sei sicuro di voler eliminare ${product.name}? Questa azione è irreversibile.`)) confirmDelete();
    } else {
      Alert.alert(
        'Conferma eliminazione', 
        `Sei sicuro di voler eliminare ${product.name}? Questa azione è irreversibile.`, 
        [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Elimina', style: 'destructive', onPress: confirmDelete }
        ]
      );
    }
  };

  if (!isNew && isProductsLoading && !product) {
    return <LoadingOverlay visible message="Caricamento..." />;
  }

  return (
    <SafeArea>
      <AppHeader 
        title={isNew ? "Nuovo Prodotto" : "Modifica Prodotto"} 
        variant="back" 
        onBack={() => router.back()} 
        rightSlot={
          <Button 
            size="$3" 
            theme="active" 
            icon={<Save size={18} />} 
            onPress={handleSave}
            disabled={createProduct.isPending || updateProduct.isPending || (isNew ? !isValid : !isDirty)}
            opacity={(isNew ? !isValid : !isDirty) ? 0.5 : 1}
          >
            Salva
          </Button>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack padding="$4" gap="$4">
          <YStack gap="$2">
            <FormLabel required>Nome Prodotto</FormLabel>
            <Input 
              value={form.name} 
              onChangeText={(t) => setForm({ ...form, name: t })} 
              placeholder="es. Gelato Pistacchio" 
            />
          </YStack>

          <XStack gap="$3">
            <YStack flex={1} gap="$2">
              <FormLabel>Tipo Prodotto</FormLabel>
              <InlineSelect 
                items={PRODUCT_TYPES} 
                value={form.type} 
                onValueChange={(v) => setForm({ ...form, type: v })} 
              />
            </YStack>
            <YStack flex={1} gap="$2">
              <FormLabel>Unità Vendita</FormLabel>
              <InlineSelect 
                items={SALE_UNITS} 
                value={form.saleUnit} 
                onValueChange={(v) => setForm({ ...form, saleUnit: v })} 
              />
            </YStack>
          </XStack>

          <YStack gap="$2">
            <FormLabel>Prezzo Vendita (€)</FormLabel>
            <XStack gap="$2" alignItems="center">
              <Euro size={18} color="$color9" />
              <Input
                flex={1}
                keyboardType="numeric"
                value={form.salePrice}
                onChangeText={(t) => setForm({ ...form, salePrice: t })}
                placeholder="es. 22.00"
              />
            </XStack>
          </YStack>

          <YStack gap="$2">
            <FormLabel>Note</FormLabel>
            <Input 
              multiline 
              numberOfLines={3} 
              value={form.note} 
              onChangeText={(t) => setForm({ ...form, note: t })} 
              placeholder="Note aggiuntive..." 
              height={100}
              verticalAlign="top"
            />
          </YStack>

          {!isNew && product?.latestRecipeId && (
            <YStack padding="$3" backgroundColor="$green2" borderRadius="$4" borderWidth={1} borderColor="$green5" gap="$2">
              <XStack gap="$2" alignItems="center">
                <Package size={16} color="$green10" />
                <SizableText fontWeight="700" color="$green10">Ricetta Collegata</SizableText>
              </XStack>
              <SizableText size="$2" color="$green11">
                Questo prodotto è collegato a una ricetta attiva. Gli allergeni vengono estratti automaticamente.
              </SizableText>
              <Button size="$2" variant="outlined" theme="active" onPress={() => router.push(`/ricette/${product.latestRecipeId}`)}>
                Vai alla Ricetta
              </Button>
            </YStack>
          )}

          {!isNew && (
            <Button
              size="$5"
              variant="outlined"
              theme="destructive"
              marginTop="$4"
              onPress={handleDelete}
              disabled={deleteProduct.isPending}
            >
              Elimina Prodotto
            </Button>
          )}
        </YStack>
      </ScrollView>
      <LoadingOverlay visible={createProduct.isPending || updateProduct.isPending || deleteProduct.isPending} />
    </SafeArea>
  );
}

const FormLabel = ({ children, required }: { children: string; required?: boolean }) => (
  <XStack gap="$1">
    <SizableText size="$3" color="$color11" fontWeight="600">{children}</SizableText>
    {required && <SizableText color="$red9">*</SizableText>}
  </XStack>
);
