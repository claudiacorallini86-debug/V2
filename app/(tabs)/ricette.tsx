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
  Card,
  Theme,
  Separator,
  Circle,
} from '@blinkdotnew/mobile-ui';
import { useRecipes, Recipe } from '@/hooks/useRecipes';
import { useAuth } from '@/context/AuthContext';
import { Plus, Search, ChefHat, Euro, TrendingUp, ChevronRight, Clock } from '@blinkdotnew/mobile-ui';
import { FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LoadingOverlay } from '@/components/LoadingOverlay';

export default function RicetteScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { recipes, isLoading } = useRecipes();

  const [search, setSearch] = useState('');

  const filteredRecipes = useMemo(() => {
    return (recipes || []).filter((r) => {
      return r.name.toLowerCase().includes(search.toLowerCase());
    });
  }, [recipes, search]);

  const renderRecipe = ({ item: r }: { item: Recipe }) => {
    return (
      <Card 
        bordered 
        padding="$4" 
        marginBottom="$3" 
        onPress={() => router.push(`/ricette/${r.id}`)}
        pressStyle={{ scale: 0.98 }}
        backgroundColor="$color1"
      >
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack gap="$1" flex={1}>
            <XStack gap="$2" alignItems="center">
              <SizableText size="$5" fontWeight="800" color="$color12">{r.name}</SizableText>
              <Badge size="$1" theme="active" borderRadius="$full">v{r.version}</Badge>
            </XStack>
            
            <XStack gap="$4" marginTop="$2">
              <YStack>
                <SizableText size="$1" color="$color9" fontWeight="600">RESA BATCH</SizableText>
                <SizableText size="$3" fontWeight="700">{r.batchYield} {r.unitYield}</SizableText>
              </YStack>
              
              <YStack>
                <SizableText size="$1" color="$color9" fontWeight="600">COSTO UNITA</SizableText>
                <SizableText size="$3" fontWeight="700" color="$orange10">
                  {r.costPerUnit.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                </SizableText>
              </YStack>
            </XStack>

            <XStack gap="$4" marginTop="$2">
              <YStack>
                <SizableText size="$1" color="$color9" fontWeight="600">COSTO BATCH</SizableText>
                <SizableText size="$2" fontWeight="600">
                  {r.totalBatchCost.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                </SizableText>
              </YStack>
              <YStack>
                <SizableText size="$1" color="$color9" fontWeight="600">CREATA IL</SizableText>
                <XStack gap="$1" alignItems="center">
                  <Clock size={10} color="$color9" />
                  <SizableText size="$1" color="$color10">{new Date(r.createdAt).toLocaleDateString('it-IT')}</SizableText>
                </XStack>
              </YStack>
            </XStack>

            {r.allergens && r.allergens.length > 0 && (
              <YStack gap="$1" marginTop="$2">
                <SizableText size="$1" color="$orange9" fontWeight="800">ALLERGENI</SizableText>
                <XStack flexWrap="wrap" gap="$1">
                  {r.allergens.map((a, i) => (
                    <Badge key={i} size="$1" variant="outline" borderColor="$orange5" backgroundColor="$orange2">
                      <SizableText size="$1" color="$orange10" fontWeight="700">{a}</SizableText>
                    </Badge>
                  ))}
                </XStack>
              </YStack>
            )}
          </YStack>

          <ChevronRight size={20} color="$color8" alignSelf="center" />
        </XStack>
      </Card>
    );
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      <YStack padding="$4" gap="$4" backgroundColor="$background" borderBottomWidth={1} borderBottomColor="$color4" elevation={2} zIndex={10}>
        <XStack justifyContent="space-between" alignItems="center">
          <XStack gap="$2" alignItems="center">
            <ChefHat size={24} color="$color9" />
            <H3 fontWeight="800">Ricette</H3>
          </XStack>
          {isAdmin && (
            <Button size="$3" theme="active" icon={<Plus size={18} />} onPress={() => router.push('/ricette/nuova')}>
              Nuova
            </Button>
          )}
        </XStack>

        <SearchBar value={search} onChangeText={setSearch} placeholder="Cerca ricette..." />
      </YStack>

      <FlatList
        data={filteredRecipes}
        renderItem={renderRecipe}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState 
              icon={<Search size={48} color="$color8" />} 
              title="Nessuna ricetta trovata" 
              description="Inizia a creare una nuova ricetta per i tuoi prodotti." 
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