import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import { Card, YStack, XStack, SizableText, Separator, Spinner } from '@blinkdotnew/mobile-ui';
import { formatDate } from '@/lib/date';

const ACCENT = '#4A90D9';

const Badge = ({ children, theme, variant }: any) => (
  <View style={{ 
    backgroundColor: theme === 'active' ? '#4A90D922' : theme === 'danger' ? '#ef444422' : '#f59e0b22',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme === 'active' ? '#4A90D944' : theme === 'danger' ? '#ef444444' : '#f59e0b44'
  }}>
    <SizableText size="$1" color={theme === 'active' ? '#4A90D9' : theme === 'danger' ? '#ef4444' : '#f59e0b'} fontWeight="700">
      {children}
    </SizableText>
  </View>
);

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data, isLoading, refetch } = useDashboard();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera';

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <YStack alignItems="center" gap="$4">
          <View style={styles.logoContainer}>
            <Ionicons name="ice-cream" size={48} color={ACCENT} />
          </View>
          <Spinner size="large" />
          <SizableText color="$color10">Caricamento Dashboard...</SizableText>
        </YStack>
      </View>
    );
  }

  const hasAlerts = data.alerts.lowStock.length > 0 || 
                    data.alerts.expiringLots.length > 0 || 
                    data.alerts.openNC.length > 0;

  const maxSale = Math.max(...data.charts.salesByDay.map(d => d.total), 100);

  return (
    <ScrollView 
      style={styles.root} 
      contentContainerStyle={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refetch}
          tintColor={ACCENT}
          colors={[ACCENT]}
        />
      }
    >
      {/* Header / Greeting */}
      <View style={styles.greetingBox}>
        <XStack justifyContent="space-between" alignItems="center">
          <YStack flex={1}>
            <Text style={styles.greeting}>
              {greeting}, {user?.displayName || user?.email?.split('@')[0] || 'Utente'} 👋
            </Text>
            <Text style={styles.greetingSub}>
              {new Date().toLocaleDateString('it-IT', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </YStack>
          <TouchableOpacity onPress={() => router.push('/(tabs)/impostazioni')}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>
        </XStack>
      </View>

      {/* Summary Cards */}
      <View style={styles.statsRow}>
        <StatCard 
          label="Prodotti Attivi" 
          value={data.stats.activeProducts} 
          color="#8b5cf6" 
          icon="ice-cream-outline" 
          onPress={() => router.push('/(tabs)/prodotti')}
        />
        <StatCard 
          label="Sotto Scorta" 
          value={data.stats.lowStockCount} 
          color="#ef4444" 
          icon="alert-circle-outline" 
          badge={data.stats.lowStockCount > 0}
          badgeColor="#ef4444"
          onPress={() => router.push('/(tabs)/magazzino')}
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard 
          label="In Scadenza (7g)" 
          value={data.stats.expiringLotsCount} 
          color="#f59e0b" 
          icon="time-outline" 
          badge={data.stats.expiringLotsCount > 0}
          badgeColor="#f59e0b"
          onPress={() => router.push('/magazzino/lotti')}
        />
        <StatCard 
          label="Batch Mese" 
          value={data.stats.monthlyBatchesCount} 
          color="#10b981" 
          icon="construct-outline" 
          onPress={() => router.push('/(tabs)/produzione')}
        />
      </View>

      {/* Sales Stats & Chart */}
      <YStack gap="$4" marginBottom="$6" marginTop="$2">
        <Text style={styles.sectionTitle}>Andamento Vendite</Text>
        <Card bordered backgroundColor="#16213e" padding="$4">
          <XStack justifyContent="space-between" marginBottom="$4">
            <YStack>
              <SizableText size="$1" color="$color10" fontWeight="700">OGGI</SizableText>
              <SizableText size="$5" color="white" fontWeight="800">€{data.stats.salesToday.toFixed(2)}</SizableText>
            </YStack>
            <YStack alignItems="flex-end">
              <SizableText size="$1" color="$color10" fontWeight="700">QUESTA SETTIMANA</SizableText>
              <SizableText size="$5" color="#10b981" fontWeight="800">€{data.stats.salesThisWeek.toFixed(2)}</SizableText>
            </YStack>
          </XStack>

          <View style={{ height: 180, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <SizableText color="$color10">Grafico vendite (Visualizzazione Web)</SizableText>
            <XStack gap="$2" alignItems="flex-end" height={100} marginTop="$4">
              {data.charts.salesByDay.map((day, i) => {
                const barHeight = (day.total / maxSale) * 100;
                return (
                  <YStack key={day.fullDate} alignItems="center">
                    <View 
                      style={{ 
                        width: 20, 
                        height: barHeight || 2, 
                        backgroundColor: ACCENT, 
                        borderRadius: 4 
                      }} 
                    />
                    <SizableText size="$1" color="$color9" marginTop="$2">{day.date}</SizableText>
                  </YStack>
                );
              })}
            </XStack>
          </View>
        </Card>
      </YStack>

      {/* Alerts Section */}
      {hasAlerts && (
        <YStack gap="$3" marginBottom="$6">
          <Text style={styles.sectionTitle}>Avvisi Critici</Text>
          
          {data.alerts.lowStock.map(ing => (
            <AlertItem 
              key={ing.id}
              type="danger"
              icon="warning-outline"
              title={`Sotto scorta: ${ing.name}`}
              subtitle={`Giacenza: ${ing.currentStock} ${ing.unit} (Min: ${ing.minStock})`}
              onPress={() => router.push('/(tabs)/magazzino')}
            />
          ))}

          {data.alerts.expiringLots.map(lot => (
            <AlertItem 
              key={lot.id}
              type="warning"
              icon="hourglass-outline"
              title={`Lotto in scadenza: ${lot.lotCode}`}
              subtitle={`${lot.ingredientName} scade tra ${lot.daysRemaining} giorni`}
              onPress={() => router.push(`/magazzino/lotti/${lot.id}`)}
            />
          ))}

          {data.alerts.openNC.map(nc => (
            <AlertItem 
              key={nc.id}
              type="danger"
              icon="shield-alert-outline"
              title={`HACCP: Non Conformità aperta`}
              subtitle={nc.description}
              onPress={() => router.push('/(tabs)/haccp')}
            />
          ))}
        </YStack>
      )}

      {/* Stock Summary */}
      <YStack gap="$4" marginBottom="$6">
        <Text style={styles.sectionTitle}>Riepilogo Scorte</Text>
        <Card bordered padding="$0" backgroundColor="#16213e" overflow="hidden">
          {data.alerts.lowStock.length === 0 ? (
            <View style={styles.emptyActivity}>
              <XStack gap="$2" alignItems="center">
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                <Text style={[styles.emptyText, { color: '#10b981' }]}>Tutte le scorte sono in regola</Text>
              </XStack>
            </View>
          ) : (
            data.alerts.lowStock.slice(0, 5).map((ing, idx) => (
              <React.Fragment key={ing.id}>
                <TouchableOpacity 
                  style={styles.activityRow} 
                  onPress={() => router.push('/(tabs)/magazzino')}
                >
                  <View style={[styles.activityIcon, { backgroundColor: '#ef444422' }]}>
                    <Ionicons name="cube-outline" size={18} color="#ef4444" />
                  </View>
                  <YStack flex={1}>
                    <Text style={styles.activityTitle}>{ing.name}</Text>
                    <Text style={styles.activitySub}>
                      Giacenza: {ing.currentStock} {ing.unit}
                    </Text>
                  </YStack>
                  <YStack alignItems="flex-end">
                    <Badge theme="danger">SOTTO SCORTA</Badge>
                    <SizableText size="$1" color="$color10" marginTop="$1">Min: {ing.minStock}</SizableText>
                  </YStack>
                </TouchableOpacity>
                {idx < Math.min(data.alerts.lowStock.length, 5) - 1 && <Separator opacity={0.1} />}
              </React.Fragment>
            ))
          )}
        </Card>
      </YStack>

      {/* Last Activities */}
      <YStack gap="$4" marginBottom="$6">
        <XStack justifyContent="space-between" alignItems="center">
          <Text style={styles.sectionTitle}>Ultime Attività</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/produzione')}>
            <Text style={styles.viewAll}>Vedi tutto</Text>
          </TouchableOpacity>
        </XStack>

        <YStack gap="$3">
          <SizableText size="$2" color="$color10" fontWeight="700" letterSpacing={1}>RECENTI PRODUZIONI</SizableText>
          <Card bordered padding="$0" backgroundColor="#16213e" overflow="hidden">
            {data.activities.recentBatches.length === 0 ? (
              <View style={styles.emptyActivity}>
                <Text style={styles.emptyText}>Nessuna produzione recente</Text>
              </View>
            ) : (
              data.activities.recentBatches.map((batch, idx) => (
                <React.Fragment key={batch.id}>
                  <TouchableOpacity 
                    style={styles.activityRow} 
                    onPress={() => router.push(`/produzione/${batch.id}`)}
                  >
                    <View style={[styles.activityIcon, { backgroundColor: '#10b98122' }]}>
                      <Ionicons name="construct" size={18} color="#10b981" />
                    </View>
                    <YStack flex={1}>
                      <Text style={styles.activityTitle}>{batch.productName}</Text>
                      <Text style={styles.activitySub}>Prodotto {batch.quantityProduced} {batch.unitYield}</Text>
                    </YStack>
                    <Text style={styles.activityTime}>{formatDate(batch.producedAt, true).split(' ')[0]}</Text>
                  </TouchableOpacity>
                  {idx < data.activities.recentBatches.length - 1 && <Separator opacity={0.1} />}
                </React.Fragment>
              ))
            )}
          </Card>
        </YStack>

        <YStack gap="$3">
          <SizableText size="$2" color="$color10" fontWeight="700" letterSpacing={1}>RECENTI TEMPERATURE HACCP</SizableText>
          <Card bordered padding="$0" backgroundColor="#16213e" overflow="hidden">
            {data.activities.recentTemps.length === 0 ? (
              <View style={styles.emptyActivity}>
                <Text style={styles.emptyText}>Nessuna rilevazione HACCP recente</Text>
              </View>
            ) : (
              data.activities.recentTemps.map((temp, idx) => (
                <React.Fragment key={temp.id}>
                  <TouchableOpacity 
                    style={styles.activityRow} 
                    onPress={() => router.push('/(tabs)/haccp')}
                  >
                    <View style={[styles.activityIcon, { backgroundColor: temp.outOfRange ? '#ef444422' : '#4A90D922' }]}>
                      <Ionicons name="thermometer" size={18} color={temp.outOfRange ? '#ef4444' : '#4A90D9'} />
                    </View>
                    <YStack flex={1}>
                      <Text style={styles.activityTitle}>{temp.equipmentName}</Text>
                      <Text style={[styles.activitySub, temp.outOfRange && { color: '#ef4444' }]}>
                        Rilevato {temp.temperature}°C {temp.outOfRange ? '(FUORI RANGE)' : ''}
                      </Text>
                    </YStack>
                    <Text style={styles.activityTime}>{new Date(temp.recordedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</Text>
                  </TouchableOpacity>
                  {idx < data.activities.recentTemps.length - 1 && <Separator opacity={0.1} />}
                </React.Fragment>
              ))
            )}
          </Card>
        </YStack>
      </YStack>
    </ScrollView>
  );
}

function StatCard({ label, value, color, icon, badge = false, badgeColor = '#ef4444', onPress }: any) {
  return (
    <TouchableOpacity 
      style={[styles.statCard, { borderLeftColor: color }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <XStack justifyContent="space-between" alignItems="flex-start">
        <YStack>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statLabel}>{label}</Text>
        </YStack>
        <View style={[styles.statIconBox, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
      </XStack>
      {badge && <View style={[styles.statBadge, { backgroundColor: badgeColor }]} />}
    </TouchableOpacity>
  );
}

function AlertItem({ title, subtitle, icon, type, onPress }: any) {
  const color = type === 'danger' ? '#ef4444' : '#f59e0b';
  return (
    <TouchableOpacity style={[styles.alertItem, { borderColor: color + '44' }]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.alertIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <YStack flex={1}>
        <Text style={styles.alertTitle}>{title}</Text>
        <Text style={styles.alertSub}>{subtitle}</Text>
      </YStack>
      <Ionicons name="chevron-forward" size={16} color="#334155" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  loading: {
    flex: 1,
    backgroundColor: '#0d1117',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#16213e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: ACCENT,
    marginBottom: 10,
  },
  greetingBox: {
    backgroundColor: '#16213e',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  greeting: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  greetingSub: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1e3a5f',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    position: 'relative',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  viewAll: {
    color: ACCENT,
    fontSize: 13,
    fontWeight: '600',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 12,
    gap: 12,
    borderWidth: 1,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '700',
  },
  alertSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTitle: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '600',
  },
  activitySub: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 1,
  },
  activityTime: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyActivity: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#475569',
    fontSize: 13,
  },
});
