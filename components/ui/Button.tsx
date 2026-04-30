// components/ui/Button.tsx
// Reusable button component — primary, secondary, ghost variants
// Press animation runs on the UI thread via Reanimated

import React, { useCallback } from 'react';
import {
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useColors } from '../../hooks/useTheme';
import { RADIUS, TYPOGRAPHY, SPACING } from '../../constants/design';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Button = React.memo(function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
}: ButtonProps) {
  const colors = useColors();
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, { damping: 20, stiffness: 400 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 20, stiffness: 400 });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const variantStyles = getVariantStyles(variant, colors);
  const sizeStyles = getSizeStyles(size);

  const isDisabled = disabled || loading;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={[
        styles.base,
        sizeStyles.button,
        variantStyles.button,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        animStyle,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variantStyles.text.color as string}
        />
      ) : (
        <Text style={[styles.label, sizeStyles.text, variantStyles.text, textStyle]}>
          {label}
        </Text>
      )}
    </AnimatedPressable>
  );
});

// ─── Variant Styles ───────────────────────────────────────────────────────────

function getVariantStyles(variant: ButtonVariant, colors: any) {
  switch (variant) {
    case 'primary':
      return {
        button: { backgroundColor: colors.accent },
        text: { color: '#ffffff' },
      };
    case 'secondary':
      return {
        button: {
          backgroundColor: colors.accentSubtle,
          borderWidth: 1,
          borderColor: colors.accent + '40',
        },
        text: { color: colors.accent },
      };
    case 'ghost':
      return {
        button: {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.border,
        },
        text: { color: colors.textSecondary },
      };
    case 'danger':
      return {
        button: { backgroundColor: colors.danger },
        text: { color: '#ffffff' },
      };
  }
}

function getSizeStyles(size: ButtonSize) {
  switch (size) {
    case 'sm':
      return {
        button: { height: 36, paddingHorizontal: SPACING.m, borderRadius: RADIUS.m },
        text: TYPOGRAPHY.labelM,
      };
    case 'md':
      return {
        button: { height: 48, paddingHorizontal: SPACING.xl, borderRadius: RADIUS.l },
        text: TYPOGRAPHY.labelL,
      };
    case 'lg':
      return {
        button: { height: 58, paddingHorizontal: SPACING.xxl, borderRadius: RADIUS.xl },
        text: TYPOGRAPHY.h3,
      };
  }
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    textAlign: 'center',
  },
});
