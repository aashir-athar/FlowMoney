// i18n/locales/en.ts
// English source-of-truth translations. Keep keys grouped by screen/feature
// for maintainability, and make every parameter explicit (e.g. {{count}})
// so translators can rearrange word order in target locales.

export const en = {
  common: {
    cancel: 'Cancel',
    delete: 'Delete',
    done: 'Done',
    save: 'Save',
    ok: 'OK',
    notNow: 'Not now',
    seeAll: 'See all',
    more: 'More',
    today: 'Today',
    yesterday: 'Yesterday',
    income: 'Income',
    monthSuffix: '/month',
    perDay: 'per day',
  },

  greeting: {
    morning: 'Good morning',
    afternoon: 'Good afternoon',
    evening: 'Good evening',
  },

  ask: {
    label: 'Ask',
  },

  onboarding: {
    welcome: {
      eyebrow: 'Welcome',
      headline: 'Your money,\nclear at last.',
      subtext:
        'FlowMoney reads your bank alerts and turns them into a picture of your financial life. No manual entry. No spreadsheets.',
      cta: 'Get started',
    },
    privacy: {
      eyebrow: 'Privacy first',
      headline: 'Your data never\nleaves your phone.',
      subtext:
        'We read transaction alerts only — never personal messages. Everything is processed on-device. There is no FlowMoney server.',
      cta: 'That works for me',
    },
    goal: {
      eyebrow: 'One last thing',
      headline: 'What matters\nmost to you?',
      subtext: 'This shapes how we show your money.',
      saveMoney: { label: 'Save more money', sub: 'Track what is holding you back' },
      controlSpending: {
        label: 'Control my spending',
        sub: 'Know where every rupee goes',
      },
      justTrack: { label: 'Just track for now', sub: 'Awareness without pressure' },
      finish: 'Start tracking',
    },
  },

  home: {
    todayLabel: 'Today you spent',
    weekLabel: 'This week',
    monthLabel: 'This month',
    sectionWeekly: 'Last 7 days',
    sectionPattern: 'Pattern',
    sectionPatterns: 'Patterns',
    sectionRecent: 'Recent',
    addAccessibility: 'Add transaction',
    askAccessibility: 'Ask Money Assistant',
    emptyNoSms: {
      title: "Let's see your money",
      description:
        'Connect SMS so FlowMoney can read bank alerts and turn them into a clear picture of your spending.',
      cta: 'Connect SMS',
    },
    emptyHasSms: {
      title: 'No transactions yet',
      description:
        'Once a bank alert arrives, it will show up here. You can also add one manually.',
      cta: 'Add manually',
    },
  },

  feed: {
    title: 'Transactions',
    countThisMonth: '{{count}} this month',
    filters: {
      all: 'All',
      food: 'Food',
      transport: 'Transport',
      shopping: 'Shopping',
      bills: 'Bills',
      entertainment: 'Entertainment',
      subscriptions: 'Subscriptions',
      other: 'Other',
    },
    emptyAll: {
      title: 'No transactions yet',
      description:
        'Once a bank alert arrives or you add one manually, it will appear here.',
    },
    emptyFiltered: {
      title: 'Nothing in this category',
      description:
        'Try a different filter, or add a transaction in this category from Home.',
    },
  },

  subscriptionAlert: {
    title: '{{count}} subscription sitting unused',
    titlePlural: '{{count}} subscriptions sitting unused',
    bodyOne: '{{amount}}/month for a service you have not opened recently.',
    bodyMany: '{{amount}}/month for services you have not opened recently.',
  },

  insights: {
    title: 'Insights',
    subtitle: 'What your spending reveals',
    heroLabel: 'This month',
    monthlyChange: '{{change}} vs last month',
    sectionWhereItGoes: 'Where it goes',
    sectionSubscriptions: 'Subscriptions',
    sectionPatterns: 'Patterns',
    sectionQuickStats: 'Quick stats',
    statDailyAverage: 'Daily average',
    statVsLastMonth: 'vs last month',
    subUnused: '{{count}} sitting unused',
    subActive: 'Active',
    subNotUsed: 'Not used recently',
    emptyNoInsights: {
      title: 'No insights yet',
      description:
        'As your transactions come in, FlowMoney will start surfacing patterns and unused subscriptions here.',
    },
  },

  profile: {
    title: 'Profile',
    yourGoal: 'Your goal',
    goalNotSet: 'Not set',
    goalSaveMoney: 'Save more money',
    goalControlSpending: 'Control my spending',
    goalJustTrack: 'Just tracking for now',
    sectionStats: 'Stats',
    sectionSettings: 'Settings',
    spentThisMonth: 'Spent this month',
    dailyAverage: 'Daily average',
    vsLastMonth: 'vs last month',
    notifications: 'Notifications',
    notificationsHint: 'Alert me when a transaction is detected',
    smsReading: 'SMS Reading',
    smsActive: 'Active',
    smsTapToEnable: 'Tap to enable',
    currency: 'Currency',
    language: 'Language',
    privacyTitle: 'On-device only',
    privacyText:
      'Your transactions never leave this phone. SMS messages are parsed locally. FlowMoney does not run a server.',
    version: 'FlowMoney {{version}}',
    androidOnlyTitle: 'Android only',
    androidOnlyMessage: 'SMS-based tracking is only available on Android.',
  },

  chat: {
    headerTitle: 'Money Assistant',
    backButton: 'Done',
    newChat: 'New',
    newChatAccessibility: 'Start new chat',
    welcome:
      'Your spending this month is {{amount}}. Ask me anything about your money — I can see your full transaction history.',
    inputPlaceholder: 'Ask about your spending...',
    quickPromptsLabel: 'Ask something',
    sendButton: 'Send',
    cooldown: '{{seconds}}s',
    quickPrompts: {
      overspending: 'Where am I overspending?',
      afford: 'Can I afford something this week?',
      saveMore: 'How can I save more?',
      biggestHabit: 'What is my biggest habit?',
    },
    errors: {
      noKey: 'Groq API key missing. Set EXPO_PUBLIC_GROQ_API_KEY in .env.',
      generic: 'Could not connect right now. Check your internet and try again.',
    },
  },

  addTransaction: {
    title: 'Add a transaction',
    typeSpent: 'Spent',
    typeReceived: 'Received',
    amountPlaceholder: '0.00',
    merchantPlaceholder: 'Merchant or description',
    categoryLabel: 'Category',
    save: 'Save transaction',
    errorEnterNumber: 'Enter a number',
    errorMustBePositive: 'Amount must be more than zero',
    errorTooLarge: 'That amount is too large',
    errorAddMerchant: 'Add a merchant or description',
    hintEnterBoth: 'Enter an amount and merchant',
    hintEnterAmount: 'Enter an amount',
  },

  transactionDetail: {
    notFound: 'Transaction not found',
    source: 'Source',
    sourceSms: 'SMS auto-detected',
    sourceManual: 'Manual entry',
    bookmark: 'Bookmark',
    removeBookmark: 'Remove bookmark',
    changeCategory: 'Change category',
    originalAlert: 'Original alert',
    deleteButton: 'Delete transaction',
    deleteAccessibility: 'Delete transaction',
    deleteTitle: 'Delete transaction?',
    deleteMessage:
      '{{amount}} at {{merchant}} will be removed. This cannot be undone.',
  },

  smsPermissionSheet: {
    title: 'Read bank alerts, nothing else',
    subtitle:
      'FlowMoney scans only bank/transaction SMS to populate your spending. Personal messages are never read or stored.',
    exampleLabel: 'EXAMPLE',
    exampleSender: 'HBL-Alert',
    exampleBody:
      'Debit Rs. 1,250 at FOODPANDA on 12-Apr. Avl Bal: Rs. 84,310.',
    bulletStaysOnPhone: 'Stays on this phone — no server, no upload.',
    bulletReadsFinancial: 'Reads only messages that look financial.',
    bulletNeverReadsOtps: "Never reads OTPs, friends' messages, or media.",
    continue: 'Continue',
    iosGotIt: 'Got it',
    openSettings: 'Open Settings',
    deniedHelper:
      'Permission was denied. Enable SMS access for FlowMoney in Settings to continue.',
  },

  categories: {
    food: 'Food',
    transport: 'Transport',
    bills: 'Bills',
    shopping: 'Shopping',
    entertainment: 'Entertainment',
    health: 'Health',
    subscriptions: 'Subscriptions',
    transfer: 'Transfer',
    other: 'Other',
  },

  insightEngine: {
    weeklyUp: {
      title: 'Spending up {{change}}% this week',
      description:
        "You're tracking at {{daily}} per day, ahead of last week's pace at the same point.",
    },
    weeklyDown: {
      title: 'You are doing better this week',
      description:
        'Your spending is {{change}}% lower than last week so far. Keep this up.',
    },
    topCategory: {
      title: '{{category}} is your biggest expense',
      description:
        '{{category}} is {{percent}}% of this month — {{total}}.{{tail}}',
      tail: " That's {{ratio}}× your next category, {{runnerUp}} ({{runnerUpTotal}}).",
    },
    weekend: {
      title: 'Your weekends cost more',
      description:
        'Weekend days run {{percent}}% above weekdays. Last weekend totaled {{total}}.',
    },
    lateNight: {
      title: 'Late-night spending stands out',
      description:
        '{{total}} of your last 30 days happened between 9 PM and midnight.{{tail}}',
      tail: ' Most of it lands in {{category}} ({{percent}}%).',
    },
    frequentMerchant: {
      title: '{{count}} orders at {{merchant}} this week',
      description:
        "That's {{total}} across {{count}} transactions — {{average}} on average.",
    },
    accelerating: {
      title: 'Spending pace is accelerating',
      description:
        'Your last 3 days average {{recent}}/day — up from {{baseline}}/day over the prior two weeks.',
    },
    biggestThisWeek: {
      title: 'Biggest spend this week',
      description: '{{amount}} at {{merchant}} on {{day}}.',
    },
    betterMonth: {
      title: 'On pace for a better month',
      description:
        "You're {{change}}% below last month at this point — {{thisMonth}} vs {{lastMonth}}.",
    },
  },

  insightCard: {
    label: {
      positive: 'Good news',
      warning: 'Heads up',
      alert: 'Take a look',
      neutral: 'Pattern',
    },
  },

  trend: {
    onTrack: 'on track',
    up: 'up {{percent}}%',
    down: 'down {{percent}}%',
  },

  notifications: {
    received: 'Received {{amount}} from {{merchant}}',
    receivedShort: '+{{amount}} from {{merchant}}',
    receivedDash: '{{merchant}} — +{{amount}}',
    spent: 'You just spent {{amount}} at {{merchant}}',
    spentShort: '{{amount}} at {{merchant}}',
    spentDash: '{{merchant}} — {{amount}}',
    overAverageTitle: "You're spending faster than usual",
    overAverageBody:
      'Today is running {{percent}}% above your average. {{amount}} spent.',
  },

  language: {
    en: 'English',
    ur: 'اردو',
    hi: 'हिन्दी',
    systemDefault: 'System default',
  },
};

export type Translations = typeof en;
