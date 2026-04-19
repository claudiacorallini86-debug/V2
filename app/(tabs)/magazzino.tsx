import React, { useState, useMemo } from 'react';
import {
  YStack,
  XStack,
  SizableText,
  Button,
  SafeArea,
  ScrollView,
  Card,
  Theme,
  Separator,
  Input,
} from '@blinkdotnew/mobile-ui';
import { useIngredients, StockMovement, IngredientLot } from '@/hooks/useIngredients';
import { useRouter } from 'expo-router';
import { 
  Package, 
  ArrowUpRight, 
  ArrowDownRight, 
  History, 
  Search, 
  Plus, 
  ChevronRight, 
  AlertTriangle,
  Calendar,
  Filter,
  Info
} from '@blinkdotnew/mobile-ui';
import { Ionicons } from '@expo/vector-icons';
import { FlatList, StyleSheet, Platform, View, TouchableOpacity, Modal, Alert } from 'react-native';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { MovementModal } from '@/components/magazzino/MovementModal';
import { exportStockToPDF } from '@/lib/export';
import { useSettings } from '@/hooks/useSettings';

const Badge = ({ children, theme, size, icon }: any) => (
  <View style={{ 
    backgroundColor: theme === 'destructive' ? '#ef444422' : '#4A90D922',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme === 'destructive' ? '#ef444444' : '#4A90D944',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  }}>
    {icon}
    <SizableText size="$1" color={theme === 'destructive' ? '#ef4444' : '#4A90D9'} fontWeight="700">
      {children}
    </SizableText>
  </View>
);

