import React, { useState } from 'react';
import {
  YStack,
  XStack,
  SizableText,
  Button,
} from '@blinkdotnew/mobile-ui';
import { FlatList, Modal, Pressable } from 'react-native';

export type SelectItem = {
  label: string;
  value: string;
};

interface InlineSelectProps {
  items: SelectItem[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  isDisabled?: boolean;
}

export const InlineSelect = ({
  items,
  value,
  onValueChange,
  placeholder = 'Seleziona...',
  isDisabled = false,
}: InlineSelectProps) => {
  const [open, setOpen] = useState(false);

  const selectedItem = items.find((item) => item.value === value);
  const displayLabel = selectedItem?.label || placeholder;

  return (
    <>
    
      <Pressable onPress={() => setOpen(true)} disabled={isDisabled}>
        <XStack
          alignItems="center"
          justifyContent="space-between"
          borderWidth={1}
          borderColor="$color6"
          borderRadius="$4"
          backgroundColor="$color1"
          paddingHorizontal="$3"
          paddingVertical="$3"
        >
          <SizableText color={selectedItem ? '$color12' : '$color10'} flex={1} numberOfLines={1}>
            {displayLabel}
          </SizableText>
          <SizableText color="$color10">▼</SizableText>
        </XStack>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            justifyContent: 'center',
            padding: 20,
          }}
          onPress={() => setOpen(false)}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{
              maxHeight: '70%',
              borderRadius: 16,
              backgroundColor: '#16213e',
              borderWidth: 1,
              borderColor: '#1e3a5f',
              overflow: 'hidden',
            }}
          >
            <YStack padding="$4" gap="$3">
              <SizableText fontWeight="700" size="$4">{placeholder}</SizableText>
              <FlatList
                data={items}
                keyExtractor={(item) => item.value || item.label}
                renderItem={({ item }) => {
                  const isSelected = item.value === value;
                  return (
                    <Pressable
                      onPress={() => {
                        onValueChange(item.value);
                        setOpen(false);
                      }}
                      style={{
                        paddingVertical: 14,
                        paddingHorizontal: 12,
                        borderRadius: 12,
                        marginBottom: 8,
                        backgroundColor: isSelected ? '#4A90D933' : '#0f3460',
                        borderWidth: 1,
                        borderColor: isSelected ? '#4A90D9' : '#1e3a5f',
                      }}
                    >
                      <XStack alignItems="center" justifyContent="space-between">
                        <SizableText color="$color12" flex={1}>{item.label}</SizableText>
                        {isSelected ? <SizableText color="$active">Selezionato</SizableText> : null}
                      </XStack>
                    </Pressable>
                  );
                }}
              />
              <Button variant="outlined" onPress={() => setOpen(false)}>
                Chiudi
              </Button>
            </YStack>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};
