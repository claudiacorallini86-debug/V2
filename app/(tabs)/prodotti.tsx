import React, { useState, useMemo } from 'react';
import {
  YStack,
  XStack,
  H3,
  SizableText,
  Button,
  SearchBar,
  EmptyState,
  Badge,
  useBlinkToast,
  Card,
  Theme,
  Separator,
} from '@blinkdotnew/mobile-ui';
import { useProducts, Product } from '@/hooks/useProducts';
import { useAuth } from '@/context/AuthContext';
import { Plus, Search, Filter, Trash2, Package, ChefHat, Info, ChevronRight, Euro, AlertTriangle } from '@blinkdotnew/mobile-ui';
import { Alert, Platform, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { PRODUCT_TYPES } from '@/constants/products';

export default function ProdottiScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { products, deleteProduct, isLoading } = useProducts();
  const { show } = useBlinkToast();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const filteredProducts = useMemo(() => {
    return (products || []).filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === 'all' || p.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [products, search, typeFilter]);

  const handleDelete = async (id: string, name: string) => {
    if (!isAdmin) return;

    const confirmDelete = () => {
      deleteProduct.mutate(id, {
        onSuccess: () => {
          show('Eliminato', { 
            message: `${name} rimosso correttamente.`, 
            variant: 'success' 
          });
        },
        onError: (err: any) => {
          Alert.alert('Errore', err.message || 'Errore durante l\'eliminazione.');
        }
      });
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Sei sicuro di voler eliminare ${name}? Questa azione è irreversibile.`)) confirmDelete();
    } else {
      Alert.alert(
        'Conferma eliminazione', 
        `Sei sicuro di voler eliminare ${name}? Questa azione è irreversibile.`, 
        [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Elimina', style: 'destructive', onPress: confirmDelete }
        ]
      );
    }
  };

  const renderProduct = ({ item: p }: { item: Product }) => {
    const typeLabel = PRODUCT_TYPES.find(t => t.value === p.type)?.label || p.type;
    
    return (
      <Card 
        bordered 
        padding="$4" 
        marginBottom="$3" 
        onPress={() => isAdmin && router.push(`/prodotti/${p.id}`)}
        pressStyle={{ scale: 0.98 }}
        backgroundColor="$color1"
      >
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack gap="$1" flex={1}>
            <XStack gap="$2" alignItems="center">
              <SizableText size="$5" fontWeight="800" color="$color12">{p.name}</SizableText>
              <Badge variant="default">{typeLabel}</Badge>
            </XStack>
            
            <XStack gap="$4" marginTop="$2">
              <YStack>
                <SizableText size="$1" color="$color9" fontWeight="600">UNITA VENDITA</SizableText>
                <SizableText size="$3" fontWeight="700">{p.saleUnit}</SizableText>
              </YStack>
              
              {p.salePrice ? (
                <YStack>
                  <SizableText size="$1" color="$color9" fontWeight="600">PREZZO VENDITA</SizableText>
                  <SizableText size="$3" fontWeight="700" color="$green10">
                    {p.salePrice.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                  </SizableText>
                </YStack>
              ) : null}
            </XStack>

            {p.allergens && p.allergens.length > 0 && (
              <YStack gap="$1" marginTop="$2">
                <SizableText size="$1" color="$orange9" fontWeight="800">ALLERGENI</SizableText>
                <XStack flexWrap="wrap" gap="$1">
                  {p.allergens.map((a, i) => (
                    <Badge key={i} variant="default">
                      <SizableText size="$1" color="$orange10" fontWeight="700">{a}</SizableText>
                    </Badge>
                  ))}
                </XStack>
              </YStack>
            )}

            <XStack gap="$2" alignItems="center" marginTop="$2">
              {p.latestRecipeId ? (
                <Badge variant="success"><XStack gap="$1" alignItems="center"><ChefHat size={12} /><SizableText size="$1">RICETTA COLLEGATA</SizableText></XStack></Badge>
              ) : (
                <Badge variant="warning"><XStack gap="$1" alignItems="center"><AlertTriangle size={12} /><SizableText size="$1">NESSUNA RICETTA</SizableText></XStack></Badge>
              )}
            </XStack>
          </YStack>

          <XStack gap="$1">
            {isAdmin && (
              <Button 
                size="$3" 
                circular 
                chromeless 
                theme="destructive" 
                icon={<Trash2 size={18} />} 
                onPress={() => {
                  handleDelete(p.id, p.name);
                }}
              />
            )}
            <ChevronRight size={20} color="$color8" alignSelf="center" />
          </XStack>
        </XStack>
      </Card>
    );
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      <LoadingOverlay visible={deleteProduct.isPending} />
      
      <YStack padding="$4" gap="$4" backgroundColor="$background" borderBottomWidth={1} borderBottomColor="$color4" elevation={2} zIndex={10}>
        <XStack justifyContent="space-between" alignItems="center">
          <XStack gap="$2" alignItems="center">
            <Package size={24} color="$color9" />
            <H3 fontWeight="800">Prodotti Finiti</H3>
          </XStack>
          {isAdmin && (
            <Button size="$3" theme="active" icon={<Plus size={18} />} onPress={() => router.push('/prodotti/nuovo')}>
              Nuovo
            </Button>
          )}
        </XStack>

        <XStack gap="$2">
          <YStack flex={1}>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Cerca prodotti..." />
          </YStack>
          <Button 
            size="$4" 
            icon={<Filter size={18} />} 
            theme={showFilters ? 'active' : 'alt'} 
            onPress={() => setShowFilters(!showFilters)} 
          />
        </XStack>

        {showFilters && (
          <YStack padding="$3" backgroundColor="$color2" borderRadius="$4" gap="$2">
            <SizableText size="$2" fontWeight="700">Filtra per tipo</SizableText>
            <XStack flexWrap="wrap" gap="$2">
              <Button 
                size="$2" 
                theme={typeFilter === 'all' ? 'active' : 'alt'} 
                onPress={() => setTypeFilter('all')}
              >Tutti</Button>
              {PRODUCT_TYPES.map(t => (
                <Button 
                  key={t.value}
                  size="$2" 
                  theme={typeFilter === t.value ? 'active' : 'alt'} 
                  onPress={() => setTypeFilter(t.value)}
                >{t.label}</Button>
              ))}
            </XStack>
          </YStack>
        )}
      </YStack>

      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState 
              icon={<Search size={48} color="$color8" />} 
              title="Nessun prodotto trovato" 
              description="Prova a cambiare i filtri o aggiungerne uno nuovo." 
            />
          ) : null
        }
      />
    </YStack>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    paddingBottom: 80,
  }
});