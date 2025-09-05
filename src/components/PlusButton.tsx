import React from 'react';
import { TouchableOpacity, Text, Platform } from 'react-native';
import type { GestureResponderEvent, StyleProp, ViewStyle } from 'react-native';

type Props = {
  size?: number;
  iconSize?: number;
  color?: string; // background color
  iconColor?: string;
  onPress?: (event: GestureResponderEvent) => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export default function PlusButton({
  size = 56,
  iconSize,
  color = '#2563EB',
  iconColor = '#FFFFFF',
  onPress,
  accessibilityLabel,
  style,
}: Props) {
  const d = size;
  const font = iconSize ?? Math.round(d * 0.55);
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || 'Añadir'}
      onPress={onPress}
      activeOpacity={0.8}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      style={[
        {
          width: d,
          height: d,
          borderRadius: d / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: color,
          ...(Platform.select({
            web: { boxShadow: '0px 4px 12px rgba(0,0,0,0.3)' } as any,
            default: {
              shadowColor: '#000',
              shadowOpacity: 0.3,
              shadowRadius: 6,
              elevation: 6,
            },
          }) as any),
        },
        style,
      ]}
    >
      <Text style={{ color: iconColor, fontWeight: '800', fontSize: font, lineHeight: font }}>+</Text>
    </TouchableOpacity>
  );
}

