// hooks/useTheme.ts
// Returns the correct color tokens based on system/user theme preference.
// Memoized to prevent unnecessary re-renders.

import { useColorScheme } from 'react-native';
import { useMemo } from 'react';
import { DARK_COLORS, LIGHT_COLORS } from '../constants/design';
import { ColorTokens, Theme } from '../types/theme';
import { useAppStore } from '../store/useAppStore';

export function useTheme(): Theme {
  const systemScheme = useColorScheme();
  const themePref = useAppStore((s) => s.preferences.theme);

  return useMemo(() => {
    const resolvedScheme =
      themePref === 'system' ? systemScheme : themePref;
    const isDark = resolvedScheme === 'dark';

    return {
      colors: isDark ? DARK_COLORS : LIGHT_COLORS,
      isDark,
    };
  }, [systemScheme, themePref]);
}

/**
 * Convenience hook — returns just the color tokens.
 * Use this in 95% of components.
 */
export function useColors(): ColorTokens {
  return useTheme().colors;
}
