import React from 'react';
import { YStack, XStack, SizableText, Badge, Card } from '@blinkdotnew/mobile-ui';
import { useRouter } from 'expo-router';
import { Recipe } from '@/hooks/useRecipes';
import { ChevronRight, Clock } from '@blinkdotnew/mobile-ui';

interface RecipeCardProps {
  recipe: Recipe;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const router = useRouter();

  return (
    <Card
      bordered
      padding="$4"
      marginBottom="$3"
      onPress={() => router.push(`/ricette/${recipe.id}`)}
      pressStyle={{ scale: 0.98 }}
      backgroundColor="$color1"
    >
      <XStack justifyContent="space-between" alignItems="flex-start">
        <YStack gap="$1" flex={1}>
          <XStack gap="$2" alignItems="center">
            <SizableText size="$5" fontWeight="800" color="$color12">
              {recipe.name}
            </SizableText>
            <Badge variant="warning">
              <XStack gap="$1" alignItems="center">
                <ChevronRight size={12} />
                <SizableText size="$1">v{recipe.version}</SizableText>
              </XStack>
            </Badge>
          </XStack>

          <XStack gap="$4" marginTop="$2">
            <YStack>
              <SizableText size="$1" color="$color9" fontWeight="600">
                RESA BATCH
              </SizableText>
              <SizableText size="$3" fontWeight="700">
                {recipe.batchYield} {recipe.unitYield}
              </SizableText>
            </YStack>

            <YStack>
              <SizableText size="$1" color="$color9" fontWeight="600">
                COSTO UNITA
              </SizableText>
              <SizableText size="$3" fontWeight="700" color="$orange10">
                {recipe.costPerUnit.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
              </SizableText>
            </YStack>
          </XStack>

          <XStack gap="$4" marginTop="$2">
            <YStack>
              <SizableText size="$1" color="$color9" fontWeight="600">
                COSTO BATCH
              </SizableText>
              <SizableText size="$2" fontWeight="600">
                {recipe.totalBatchCost.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
              </SizableText>
            </YStack>
            <YStack>
              <SizableText size="$1" color="$color9" fontWeight="600">
                CREATA IL
              </SizableText>
              <XStack gap="$1" alignItems="center">
                <Clock size={10} color="$color9" />
                <SizableText size="$1" color="$color10">
                  {new Date(recipe.createdAt).toLocaleDateString('it-IT')}
                </SizableText>
              </XStack>
            </YStack>
          </XStack>

          {recipe.allergens && recipe.allergens.length > 0 && (
            <YStack gap="$1" marginTop="$2">
              <SizableText size="$1" color="$orange9" fontWeight="800">
                ALLERGENI
              </SizableText>
              <XStack flexWrap="wrap" gap="$1">
                {recipe.allergens.map((allergen, index) => (
                  <Badge key={index} variant="warning">
                    <SizableText size="$1" color="$orange10" fontWeight="700">
                      {allergen}
                    </SizableText>
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
}
