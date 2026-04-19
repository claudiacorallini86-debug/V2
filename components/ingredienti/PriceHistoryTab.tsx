import React, { useState, useMemo } from 'react'
import { 
  YStack, 
  XStack, 
  SizableText, 
  Button, 
  Card, 
  Separator,
  Theme,
  ScrollView,
  Badge,
  Circle,
} from '@blinkdotnew/mobile-ui'
import { Plus, TrendingUp, Calendar, FileText, ExternalLink, Info, Image as ImageIcon } from '@blinkdotnew/mobile-ui'
import { useIngredientPrices, IngredientPrice } from '@/hooks/useIngredients'
import { AddPriceModal } from './AddPriceModal'
import Svg, { Path, Circle as SvgCircle, Line, Text as SvgText } from 'react-native-svg'
import { Platform, View, Linking } from 'react-native'
import { useTheme } from 'tamagui'

interface Props {
  ingredientId: string
  defaultSupplier: string
}

// Custom Italian Currency Formatter (Safe for all platforms)
const formatEuro = (amount: number, maxDecimals: number = 2) => {
  if (isNaN(amount)) return '0,00 €'
  
  const fixed = amount.toFixed(maxDecimals)
  const [int, dec] = fixed.split('.')
  
  // Add dots for thousands
  const formattedInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  
  // Ensure at least 2 decimal places
  let finalDec = dec || '00'
  if (finalDec.length < 2) finalDec = finalDec.padEnd(2, '0')
  
  return `${formattedInt},${finalDec} €`
}

