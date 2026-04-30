// app/chat.tsx
// Money Assistant — Groq-powered financial Q&A grounded in real transactions.
//
// Design philosophy:
//   - Conversational, never busy. Bubbles use the same surface tokens as cards.
//   - The user always knows the assistant is "live" (status dot in header).
//   - Quick prompts vanish after first message — progressive disclosure.

import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LAYOUT, RADIUS, SPACING, TYPOGRAPHY } from '../constants/design';
import { useColors, useTheme } from '../hooks/useTheme';
import { useHaptics } from '../hooks/useTransactions';
import { useT } from '../i18n';
import {
  createChatCompletion,
  GroqRateLimitError,
  hasGroqApiKey,
} from '../services/groqClient';
import { useAppStore } from '../store/useAppStore';
import { formatCurrency } from '../utils/analytics';

const GROQ_MODEL = 'llama-3.3-70b-versatile';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// Quick prompts are i18n keys; translated at render time so language
// switches without restart.
const QUICK_PROMPT_KEYS = [
  'overspending',
  'afford',
  'saveMore',
  'biggestHabit',
] as const;

export default function ChatScreen() {
  const colors = useColors();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { light } = useHaptics();
  const { t } = useT();
  const flatRef = useRef<FlatList>(null);

  const summary = useAppStore((s) => s.summary);
  const transactions = useAppStore((s) => s.transactions);
  const subscriptions = useAppStore((s) => s.subscriptions);

  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      content: t('chat.welcome', {
        amount: formatCurrency(summary?.thisMonth ?? 0),
      }),
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  React.useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const cooldownSeconds = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const inCooldown = cooldownSeconds > 0;

  // Build financial context for Claude
  const financialContext = useMemo(() => {
    const topCategories = summary?.categoryBreakdown
      .slice(0, 3)
      .map((c) => `${c.category}: ${formatCurrency(c.total)} (${c.percentage.toFixed(0)}%)`)
      .join(', ') ?? 'No data';

    const recentTxs = transactions
      .slice(0, 10)
      .filter((t) => t.type === 'debit')
      .map((t) => `${t.merchant}: ${formatCurrency(t.amount)}`)
      .join(', ');

    const subList = subscriptions
      .map((s) => `${s.name}: ${formatCurrency(s.amount)}/month`)
      .join(', ');

    return `
User financial summary:
- Spent today: ${formatCurrency(summary?.today ?? 0)}
- Spent this week: ${formatCurrency(summary?.thisWeek ?? 0)}
- Spent this month: ${formatCurrency(summary?.thisMonth ?? 0)}
- Last month: ${formatCurrency(summary?.lastMonth ?? 0)}
- Weekly change: ${summary?.weeklyChange?.toFixed(0) ?? 0}%
- Top categories: ${topCategories}
- Recent transactions: ${recentTxs}
- Active subscriptions: ${subList}
- Daily average: ${formatCurrency(summary?.dailyAverageThisMonth ?? 0)}
    `.trim();
  }, [summary, transactions, subscriptions]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;
      if (Date.now() < cooldownUntil) return;
      light();

      const userMsg: Message = {
        id: `u_${Date.now()}`,
        role: 'user',
        content: text.trim(),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setIsLoading(true);

      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);

      try {
        if (!hasGroqApiKey()) {
          throw new Error(t('chat.errors.noKey'));
        }

        const conversationHistory = messages
          .filter((m) => m.id !== 'welcome')
          .map((m) => ({ role: m.role, content: m.content }) as const);

        const completion = await createChatCompletion({
          model: GROQ_MODEL,
          max_tokens: 1000,
          temperature: 0.7,
          messages: [
            {
              role: 'system',
              content: `You are a thoughtful financial assistant embedded in FlowMoney, a money awareness app. You have access to the user's real spending data. Be concise, specific, and human — never robotic. Use numbers from their actual data. Speak directly: no hedging, no "I'd suggest", just say it. Never use bullet points in your response. Write in short paragraphs. Never mention that you are an AI. Context:\n\n${financialContext}`,
            },
            ...conversationHistory,
            { role: 'user', content: text.trim() },
          ],
        });

        const reply =
          completion.choices[0]?.message?.content ??
          'Something went wrong. Please try again.';

        const assistantMsg: Message = {
          id: `a_${Date.now()}`,
          role: 'assistant',
          content: reply,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
      } catch (err) {
        console.warn('[Chat] Groq error:', err);
        const isRateLimit = err instanceof GroqRateLimitError;
        if (isRateLimit) {
          setCooldownUntil(Date.now() + err.retryAfterMs);
        }
        const errorMsg: Message = {
          id: `e_${Date.now()}`,
          role: 'assistant',
          content: isRateLimit
            ? (err as GroqRateLimitError).message
            : t('chat.errors.generic'),
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, cooldownUntil, messages, financialContext, light]
  );

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  // New Chat: drop the conversation but keep the welcome line so the assistant
  // never feels "blank". Cooldowns and inflight loads are intentionally
  // preserved — clearing those would be a foot-gun against the rate limiter.
  const handleNewChat = useCallback(() => {
    light();
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: t('chat.welcome', {
          amount: formatCurrency(summary?.thisMonth ?? 0),
        }),
        timestamp: Date.now(),
      },
    ]);
    setInput('');
  }, [light, summary?.thisMonth, t]);

  const renderMessage = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      const isUser = item.role === 'user';
      return (
        <Animated.View
          entering={FadeInDown.delay(50).springify()}
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble,
            {
              backgroundColor: isUser
                ? colors.accent
                : colors.surface,
              alignSelf: isUser ? 'flex-end' : 'flex-start',
              borderColor: isUser ? 'transparent' : colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.messageText,
              { color: isUser ? '#fff' : colors.textPrimary },
            ]}
          >
            {item.content}
          </Text>
        </Animated.View>
      );
    },
    [colors]
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + SPACING.s, borderBottomColor: colors.divider },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Text style={[styles.backText, { color: colors.accent }]}>{t('chat.backButton')}</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={[styles.headerDot, { backgroundColor: colors.positive }]} />
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {t('chat.headerTitle')}
          </Text>
        </View>
        <Pressable
          onPress={handleNewChat}
          // Disable when there's nothing to clear — cheaper than rendering a
          // disabled style; preserves the implicit "fresh chat" affordance.
          disabled={messages.length <= 1 || isLoading}
          style={({ pressed }) => [
            styles.headerRight,
            { opacity: messages.length <= 1 || isLoading ? 0.4 : pressed ? 0.7 : 1 },
          ]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('chat.newChatAccessibility')}
        >
          <Feather name="edit" size={18} color={colors.accent} />
          <Text style={[styles.newChatText, { color: colors.accent }]}>{t('chat.newChat')}</Text>
        </Pressable>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderMessage}
        contentContainerStyle={[
          styles.messageList,
          { paddingBottom: SPACING.m },
        ]}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Loading */}
      {isLoading && (
        <View style={[styles.loadingRow, { paddingHorizontal: SPACING.l }]}>
          <View style={[styles.loadingBubble, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        </View>
      )}

      {/* Quick prompts (show only at start) */}
      {messages.length <= 1 && (
        <Animated.View entering={FadeIn} style={styles.quickPromptsRow}>
          <Text style={[styles.quickPromptsLabel, { color: colors.textTertiary }]}>
            {t('chat.quickPromptsLabel')}
          </Text>
          <View style={styles.quickPrompts}>
            {QUICK_PROMPT_KEYS.map((key) => {
              const text = t(`chat.quickPrompts.${key}`);
              return (
                <Pressable
                  key={key}
                  onPress={() => handleQuickPrompt(text)}
                  style={[styles.quickChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Text style={[styles.quickChipText, { color: colors.textSecondary }]}>{text}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      )}

      {/* Input */}
      <View
        style={[
          styles.inputRow,
          {
            paddingBottom: insets.bottom + SPACING.m,
            borderTopColor: colors.divider,
            backgroundColor: colors.background,
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.textPrimary,
            },
          ]}
          value={input}
          onChangeText={setInput}
          placeholder={t('chat.inputPlaceholder')}
          placeholderTextColor={colors.textTertiary}
          multiline
          returnKeyType="send"
          onSubmitEditing={() => sendMessage(input)}
        />
        <Pressable
          onPress={() => sendMessage(input)}
          disabled={!input.trim() || isLoading || inCooldown}
          style={[
            styles.sendButton,
            {
              backgroundColor: input.trim() && !inCooldown ? colors.accent : colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.sendText, { color: input.trim() && !inCooldown ? '#fff' : colors.textTertiary }]}>
            {inCooldown
              ? t('chat.cooldown', { seconds: cooldownSeconds })
              : t('chat.sendButton')}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-start' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.screenHorizontalPadding,
    paddingBottom: SPACING.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { width: 60 },
  backText: { ...TYPOGRAPHY.labelL },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.s,
  },
  headerDot: { width: 8, height: 8, borderRadius: 4 },
  headerTitle: { ...TYPOGRAPHY.h3 },
  headerRight: {
    width: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  newChatText: { ...TYPOGRAPHY.labelM },
  messageList: { padding: LAYOUT.screenHorizontalPadding, gap: SPACING.sm },
  messageBubble: {
    maxWidth: '82%',
    padding: SPACING.m,
    borderRadius: RADIUS.xxl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  userBubble: { borderBottomRightRadius: RADIUS.s },
  assistantBubble: { borderBottomLeftRadius: RADIUS.s },
  messageText: { ...TYPOGRAPHY.bodyM, lineHeight: 22 },
  loadingRow: { paddingHorizontal: LAYOUT.screenHorizontalPadding, paddingBottom: SPACING.s },
  loadingBubble: {
    alignSelf: 'flex-start',
    padding: SPACING.m,
    borderRadius: RADIUS.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: RADIUS.s,
  },
  quickPromptsRow: {
    paddingHorizontal: LAYOUT.screenHorizontalPadding,
    paddingBottom: SPACING.sm,
    gap: SPACING.s,
  },
  quickPromptsLabel: {
    ...TYPOGRAPHY.labelS,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  quickPrompts: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.s },
  quickChip: {
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickChipText: { ...TYPOGRAPHY.labelM },
  inputRow: {
    flexDirection: 'row',
    gap: SPACING.s,
    paddingHorizontal: SPACING.m,
    paddingTop: SPACING.m,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderRadius: RADIUS.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.sm,
    ...TYPOGRAPHY.bodyM,
    maxHeight: 120,
  },
  sendButton: {
    paddingHorizontal: SPACING.m,
    height: 44,
    minWidth: 64,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendText: { ...TYPOGRAPHY.labelL },
});
