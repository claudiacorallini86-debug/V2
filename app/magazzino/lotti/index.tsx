import React, { useState, useMemo } from 'react';
import {
  YStack,
  XStack,
  SizableText,
  Button,
  SafeArea,
  ScrollView,
  Card,
  Badge,
  Theme,
  Separator,
  Input,
  useBlinkToast,
} from '@blinkdotnew/mobile-ui';
import {InlineSelect} from '@/components/common/InlineSelect';
import { AppHeader } from '@/components/AppHeader';
import { useIngredients, IngredientLot } from '@/hooks/useIngredients';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FlatList, StyleSheet, Platform, View } from 'react-native';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { formatDate } from '@/lib/date';

const STATUS_OPTIONS = [
  { label: 'Tutti gli stati', value: 'all' },
  { label: 'Attivo', value: 'active' },
  { label: 'Esaurito', value: 'exhausted' },
  { label: 'Scaduto', value: 'expired' },
  { label: 'Ritirato', value: 'recalled' },
];

const CONSERVATION_OPTIONS = [
  { label: 'Tutte le cons.', value: 'all' },
  { label: 'Frigo', value: 'frigo' },
  { label: 'Freezer', value: 'freezer' },
  { label: 'Secco', value: 'secco' },
];

export default function LottiIngredientiScreen() {
  const router = useRouter();
  const { lots, ingredients, isLoading, lotStockMap } = useIngredients();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [consFilter, setConservationFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const filteredLots = useMemo(() => {
    return lots.filter(l => {
      const matchesSearch = 
        (l.lotCode || '').toLowerCase().includes(search.toLowerCase()) || 
        (l.ingredientName || '').toLowerCase().includes(search.toLowerCase()) ||
        (l.supplier || '').toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
      const matchesCons = consFilter === 'all' || l.conservation === consFilter;
      
      return matchesSearch && matchesStatus && matchesCons;
    });
  }, [lots, search, statusFilter, consFilter]);

  const getStatusBadge = (lot: IngredientLot) => {
    const now = new Date();
    const expiry = lot.expiryDate ? new Date(lot.expiryDate) : null;
    
    if (lot.status === 'active' && expiry && expiry < now) {
      return <Badge variant='warning'>SCADUTO</Badge>;
    }

    switch (lot.status) {
      case 'active': return <Badge variant="success">ATTIVO</Badge>;
      case 'exhausted': return <Badge variant="info">ESAURITO</Badge>;
      case 'expired': return <Badge variant="error">SCADUTO</Badge>;
      case 'recalled': return <Badge variant="warning">RITIRATO</Badge>;
      default: return null;
    }
  };

  const getExpiryWarning = (lot: IngredientLot) => {
    if (lot.status !== 'active' || !lot.expiryDate) return null;
    
    const now = new Date();
    const expiry = new Date(lot.expiryDate);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return <Badge variant="error">SCADUTO</Badge>;
    }
    if (diffDays <= 3) {
      return <Badge variant="warning">SCADE TRA {diffDays} GG</Badge>;
    }
    return null;
  };

  const renderLot = ({ item: l }: { item: IngredientLot }) => {
    const stock = lotStockMap[l.id] ?? l.initialQuantity;
    const ingredient = ingredients.find(ing => ing.id === l.ingredientId);
    const unit = ingredient?.measurementUnit || 'kg';

    return (
      <Card 
        bordered 
        padding="$3" 
        marginBottom="$3" 
        backgroundColor="$color1"
        onPress={() => router.push(`/magazzino/lotti/${l.id}`)}
      >
        <YStack gap="$2">
          <XStack justifyContent="space-between" alignItems="center">
            <YStack>
              <SizableText size="$2" color="$color10" fontWeight="600">LOTTO</SizableText>
              <SizableText size="$4" fontWeight="800" color="$active">{l.lotCode}</SizableText>
            </YStack>
            <XStack gap="$2">
              {getExpiryWarning(l)}
              {getStatusBadge(l)}
            </XStack>
          </XStack>

          <Separator />

          <YStack gap="$1">
            <SizableText size="$2" color="$color9" fontWeight="600">INGREDIENTE</SizableText>
            <SizableText size="$4" fontWeight="700">{l.ingredientName}</SizableText>
          </YStack>

          <XStack gap="$4">
            <YStack flex={1}>
              <SizableText size="$1" color="$color9" fontWeight="600">FORNITORE</SizableText>
              <SizableText size="$2" fontWeight="600">{l.supplier}</SizableText>
            </YStack>
            <YStack flex={1}>
              <SizableText size="$1" color="$color9" fontWeight="600">CONSERVAZIONE</SizableText>
              <Badge variant="info">
                {l.conservation}
              </Badge>
            </YStack>
          </XStack>

          <XStack gap="$4">
            <YStack flex={1}>
              <SizableText size="$1" color="$color9" fontWeight="600">CONSEGNA</SizableText>
              <XStack gap="$1" alignItems="center">
                <Ionicons name="calendar-outline" size={12} color="#94a3b8" />
                <SizableText size="$2">{formatDate(l.deliveryDate)}</SizableText>
              </XStack>
            </YStack>
            <YStack flex={1}>
              <SizableText size="$1" color="$color9" fontWeight="600">SCADENZA</SizableText>
              <XStack gap="$1" alignItems="center">
                <Ionicons 
                  name="calendar-outline" 
                  size={12} 
                  color={l.status === 'expired' ? '#ef4444' : '#94a3b8'} 
                />
                <SizableText size="$2" color={l.status === 'expired' ? '$red10' : '$color12'}>
                  {l.expiryDate || null}
                </SizableText>
              </XStack>
            </YStack>
          </XStack>

          <XStack gap="$4" marginTop="$1" padding="$2" backgroundColor="$color2" borderRadius="$3">
            <YStack flex={1}>
              <SizableText size="$1" color="$color9" fontWeight="600">INIZIALE</SizableText>
              <SizableText size="$3" fontWeight="700">{l.initialQuantity} {unit}</SizableText>
            </YStack>
            <YStack flex={1}>
              <SizableText size="$1" color="$color9" fontWeight="600">GIACENZA</SizableText>
              <SizableText size="$3" fontWeight="800" color={stock <= 0 ? '$color10' : '$green10'}>
                {stock} {unit}
              </SizableText>
            </YStack>
          </XStack>
        </YStack>
      </Card>
    );
  };

  return (
    <SafeArea>
      <AppHeader 
        title="Gestione Lotti" 
        variant="back" 
        onBack={() => router.back()} 
        rightSlot={
          <Button size="$3" theme="active" icon={<Ionicons name="add" size={18} color="white" />} onPress={() => router.push('/magazzino/lotti/nuovo')}>
            Nuovo Lotto
          </Button>
        }
      />

      <YStack padding="$4" gap="$3" backgroundColor="$background" borderBottomWidth={1} borderBottomColor="$color4">
        <XStack gap="$2">
          <YStack flex={1}>
            <Input 
              value={search} 
              onChangeText={setSearch} 
              placeholder="Cerca per codice o ingrediente..." 
              backgroundColor="$color1"
            />
          </YStack>
          <Button 
            size="$4" 
            icon={<Ionicons name="filter" size={18} color={showFilters ? 'white' : '#94a3b8'} />} 
            theme={showFilters ? 'active' : 'alt'} 
            onPress={() => setShowFilters(!showFilters)} 
          />
        </XStack>

        {showFilters && (
          <YStack gap="$3" padding="$3" backgroundColor="$color2" borderRadius="$4">
            <XStack gap="$2">
              <YStack flex={1} gap="$1">
                <SizableText size="$1" fontWeight="700">Stato</SizableText>
                <InlineSelect 
                  items={STATUS_OPTIONS}
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                />
              </YStack>
              <YStack flex={1} gap="$1">
                <SizableText size="$1" fontWeight="700">Conservazione</SizableText>
                <InlineSelect 
                  items={CONSERVATION_OPTIONS}
                  value={consFilter}
                  onValueChange={setConservationFilter}
                />
              </YStack>
            </XStack>
          </YStack>
        )}
      </YStack>

      <FlatList
        data={filteredLots}
        renderItem={renderLot}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !isLoading ? (
            <YStack padding="$10" alignItems="center" gap="$2">
              <Ionicons name="archive-outline" size={48} color="#94a3b8" />
              <SizableText color="$color10" textAlign="center">Nessun lotto trovato.</SizableText>
            </YStack>
          ) : null
        }
      />
      
      <LoadingOverlay visible={isLoading} />
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    paddingBottom: 100,
  }
});