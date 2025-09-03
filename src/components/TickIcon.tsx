import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { ViewStyle } from 'react-native';

type Props = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: ViewStyle | ViewStyle[];
};

export default function TickIcon({ size = 20, color = '#10B981', strokeWidth = 3, style }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <Path
        d="M4 12l5 5L20 6"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