export default function MagazzinoScreen() {
  const router = useRouter();
  const { ingredients, lots, movements, stockMap, lotStockMap, isLoading } = useIngredients();
  const { settings } = useSettings();
  
  const [activeTab, setActiveTab] = useState<'stock' | 'history'>('stock');
  const [search, setSearch] = useState('');
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [selectedIngredientId, setSelectedIngredientId] = useState<string | null>(null);
  const [movementType, setMovementType] = useState<'in' | 'out'>('in');
  const [expandedIngredients, setExpandedIngredients] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const next = new Set(expandedIngredients);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIngredients(next);
  };

  const filteredIngredients = useMemo(() => {
    return ingredients.filter(i => 
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.category?.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => {
      const stockA = stockMap[a.id] || 0;
      const stockB = stockMap[b.id] || 0;
      const isLowA = stockA < a.minimumStock;
      const isLowB = stockB < b.minimumStock;
      if (isLowA && !isLowB) return -1;
      if (!isLowA && isLowB) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [ingredients, search, stockMap]);

  const filteredMovements = useMemo(() => {
    return movements.filter(m => 
      m.ingredientName?.toLowerCase().includes(search.toLowerCase()) ||
      m.lotCode?.toLowerCase().includes(search.toLowerCase()) ||
      m.referral?.toLowerCase().includes(search.toLowerCase())
    );
  }, [movements, search]);

  const handleMovement = (type: 'in' | 'out', ingredientId?: string) => {
    setMovementType(type);
    setSelectedIngredientId(ingredientId || null);
    setIsMovementModalOpen(true);
  };

  const handleExportStock = async () => {
    try {
      await exportStockToPDF({
        date: new Date().toLocaleDateString('it-IT'),
        ingredients,
        stockMap,
        settings
      });
    } catch (error: any) {
      Alert.alert('Errore', 'Impossibile generare il PDF delle giacenze.');
    }
  };

  const renderIngredient = ({ item: i }: { item: any }) => {
    const stock = stockMap[i.id] || 0;
    const isLowStock = stock < i.minimumStock;
    const isExpanded = expandedIngredients.has(i.id);
    const ingredientLots = lots.filter(l => (l.ingredientId === i.id || l.ingredient_id === i.id) && l.status === 'active');

    return (
      <YStack marginBottom="$3">
        <Card bordered padding="$3" backgroundColor="$color1" onPress={() => toggleExpand(i.id)}>
          <XStack justifyContent="space-between" alignItems="center">
            <YStack gap="$1" flex={1}>
              <SizableText fontWeight="700" size="$4">{i.name}</SizableText>
              <SizableText size="$1" color="$color10" textTransform="uppercase">{i.category}</SizableText>
              
              <XStack gap="$2" alignItems="center" marginTop="$2">
                <SizableText size="$2" color="$color9">Giacenza:</SizableText>
                <SizableText size="$4" fontWeight="800" color={isLowStock ? '$red10' : '$green10'}>
                  {stock} {i.measurementUnit}
                </SizableText>
                {isLowStock && (
                  <Badge theme="destructive" size="$1" icon={<AlertTriangle size={10} />}>SOTTO SCORTA</Badge>
                )}
              </XStack>
            </YStack>

            <XStack gap="$2" alignItems="center">
              <YStack gap="$2">
                <Button 
                  size="$3" 
                  circular 
                  theme="active" 
                  icon={<Plus size={18} />} 
                  onPress={() => handleMovement('in', i.id)} 
                />
                <Button 
                  size="$3" 
                  circular 
                  variant="outlined" 
                  theme="destructive"
                  icon={<ArrowDownRight size={18} />} 
                  onPress={() => handleMovement('out', i.id)} 
                />
              </YStack>
              <YStack marginLeft="$2">
                <Ionicons 
                  name={isExpanded ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#94a3b8" 
                />
              </YStack>
            </XStack>
          </XStack>
        </Card>

        {isExpanded && (
          <YStack 
            backgroundColor="$color2" 
            padding="$3" 
            borderBottomLeftRadius="$4" 
            borderBottomRightRadius="$4"
            borderWidth={1}
            borderColor="$color4"
            borderTopWidth={0}
            gap="$2"
          >
            <SizableText size="$1" fontWeight="700" color="$color10" marginBottom="$1">
              LOTTI ATTIVI ({ingredientLots.length})
            </SizableText>
            
            {ingredientLots.length === 0 ? (
              <SizableText size="$2" color="$color11" fontStyle="italic">
                Nessun lotto attivo trovato. Registra un carico per creare un nuovo lotto.
              </SizableText>
            ) : (
              ingredientLots.map(l => (
                <TouchableOpacity 
                  key={l.id} 
                  onPress={() => router.push(`/magazzino/lotti/${l.id}`)}
                >
                  <XStack 
                    backgroundColor="$color1" 
                    padding="$2" 
                    borderRadius="$3" 
                    justifyContent="space-between" 
                    alignItems="center"
                    borderWidth={1}
                    borderColor="$color4"
                  >
                    <YStack gap="$1">
                      <SizableText size="$2" fontWeight="700" color="$active">{l.lotCode || l.lot_code}</SizableText>
                      <XStack gap="$2" alignItems="center">
                        <Ionicons name="time-outline" size={12} color="#94a3b8" />
                        <SizableText size="$1" color="$color10">
                          Scade: {(l.expiryDate || l.expiry_date) ? new Date(l.expiryDate || l.expiry_date || '').toLocaleDateString() : 'N/D'}
                        </SizableText>
                      </XStack>
                    </YStack>
                    <YStack alignItems="flex-end">
                      <SizableText size="$3" fontWeight="800">
                        {lotStockMap[l.id] ?? 0} {i.measurementUnit}
                      </SizableText>
                      <SizableText size="$1" color="$color9">giacenza</SizableText>
                    </YStack>
                  </XStack>
                </TouchableOpacity>
              ))
            )}
            
            <Button 
              size="$2" 
              variant="outlined" 
              marginTop="$2"
              onPress={() => router.push('/magazzino/lotti')}
            >
              Vedi tutti i lotti
            </Button>
          </YStack>
        )}
      </YStack>
    );
  };

  const renderMovement = ({ item: m }: { item: any }) => {
    const isLoad = m.type === 'in';
    return (
      <Card bordered padding="$3" marginBottom="$2" backgroundColor="$color1">
        <XStack gap="$3" alignItems="center">
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isLoad ? '#dcfce7' : '#fee2e2', alignItems: 'center', justifyContent: 'center' }}>
            {isLoad ? (
              <ArrowUpRight size={18} color="#166534" />
            ) : (
              <ArrowDownRight size={18} color="#991b1b" />
            )}
          </View>
          
          <YStack flex={1}>
            <XStack justifyContent="space-between">
              <SizableText fontWeight="700" size="$3" flexShrink={1} numberOfLines={1}>
                {m.ingredientName}
              </SizableText>
              <SizableText fontWeight="800" color={isLoad ? '$green10' : '$red10'}>
                {isLoad ? '+' : '-'}{m.quantity} {m.unit}
              </SizableText>
            </XStack>
            
            <XStack marginTop="$1">
              <XStack gap="$2" alignItems="center" flexWrap="wrap">
                <Badge size="$1" theme="alt">Lotto: {m.lotCode || m.lot_code || 'N/D'}</Badge>
                {m.referral && (
                  <SizableText
                    size="$1"
                    color="$color9"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={{ flexShrink: 1, minWidth: 0 }}
                  >
                    {m.referral}
                  </SizableText>
                )}
              </XStack>
            </XStack>
            <XStack gap="$2" alignItems="center">
                <Ionicons name="calendar-outline" size={12} color="#94a3b8" />
              <SizableText size="$1" color="$color10">
                {new Date(m.movedAt || m.moved_at).toLocaleDateString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              </SizableText>
              </XStack>
          </YStack>
        </XStack>
      </Card>
    );
  };

  return (
    <YStack flex={1} backgroundColor="$background">
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
            <Package size={24} color="$color9" />
            <SizableText size="$6" fontWeight="800">Magazzino</SizableText>
          </XStack>
          <XStack gap="$2">
            <Button size="$3" variant="outlined" icon={<Ionicons name="document-text-outline" size={16} color="#94a3b8" />} onPress={handleExportStock}>
              Esporta
            </Button>
            <Button size="$3" theme="active" icon={<History size={16} />} onPress={() => router.push('/magazzino/lotti')}>
              Lotti
            </Button>
          </XStack>
        </XStack>

        <XStack gap="$2">
          <Button 
            flex={1} 
            size="$3" 
            backgroundColor={activeTab === 'stock' ? '$color5' : 'transparent'}
            borderColor={activeTab === 'stock' ? '$color8' : '$color4'}
            borderWidth={1}
            onPress={() => setActiveTab('stock')}
          >
            Giacenze
          </Button>
          <Button 
            flex={1} 
            size="$3" 
            backgroundColor={activeTab === 'history' ? '$color5' : 'transparent'}
            borderColor={activeTab === 'history' ? '$color8' : '$color4'}
            borderWidth={1}
            onPress={() => setActiveTab('history')}
          >
            Movimenti
          </Button>
        </XStack>

        <Input 
          value={search} 
          onChangeText={setSearch} 
          placeholder={activeTab === 'stock' ? "Cerca ingredienti..." : "Cerca movimenti..."} 
          backgroundColor="$color1"
        />
      </YStack>

      <FlatList
        data={activeTab === 'stock' ? filteredIngredients : filteredMovements}
        renderItem={activeTab === 'stock' ? renderIngredient : renderMovement}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !isLoading ? (
            <YStack padding="$10" alignItems="center" gap="$2">
              {activeTab === 'stock' ? <Package size={48} color="$color8" /> : <History size={48} color="$color8" />}
              <SizableText color="$color10" fontWeight="700" size="$5">
                {activeTab === 'stock' ? "Nessun ingrediente" : "Nessun movimento"}
              </SizableText>
              <SizableText color="$color10" textAlign="center">
                {activeTab === 'stock' ? "Gli ingredienti appariranno qui con le loro giacenze." : "Lo storico dei carichi e scarichi apparirà qui."}
              </SizableText>
            </YStack>
          ) : null
        }
      />

      <XStack position="absolute" bottom={20} left={20} right={20} gap="$3">
        <Button 
          flex={1} 
          size="$5" 
          theme="active" 
          icon={<Plus size={20} />} 
          onPress={() => handleMovement('in')}
          elevation={5}
        >
          Carico
        </Button>
        <Button 
          flex={1} 
          size="$5" 
          variant="outlined" 
          theme="destructive" 
          icon={<ArrowDownRight size={20} />} 
          onPress={() => handleMovement('out')}
          elevation={5}
        >
          Scarico
        </Button>
      </XStack>

      <MovementModal 
        isOpen={isMovementModalOpen} 
        onClose={() => setIsMovementModalOpen(false)}
        type={movementType}
        initialIngredientId={selectedIngredientId || undefined}
      />

      <LoadingOverlay visible={isLoading} />
    </YStack>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    paddingBottom: 120,
  }
});