// Separate component for the Chart to avoid re-creation on every parent render
const PriceChart = ({ prices, gridColor, lineColor, textColor, pointColor }: any) => {
  // Combine all data preparation in one stable memo
  const { validPrices, chartData } = useMemo(() => {
    const valid = (prices || []).filter((p: any) => 
      p && 
      typeof p.pricePerUnit === 'number' && 
      !isNaN(p.pricePerUnit) && 
      p.date && 
      !isNaN(new Date(p.date).getTime())
    );

    const sorted = [...valid].sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      if (dateA !== dateB) return dateA - dateB;
      
      const createA = new Date(a.createdAt || a.created_at || 0).getTime();
      const createB = new Date(b.createdAt || b.created_at || 0).getTime();
      return createA - createB;
    }).slice(-15);

    return { validPrices: valid, chartData: sorted };
  }, [prices]);
  
  if (validPrices.length < 2) {
    return (
      <YStack padding="$4" alignItems="center" justifyContent="center" backgroundColor="$color2" borderRadius="$4" height={150}>
        <TrendingUp size={32} color="$color8" />
        <SizableText color="$color10" textAlign="center" marginTop="$2">
          Andamento prezzi non disponibile (minimo 2 rilevazioni).
        </SizableText>
      </YStack>
    );
  }

  const width = 300
  const height = 120
  const padding = 20
  
  const pricesValues = chartData.map((p: any) => p.pricePerUnit)
  const minVal = Math.min(...pricesValues)
  const maxVal = Math.max(...pricesValues)
  
  const minPrice = minVal * 0.9
  const maxPrice = maxVal * 1.1
  const priceRange = Math.max(0.0001, maxPrice - minPrice)

  const getX = (index: number) => padding + (index * (width - 2 * padding) / Math.max(1, chartData.length - 1))
  const getY = (price: number) => {
    if (isNaN(priceRange) || priceRange === 0) return height / 2
    const y = height - padding - ((price - minPrice) * (height - 2 * padding) / priceRange)
    return isNaN(y) ? height / 2 : y
  }

  const pathData = chartData.map((p: any, i: number) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.pricePerUnit)}`).join(' ')

  return (
    <YStack backgroundColor="$color2" borderRadius="$4" padding="$2" alignItems="center">
      <Svg width={width} height={height}>
        {/* Grid lines */}
        <Line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke={gridColor} strokeWidth="1" />
        
        {/* Path */}
        <Path d={pathData} fill="none" stroke={lineColor} strokeWidth="2" />
        
        {/* Points */}
        {chartData.map((p: any, i: number) => (
          <React.Fragment key={p.id || i}>
            <SvgCircle cx={getX(i)} cy={getY(p.pricePerUnit)} r="3" fill={pointColor} />
            {i === chartData.length - 1 && (
              <SvgText 
                x={getX(i) - 20} 
                y={getY(p.pricePerUnit) - 10} 
                fill={textColor} 
                fontSize="10" 
                fontWeight="bold"
              >
                {formatEuro(p.pricePerUnit || 0, 2)}
              </SvgText>
            )}
          </React.Fragment>
        ))}
      </Svg>
      <XStack justifyContent="space-between" width={width - 2 * padding} marginTop="$1">
        <SizableText size="$1" color="$color9">{chartData[0]?.date || ''}</SizableText>
        <SizableText size="$1" color="$color9">{chartData[chartData.length - 1]?.date || ''}</SizableText>
      </XStack>
    </YStack>
  )
}

export function PriceHistoryTab({ ingredientId, defaultSupplier }: Props) {
  const { prices, isLoading } = useIngredientPrices(ingredientId)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const theme = useTheme()

  // Get hex colors for SVG
  const gridColor = theme.color5?.get() || '#333'
  const lineColor = theme.color10?.get() || '#4A90D9'
  const textColor = theme.color12?.get() || '#fff'
  const pointColor = theme.color10?.get() || '#4A90D9'

  // Format price helper - Italian style, clean and precise
  const formatPrice = (price: number, unit: string) => {
    const val = Number(price)
    if (isNaN(val)) return `0,00 €/${unit}`
    
    // For small units, use more precision (up to 5 decimals)
    const maxDecimals = (unit === 'g' || unit === 'mL' || val < 0.1) ? 5 : 3
    
    // Manual formatting for Italian style (comma for decimals, dot for thousands)
    const parts = val.toFixed(maxDecimals).split('.')
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    let decimalPart = parts[1] || '00'
    
    // Trim trailing zeros from 3 decimals if needed, keeping at least 2
    if (maxDecimals === 3 && decimalPart.length === 3 && decimalPart.endsWith('0')) {
      decimalPart = decimalPart.slice(0, 2)
    }
    
    return `${integerPart},${decimalPart} €/${unit}`
  }

  // Unit conversion display helper
  const getConversionText = (price: number, unit: string) => {
    if (unit === 'kg') return ` = ${formatPrice(price / 1000, 'g')}`
    if (unit === 'L') return ` = ${formatPrice(price / 1000, 'mL')}`
    return ''
  }

  return (
    <YStack flex={1} gap="$4">
      <Card backgroundColor="$color1" bordered padding="$4" gap="$4">
        <XStack justifyContent="space-between" alignItems="center">
          <YStack>
            <SizableText size="$5" fontWeight="800">Andamento Prezzi</SizableText>
            <SizableText size="$2" color="$color10">Ultimi 12 mesi</SizableText>
          </YStack>
          <Button 
            size="$3" 
            theme="active" 
            icon={<Plus size={16} />} 
            onPress={() => setIsModalOpen(true)}
          >
            Aggiungi Prezzo
          </Button>
        </XStack>
        
        <PriceChart 
          prices={prices} 
          gridColor={gridColor} 
          lineColor={lineColor} 
          textColor={textColor} 
          pointColor={pointColor} 
        />
      </Card>

      <YStack gap="$2">
        <SizableText size="$4" fontWeight="700">Cronologia Prezzi</SizableText>
        {prices.length === 0 ? (
          <YStack padding="$8" alignItems="center" gap="$2">
            <FileText size={48} color="$color8" />
            <SizableText color="$color10">Nessun prezzo registrato per questo ingrediente.</SizableText>
          </YStack>
        ) : (
          <YStack gap="$3">
            {prices.map((price, index) => {
              const isLatest = index === 0
              return (
                <Card 
                  key={price.id} 
                  bordered 
                  padding="$3" 
                  backgroundColor={isLatest ? '$green2' : '$color1'}
                  borderColor={isLatest ? '$green5' : '$color4'}
                >
                  <XStack justifyContent="space-between">
                    <YStack gap="$1" flex={1}>
                      <XStack gap="$2" alignItems="center">
                        <SizableText size="$2" fontWeight="700" color="$color10">
                          {price.date}
                        </SizableText>
                        {isLatest && (
                          <Badge>CORRENTE</Badge>
                        )}
                      </XStack>
                      <SizableText size="$4" fontWeight="800" color={isLatest ? '$green10' : '$color12'}>
                        {formatPrice(price.pricePerUnit, price.priceUnit)}
                        <SizableText size="$2" fontWeight="400" color="$color10">
                          {getConversionText(price.pricePerUnit, price.priceUnit)}
                        </SizableText>
                      </SizableText>
                      <XStack gap="$2" alignItems="center">
                        <SizableText size="$2" color="$color11" fontWeight="600">{price.supplier}</SizableText>
                        {price.docReferral ? (
                          <SizableText size="$1" color="$color9">({price.docReferral})</SizableText>
                        ) : null}
                      </XStack>
                    </YStack>
                    
                    <XStack gap="$2">
                      {price.invoiceUrl ? (
                        <Button 
                          circular 
                          size="$3" 
                          variant="outlined" 
                          icon={<ExternalLink />} 
                          onPress={() => Linking.openURL(price.invoiceUrl!)}
                        />
                      ) : null}
                    </XStack>
                  </XStack>
                  
                  {price.note ? (
                    <YStack marginTop="$2" padding="$2" backgroundColor="$background" borderRadius="$2">
                      <SizableText size="$1" color="$color10" fontStyle="italic">
                        "{price.note}"
                      </SizableText>
                    </YStack>
                  ) : null}
                </Card>
              )
            })}
          </YStack>
        )}
      </YStack>

      <AddPriceModal 
        ingredientId={ingredientId}
        defaultSupplier={defaultSupplier}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </YStack>
  )
}
