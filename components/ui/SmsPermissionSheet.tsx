// components/ui/SmsPermissionSheet.tsx
// Pre-permission explainer sheet shown before we trigger the OS prompt.
//
// Why this exists: the OS dialog is one tap away from a permanent "Don't ask
// again". Showing context first — what we read, what we don't, an example —
// turns a scary modal into an informed yes. It also gives us a re-entry point
// when permission was previously denied: we can offer "Open Settings" instead
// of repeatedly asking, since requestPermissions() will silently fail.

import { Feather } from '@expo/vector-icons';
import React, { memo } from 'react';
import { Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RADIUS, SPACING, SPRING, TYPOGRAPHY } from '../../constants/design';
import { useColors } from '../../hooks/useTheme';
import { useT } from '../../i18n';

interface SmsPermissionSheetProps {
  visible: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
  // When the user has BLOCKED the prompt ("Don't ask again" on Android 11+),
  // requestPermissions() resolves silently. Pass true to surface
  // "Open Settings" instead of "Continue" — that's the only path forward.
  // Plain `denied` does NOT need this flag — the OS will prompt again.
  blocked?: boolean;
}

export const SmsPermissionSheet = memo(function SmsPermissionSheet({
  visible,
  onConfirm,
  onDismiss,
  blocked = false,
}: SmsPermissionSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useT();

  const handleOpenSettings = () => {
    Linking.openSettings();
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <Animated.View entering={FadeIn} style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
        <Animated.View
          entering={SlideInDown.springify()
            .damping(SPRING.settle.damping)
            .stiffness(SPRING.settle.stiffness)}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingBottom: insets.bottom + SPACING.l,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.textTertiary }]} />

          <View style={[styles.iconWrap, { backgroundColor: colors.accentSubtle }]}>
            <Feather name="message-square" size={22} color={colors.accent} />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('smsPermissionSheet.title')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('smsPermissionSheet.subtitle')}
          </Text>

          <View style={[styles.exampleCard, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.exampleLabel, { color: colors.textTertiary }]}>
              {t('smsPermissionSheet.exampleLabel')}
            </Text>
            <Text style={[styles.exampleSender, { color: colors.textPrimary }]}>
              {t('smsPermissionSheet.exampleSender')}
            </Text>
            <Text style={[styles.exampleBody, { color: colors.textSecondary }]}>
              {t('smsPermissionSheet.exampleBody')}
            </Text>
          </View>

          <View style={styles.bullets}>
            <Bullet
              icon="check"
              color={colors.positive}
              text={t('smsPermissionSheet.bulletStaysOnPhone')}
              colors={colors}
            />
            <Bullet
              icon="check"
              color={colors.positive}
              text={t('smsPermissionSheet.bulletReadsFinancial')}
              colors={colors}
            />
            <Bullet
              icon="x"
              color={colors.danger}
              text={t('smsPermissionSheet.bulletNeverReadsOtps')}
              colors={colors}
            />
          </View>

          {blocked ? (
            <>
              <Pressable
                onPress={handleOpenSettings}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: colors.accent, opacity: pressed ? 0.92 : 1 },
                ]}
              >
                <Text style={styles.primaryText}>{t('smsPermissionSheet.openSettings')}</Text>
              </Pressable>
              <Text style={[styles.helperText, { color: colors.textTertiary }]}>
                {t('smsPermissionSheet.deniedHelper')}
              </Text>
            </>
          ) : (
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: colors.accent, opacity: pressed ? 0.92 : 1 },
              ]}
            >
              <Text style={styles.primaryText}>
                {t(Platform.OS === 'android'
                  ? 'smsPermissionSheet.continue'
                  : 'smsPermissionSheet.iosGotIt')}
              </Text>
            </Pressable>
          )}

          <Pressable onPress={onDismiss} style={styles.secondaryBtn} hitSlop={6}>
            <Text style={[styles.secondaryText, { color: colors.textSecondary }]}>
              {t('common.notNow')}
            </Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
});

const Bullet = memo(function Bullet({
  icon,
  color,
  text,
  colors,
}: {
  icon: 'check' | 'x';
  color: string;
  text: string;
  colors: any;
}) {
  return (
    <View style={styles.bullet}>
      <View style={[styles.bulletIcon, { backgroundColor: color + '22' }]}>
        <Feather name={icon} size={12} color={color} />
      </View>
      <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{text}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: RADIUS.xxxl,
    borderTopRightRadius: RADIUS.xxxl,
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: SPACING.l,
    gap: SPACING.m,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SPACING.s,
    opacity: 0.3,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.l,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...TYPOGRAPHY.h2 },
  subtitle: { ...TYPOGRAPHY.bodyM, lineHeight: 22 },
  exampleCard: {
    borderRadius: RADIUS.l,
    padding: SPACING.m,
    gap: 4,
  },
  exampleLabel: {
    ...TYPOGRAPHY.labelS,
    letterSpacing: 1,
  },
  exampleSender: {
    ...TYPOGRAPHY.labelL,
  },
  exampleBody: {
    ...TYPOGRAPHY.bodyS,
    lineHeight: 18,
  },
  bullets: {
    gap: SPACING.s,
  },
  bullet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
  },
  bulletIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletText: {
    ...TYPOGRAPHY.bodyS,
    flex: 1,
    lineHeight: 18,
  },
  primaryBtn: {
    height: 52,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.s,
  },
  primaryText: {
    ...TYPOGRAPHY.h3,
    color: '#fff',
  },
  helperText: {
    ...TYPOGRAPHY.bodyS,
    textAlign: 'center',
    paddingHorizontal: SPACING.m,
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  secondaryText: {
    ...TYPOGRAPHY.labelM,
  },
});
