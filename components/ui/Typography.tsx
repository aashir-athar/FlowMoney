// components/ui/Typography.tsx
// Typed text components for consistent rendering across the app
// Enforces the design system typography scale

import React from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import { useColors } from '../../hooks/useTheme';
import { TYPOGRAPHY } from '../../constants/design';

interface TypographyProps {
  children: React.ReactNode;
  color?: string;
  style?: TextStyle;
  numberOfLines?: number;
  onPress?: () => void;
}

function makeTypographyComponent(variant: keyof typeof TYPOGRAPHY) {
  return React.memo(function TypographyComponent({
    children,
    color,
    style,
    numberOfLines,
    onPress,
  }: TypographyProps) {
    const colors = useColors();

    return (
      <Text
        style={[
          TYPOGRAPHY[variant] as TextStyle,
          { color: color ?? colors.textPrimary },
          style,
        ]}
        numberOfLines={numberOfLines}
        onPress={onPress}
      >
        {children}
      </Text>
    );
  });
}

// Export pre-built variants
export const DisplayXL = makeTypographyComponent('displayXL');
export const DisplayL = makeTypographyComponent('displayL');
export const DisplayM = makeTypographyComponent('displayM');
export const H1 = makeTypographyComponent('h1');
export const H2 = makeTypographyComponent('h2');
export const H3 = makeTypographyComponent('h3');
export const BodyL = makeTypographyComponent('bodyL');
export const BodyM = makeTypographyComponent('bodyM');
export const BodyS = makeTypographyComponent('bodyS');
export const LabelL = makeTypographyComponent('labelL');
export const LabelM = makeTypographyComponent('labelM');
export const LabelS = makeTypographyComponent('labelS');
export const MonoL = makeTypographyComponent('monoL');
export const MonoM = makeTypographyComponent('monoM');
export const MonoS = makeTypographyComponent('monoS');
