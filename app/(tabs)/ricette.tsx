import React, { useState, useMemo } from 'react';
import {
  YStack,
  XStack,
  H3,
  Button,
  SearchBar,
  EmptyState,
} from '@blinkdotnew/mobile-ui';
import { useRecipes } from '@/hooks/useRecipes';
import { useAuth } from '@/context/AuthContext';
import { Plus, Search, ChefHat } from '@blinkdotnew/mobile-ui';
import { FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { RecipeCard } from '@/components/RecipeCard';

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

      {isLoading ? (
        <LoadingOverlay visible />
      ) : (
        <FlatList
          data={filteredRecipes}
          renderItem={({ item }) => <RecipeCard recipe={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon={<Search size={48} color="$color8" />}
              title="Nessuna ricetta trovata"
              description="Inizia a creare una nuova ricetta per i tuoi prodotti."
            />
          }
        />
      )}
    </YStack>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    paddingBottom: 80,
  }
});