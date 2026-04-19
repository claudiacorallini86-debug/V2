import React, { useState, useMemo } from 'react'
import {
  YStack,
  XStack,
  H3,
  SizableText,
  Button,
  BlinkSelect,
  SearchBar,
  EmptyState,
  Badge,
  useBlinkToast,
  Circle,
  Theme,
  Separator,
  Card,
} from '@blinkdotnew/mobile-ui'
import { useIngredients, Ingredient } from '@/hooks/useIngredients'
import { useAuth } from '@/context/AuthContext'
import { Plus, Search, Filter, Trash2, Leaf, AlertCircle, ChevronRight, Package, Thermometer, Info, Pencil, Download } from '@blinkdotnew/mobile-ui'
import { Alert, Platform, FlatList, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import { exportIngredientsToPDF } from '@/lib/export'
import { Ionicons } from '@expo/vector-icons'
import {
  INGREDIENT_CATEGORIES,
  CONSERVATION_TYPES,
} from '@/constants/ingredients'
import { useSettings } from '@/hooks/useSettings'

const CATEGORIES = [
  { label: 'Tutte le categorie', value: 'all' },
  ...INGREDIENT_CATEGORIES,
]

const CONSERVATION = [
  { label: 'Tutte le conservazioni', value: 'all' },
  ...CONSERVATION_TYPES,
]

export default function IngredientiScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const { ingredients, stockMap, deleteIngredient, isLoading } = useIngredients()
  const toastContext = useBlinkToast()
  const { settings } = useSettings()
  
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

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [conservationFilter, setConservationFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)

  const handleExport = async () => {
    try {
      await exportIngredientsToPDF({
        date: new Date().toLocaleDateString('it-IT'),
        ingredients: filteredIngredients,
        stockMap,
        settings
      });
    } catch (error: any) {
      Alert.alert('Errore', 'Impossibile generare il PDF degli ingredienti.');
    }
  }

  const filteredIngredients = useMemo(() => {
    return (ingredients || []).filter((ing) => {
      const name = ing.name || 'Senza Nome'
      const supplier = ing.defaultSupplier || ''
      const matchesSearch = name.toLowerCase().includes(search.toLowerCase()) ||
        supplier.toLowerCase().includes(search.toLowerCase())
      
      const matchesCategory = categoryFilter === 'all' || ing.category === categoryFilter
      const matchesConservation = conservationFilter === 'all' || ing.conservation === conservationFilter
      
      return matchesSearch && matchesCategory && matchesConservation
    })
  }, [ingredients, search, categoryFilter, conservationFilter])

  const handleDelete = async (id: string, name: string, event?: any) => {
    event?.stopPropagation()
    if (!isAdmin) return

    const confirmDelete = () => {
      deleteIngredient.mutate(id, {
        onSuccess: () => {
          showToast('Eliminato con successo', { 
            message: `${name} è stato rimosso correttamente.`, 
            variant: 'success' 
          })
        },
        onError: (err: any) => {
          Alert.alert('Errore eliminazione', err.message || 'Errore durante l\'eliminazione dell\'ingrediente.')
        }
      })
    }

    if (Platform.OS === 'web') {
      if (window.confirm(`Sei sicuro di voler eliminare ${name}? Questa azione è irreversibile.`)) {
        confirmDelete()
      }
    } else {
      Alert.alert(
        'Conferma eliminazione',
        `Sei sicuro di voler eliminare ${name}? Questa azione è irreversibile.`,
        [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Elimina', style: 'destructive', onPress: confirmDelete }
        ]
      )
    }
  }

  const renderIngredient = ({ item: ing }: { item: Ingredient }) => {
    const stock = stockMap[ing.id] || 0
    const isLow = stock < (ing.minimumStock || 0)
    const allergens = ing.allergens && typeof ing.allergens === 'string' 
      ? ing.allergens.split(',').map(a => a.trim()).filter(Boolean) 
      : []

    // Map conservation to readable Italian label
    const conservationLabel = CONSERVATION_TYPES.find(c => c.value === ing.conservation)?.label || ing.conservation || 'Standard'

    return (
      <Card 
        padding="$0" 
        marginBottom="$4" 
        onPress={() => isAdmin && router.push(`/ingredienti/${ing.id}`)}
        animation="quick"
        hoverStyle={{ scale: 1.01, elevation: 8 }}
        pressStyle={{ scale: 0.98 }}
        backgroundColor="$color1"
        borderRadius="$6"
        elevation={4}
        bordered
        borderColor="$color4"
        overflow="hidden"
      >
        <YStack>
          {/* Header with Gradient/Background hint */}
          <XStack 
            paddingHorizontal="$4" 
            paddingVertical="$3" 
            backgroundColor={isLow ? "$red2" : "$color3"}
            justifyContent="space-between" 
            alignItems="center"
            borderBottomWidth={1}
            borderBottomColor={isLow ? "$red4" : "$color5"}
          >
            <YStack flex={1}>
              <XStack gap="$2" alignItems="center">
                <SizableText size="$5" fontWeight="800" color="$color12" numberOfLines={1}>
                  {ing.name || 'Senza Nome'}
                </SizableText>
                {isLow && (
                  <Badge variant="error">
                    SOTTO SCORTA
                  </Badge>
                )}
              </XStack>
              <SizableText size="$1" color="$color9" fontWeight="700" letterSpacing={1}>
                {ing.category?.toUpperCase() || 'ALTRO'}
              </SizableText>
            </YStack>
            
            <XStack gap="$1">
              {isAdmin && (
                <>
                  <Button
                    size="$3"
                    chromeless
                    circular
                    icon={<Pencil size={16} color="$color10" />}
                    onPress={() => {
                      router.push(`/ingredienti/${ing.id}`)
                    }}
                  />
                  <Button
                    size="$3"
                    chromeless
                    circular
                    theme="destructive"
                    icon={<Trash2 size={16} color="$red8" />}
                    onPress={(event) => {
                      handleDelete(ing.id, ing.name, event)
                    }}
                    disabled={deleteIngredient.isPending}
                  />
                </>
              )}
              <ChevronRight size={18} color="$color8" />
            </XStack>
          </XStack>

          <YStack padding="$4" gap="$3">
            {/* Stock and Conservation Stats */}
            <XStack gap="$4">
              <YStack flex={1} gap="$1" padding="$3" backgroundColor="$color2" borderRadius="$4" borderWidth={1} borderColor="$color4">
                <XStack gap="$1.5" alignItems="center">
                  <Package size={14} color="$color9" />
                  <SizableText size="$2" color="$color9" fontWeight="600">Giacenza</SizableText>
                </XStack>
                <SizableText size="$5" fontWeight="800" color={isLow ? '$red9' : '$color11'}>
                  {stock} <SizableText size="$2" fontWeight="400" color="$color9">{ing.measurementUnit}</SizableText>
                </SizableText>
                {isLow && (
                  <SizableText size="$1" color="$red9" fontWeight="700">Min: {ing.minimumStock}</SizableText>
                )}
              </YStack>

              <YStack flex={1} gap="$1" padding="$3" backgroundColor="$color2" borderRadius="$4" borderWidth={1} borderColor="$color4">
                <XStack gap="$1.5" alignItems="center">
                  <Thermometer size={14} color="$color9" />
                  <SizableText size="$2" color="$color9" fontWeight="600">Conservazione</SizableText>
                </XStack>
                <SizableText size="$4" fontWeight="800" color="$color11">
                  {conservationLabel}
                </SizableText>
                {ing.defaultSupplier && (
                  <SizableText size="$1" color="$color9" numberOfLines={1}>Forn: {ing.defaultSupplier}</SizableText>
                )}
              </YStack>
            </XStack>

            {/* Allergeni section */}
            {allergens.length > 0 && (
              <YStack gap="$2">
                <XStack gap="$1.5" alignItems="center">
                  <Info size={14} color="$orange9" />
                  <SizableText size="$1" color="$orange10" fontWeight="800" letterSpacing={0.5}>ALLERGENI PRESENTI</SizableText>
                </XStack>
                <XStack flexWrap="wrap" gap="$1.5">
                  {allergens.map((a, idx) => (
                    <Badge 
                      key={idx} 
                      variant="default"
                    >
                      <SizableText size="$1" color="$orange10" fontWeight="700">{a}</SizableText>
                    </Badge>
                  ))}
                </XStack>
              </YStack>
            )}
            
            {ing.note ? (
              <YStack gap="$1" marginTop="$1">
                <SizableText size="$1" color="$color8" fontStyle="italic" numberOfLines={2}>
                  "{ing.note}"
                </SizableText>
              </YStack>
            ) : null}
          </YStack>
        </YStack>
      </Card>
    )
  }

  return (
    <YStack flex={1} backgroundColor="$background" height={Platform.OS === 'web' ? '100vh' : '100%'}>
      <LoadingOverlay visible={deleteIngredient.isPending} message="Eliminazione in corso..." />
      {/* Search and Header Section */}
      <YStack 
        padding="$4" 
        gap="$4" 
        backgroundColor="$background" 
        borderBottomWidth={1} 
        borderBottomColor="$color4"
        elevation={2}
        zIndex={10}
      >
        <XStack justifyContent="space-between" alignItems="center">
          <XStack gap="$2" alignItems="center">
            <Leaf size={24} color="$color9" />
            <H3 color="$color12" fontWeight="800">Ingredienti</H3>
          </XStack>
          <XStack gap="$2">
            <Button size="$3" variant="outlined" icon={<Download size={16} color="#94a3b8" />} onPress={handleExport}>
              Export
            </Button>
            {isAdmin && (
              <Button
                size="$3"
                theme="active"
                icon={<Plus size={18} />}
                onPress={() => router.push('/ingredienti/nuovo')}
              >
                Nuovo
              </Button>
            )}
          </XStack>
        </XStack>

        <XStack gap="$2">
          <YStack flex={1}>
            <SearchBar
              value={search}
              onChangeText={setSearch}
              placeholder="Cerca per nome o fornitore..."
            />
          </YStack>
          <Button
            size="$4"
            icon={<Filter size={18} />}
            theme={showFilters ? 'active' : 'alt'}
            onPress={() => setShowFilters(!showFilters)}
          />
        </XStack>

        {showFilters && (
          <YStack gap="$3" padding="$3" backgroundColor="$color2" borderRadius="$4" borderWidth={1} borderColor="$color5">
            <XStack gap="$3" alignItems="center">
              <YStack flex={1}>
                <Label size="$2">Categoria</Label>
                <BlinkSelect
                  items={CATEGORIES}
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                />
              </YStack>
              <YStack flex={1}>
                <Label size="$2">Conservazione</Label>
                <BlinkSelect
                  items={CONSERVATION}
                  value={conservationFilter}
                  onValueChange={setConservationFilter}
                />
              </YStack>
            </XStack>
            <Button size="$2" chromeless alignSelf="flex-end" color="$color10" onPress={() => {
              setCategoryFilter('all')
              setConservationFilter('all')
            }}>
              Reset filtri
            </Button>
          </YStack>
        )}
      </YStack>

      {/* List Section */}
      <YStack flex={1} minHeight={0}>
        {filteredIngredients.length === 0 && !isLoading ? (
          <EmptyState
            icon={<Search size={48} color="$color8" />}
            title="Nessun ingrediente trovato"
            description="Prova a cambiare i filtri di ricerca o aggiungerne uno nuovo."
          />
        ) : (
          <FlatList
            data={filteredIngredients}
            renderItem={renderIngredient}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={Platform.OS === 'web'}
            refreshing={isLoading}
            onRefresh={() => {/* Refetch handled by React Query */}}
            removeClippedSubviews={Platform.OS === 'android'}
          />
        )}
      </YStack>
    </YStack>
  )
}

const Label = ({ children, size }: any) => (
  <SizableText size={size} color="$color10" marginBottom="$1" fontWeight="700">
    {children}
  </SizableText>
)

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
    paddingTop: 16,
    paddingBottom: 80, // Extra padding for FAB or TabBar
  }
})
