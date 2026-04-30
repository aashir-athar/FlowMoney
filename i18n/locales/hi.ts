// i18n/locales/hi.ts
// Hindi (Devanagari). Left-to-right.
//
// Same conventions as the Urdu file: keep highly-technical terms English
// where they're more recognised that way (SMS, FlowMoney, Groq), translate
// the user-facing concepts.

import type { Translations } from './en';

export const hi: Translations = {
  common: {
    cancel: 'रद्द करें',
    delete: 'हटाएँ',
    done: 'पूरा',
    save: 'सहेजें',
    ok: 'ठीक है',
    notNow: 'अभी नहीं',
    seeAll: 'सभी देखें',
    more: 'और',
    today: 'आज',
    yesterday: 'कल',
    income: 'आय',
    monthSuffix: '/माह',
    perDay: 'प्रति दिन',
  },

  greeting: {
    morning: 'सुप्रभात',
    afternoon: 'नमस्कार',
    evening: 'शुभ संध्या',
  },

  ask: {
    label: 'पूछें',
  },

  onboarding: {
    welcome: {
      eyebrow: 'स्वागत है',
      headline: 'आपका पैसा,\nअब साफ़ साफ़।',
      subtext:
        'FlowMoney आपके बैंक अलर्ट पढ़कर उन्हें आपकी वित्तीय तस्वीर में बदल देता है। कोई मैनुअल एंट्री नहीं। कोई स्प्रेडशीट नहीं।',
      cta: 'शुरू करें',
    },
    privacy: {
      eyebrow: 'पहले गोपनीयता',
      headline: 'आपका डेटा कभी\nफ़ोन से बाहर नहीं जाता।',
      subtext:
        'हम केवल लेन-देन के अलर्ट पढ़ते हैं — कभी निजी संदेश नहीं। सब कुछ डिवाइस पर ही प्रोसेस होता है। FlowMoney का कोई सर्वर नहीं है।',
      cta: 'मुझे यह मंज़ूर है',
    },
    goal: {
      eyebrow: 'एक आख़िरी बात',
      headline: 'आपके लिए सबसे\nज़रूरी क्या है?',
      subtext: 'इससे तय होगा कि हम आपका पैसा कैसे दिखाएँ।',
      saveMoney: { label: 'और बचत करना', sub: 'जानें कि क्या रोक रहा है' },
      controlSpending: {
        label: 'अपने ख़र्च पर नियंत्रण',
        sub: 'जानें हर रुपया कहाँ जाता है',
      },
      justTrack: { label: 'फ़िलहाल सिर्फ़ ट्रैक करना', sub: 'दबाव बिना जागरूकता' },
      finish: 'ट्रैकिंग शुरू करें',
    },
  },

  home: {
    todayLabel: 'आज आपने ख़र्च किया',
    weekLabel: 'इस सप्ताह',
    monthLabel: 'इस माह',
    sectionWeekly: 'पिछले 7 दिन',
    sectionPattern: 'पैटर्न',
    sectionPatterns: 'पैटर्न',
    sectionRecent: 'हाल का',
    addAccessibility: 'लेन-देन जोड़ें',
    askAccessibility: 'मनी असिस्टेंट से पूछें',
    emptyNoSms: {
      title: 'चलिए आपका पैसा देखते हैं',
      description:
        'SMS कनेक्ट करें ताकि FlowMoney बैंक अलर्ट पढ़कर आपके ख़र्च की साफ़ तस्वीर बना सके।',
      cta: 'SMS कनेक्ट करें',
    },
    emptyHasSms: {
      title: 'अभी कोई लेन-देन नहीं',
      description:
        'जैसे ही बैंक अलर्ट आएगा, यहाँ दिखाई देगा। आप मैनुअली भी जोड़ सकते हैं।',
      cta: 'मैनुअली जोड़ें',
    },
  },

  feed: {
    title: 'लेन-देन',
    countThisMonth: 'इस माह {{count}}',
    filters: {
      all: 'सभी',
      food: 'भोजन',
      transport: 'परिवहन',
      shopping: 'ख़रीदारी',
      bills: 'बिल',
      entertainment: 'मनोरंजन',
      subscriptions: 'सब्सक्रिप्शन',
      other: 'अन्य',
    },
    emptyAll: {
      title: 'अभी कोई लेन-देन नहीं',
      description:
        'जब बैंक अलर्ट आएगा या आप मैनुअली जोड़ेंगे, यहाँ दिखाई देगा।',
    },
    emptyFiltered: {
      title: 'इस श्रेणी में कुछ नहीं',
      description: 'दूसरा फ़िल्टर आज़माएँ, या होम से इस श्रेणी में लेन-देन जोड़ें।',
    },
  },

  subscriptionAlert: {
    title: '{{count}} सब्सक्रिप्शन अप्रयुक्त',
    titlePlural: '{{count}} सब्सक्रिप्शन अप्रयुक्त',
    bodyOne: '{{amount}}/माह उस सेवा के लिए जिसे आपने हाल में नहीं खोला।',
    bodyMany: '{{amount}}/माह उन सेवाओं के लिए जिन्हें आपने हाल में नहीं खोला।',
  },

  insights: {
    title: 'इनसाइट्स',
    subtitle: 'आपके ख़र्च क्या बताते हैं',
    heroLabel: 'इस माह',
    monthlyChange: 'पिछले माह की तुलना में {{change}}',
    sectionWhereItGoes: 'कहाँ जाता है',
    sectionSubscriptions: 'सब्सक्रिप्शन',
    sectionPatterns: 'पैटर्न',
    sectionQuickStats: 'त्वरित आँकड़े',
    statDailyAverage: 'दैनिक औसत',
    statVsLastMonth: 'पिछले माह की तुलना',
    subUnused: '{{count}} अप्रयुक्त',
    subActive: 'सक्रिय',
    subNotUsed: 'हाल में इस्तेमाल नहीं',
    emptyNoInsights: {
      title: 'अभी कोई इनसाइट नहीं',
      description:
        'जैसे-जैसे आपके लेन-देन जुड़ेंगे, FlowMoney यहाँ पैटर्न और अप्रयुक्त सब्सक्रिप्शन दिखाएगा।',
    },
  },

  profile: {
    title: 'प्रोफ़ाइल',
    yourGoal: 'आपका लक्ष्य',
    goalNotSet: 'सेट नहीं',
    goalSaveMoney: 'और बचत करना',
    goalControlSpending: 'अपने ख़र्च पर नियंत्रण',
    goalJustTrack: 'फ़िलहाल सिर्फ़ ट्रैक करना',
    sectionStats: 'आँकड़े',
    sectionSettings: 'सेटिंग्स',
    spentThisMonth: 'इस माह ख़र्च',
    dailyAverage: 'दैनिक औसत',
    vsLastMonth: 'पिछले माह की तुलना',
    notifications: 'नोटिफ़िकेशन',
    notificationsHint: 'लेन-देन का पता चलने पर मुझे सूचित करें',
    smsReading: 'SMS रीडिंग',
    smsActive: 'सक्रिय',
    smsTapToEnable: 'सक्रिय करने के लिए टैप करें',
    currency: 'मुद्रा',
    language: 'भाषा',
    privacyTitle: 'सिर्फ़ डिवाइस पर',
    privacyText:
      'आपके लेन-देन कभी फ़ोन से बाहर नहीं जाते। SMS स्थानीय रूप से पार्स होते हैं। FlowMoney का कोई सर्वर नहीं है।',
    version: 'FlowMoney {{version}}',
    androidOnlyTitle: 'सिर्फ़ Android',
    androidOnlyMessage: 'SMS-आधारित ट्रैकिंग केवल Android पर उपलब्ध है।',
  },

  chat: {
    headerTitle: 'मनी असिस्टेंट',
    backButton: 'पूरा',
    newChat: 'नया',
    newChatAccessibility: 'नया चैट शुरू करें',
    welcome:
      'इस माह आपका ख़र्च {{amount}} है। अपने पैसे के बारे में कुछ भी पूछें — मुझे आपका पूरा लेन-देन इतिहास दिखाई देता है।',
    inputPlaceholder: 'अपने ख़र्च के बारे में पूछें...',
    quickPromptsLabel: 'कुछ पूछें',
    sendButton: 'भेजें',
    cooldown: '{{seconds}} से',
    quickPrompts: {
      overspending: 'मैं कहाँ ज़्यादा ख़र्च कर रहा हूँ?',
      afford: 'क्या मैं इस सप्ताह कुछ ख़रीद सकता हूँ?',
      saveMore: 'मैं और कैसे बचा सकता हूँ?',
      biggestHabit: 'मेरी सबसे बड़ी आदत क्या है?',
    },
    errors: {
      noKey: 'Groq API कुंजी नहीं मिली। .env में EXPO_PUBLIC_GROQ_API_KEY सेट करें।',
      generic: 'अभी कनेक्ट नहीं हो सका। इंटरनेट जाँचकर फिर कोशिश करें।',
    },
  },

  addTransaction: {
    title: 'लेन-देन जोड़ें',
    typeSpent: 'ख़र्च',
    typeReceived: 'प्राप्त',
    amountPlaceholder: '0.00',
    merchantPlaceholder: 'मर्चेंट या विवरण',
    categoryLabel: 'श्रेणी',
    save: 'लेन-देन सहेजें',
    errorEnterNumber: 'संख्या दर्ज करें',
    errorMustBePositive: 'राशि शून्य से अधिक होनी चाहिए',
    errorTooLarge: 'यह राशि बहुत अधिक है',
    errorAddMerchant: 'मर्चेंट या विवरण जोड़ें',
    hintEnterBoth: 'राशि और मर्चेंट दर्ज करें',
    hintEnterAmount: 'राशि दर्ज करें',
  },

  transactionDetail: {
    notFound: 'लेन-देन नहीं मिला',
    source: 'स्रोत',
    sourceSms: 'SMS से स्वचालित',
    sourceManual: 'मैनुअल एंट्री',
    bookmark: 'बुकमार्क',
    removeBookmark: 'बुकमार्क हटाएँ',
    changeCategory: 'श्रेणी बदलें',
    originalAlert: 'मूल अलर्ट',
    deleteButton: 'लेन-देन हटाएँ',
    deleteAccessibility: 'लेन-देन हटाएँ',
    deleteTitle: 'लेन-देन हटाएँ?',
    deleteMessage: '{{merchant}} पर {{amount}} हटा दिया जाएगा। यह वापस नहीं हो सकता।',
  },

  smsPermissionSheet: {
    title: 'सिर्फ़ बैंक अलर्ट पढ़ें, और कुछ नहीं',
    subtitle:
      'FlowMoney केवल बैंक/लेन-देन SMS स्कैन करता है। निजी संदेश कभी नहीं पढ़े या सहेजे जाते।',
    exampleLabel: 'उदाहरण',
    exampleSender: 'HBL-Alert',
    exampleBody: 'Debit Rs. 1,250 at FOODPANDA on 12-Apr. Avl Bal: Rs. 84,310.',
    bulletStaysOnPhone: 'इसी फ़ोन पर रहता है — कोई सर्वर नहीं, कोई अपलोड नहीं।',
    bulletReadsFinancial: 'सिर्फ़ वही संदेश पढ़ता है जो वित्तीय लगें।',
    bulletNeverReadsOtps: 'OTPs, दोस्तों के संदेश या मीडिया कभी नहीं पढ़ता।',
    continue: 'जारी रखें',
    iosGotIt: 'समझ गया',
    openSettings: 'सेटिंग्स खोलें',
    deniedHelper:
      'अनुमति अस्वीकृत हुई। जारी रखने के लिए सेटिंग्स में FlowMoney के लिए SMS पहुँच सक्षम करें।',
  },

  categories: {
    food: 'भोजन',
    transport: 'परिवहन',
    bills: 'बिल',
    shopping: 'ख़रीदारी',
    entertainment: 'मनोरंजन',
    health: 'स्वास्थ्य',
    subscriptions: 'सब्सक्रिप्शन',
    transfer: 'स्थानांतरण',
    other: 'अन्य',
  },

  insightEngine: {
    weeklyUp: {
      title: 'इस सप्ताह ख़र्च {{change}}% बढ़ा',
      description:
        'आप {{daily}} प्रतिदिन पर चल रहे हैं — पिछले सप्ताह से तेज़।',
    },
    weeklyDown: {
      title: 'इस सप्ताह आप बेहतर कर रहे हैं',
      description:
        'आपका ख़र्च पिछले सप्ताह से {{change}}% कम है। यही जारी रखें।',
    },
    topCategory: {
      title: '{{category}} आपका सबसे बड़ा ख़र्च',
      description: '{{category}} इस माह का {{percent}}% — {{total}}।{{tail}}',
      tail: ' यह आपकी अगली श्रेणी {{runnerUp}} ({{runnerUpTotal}}) से {{ratio}}× ज़्यादा है।',
    },
    weekend: {
      title: 'आपके वीकेंड ज़्यादा महँगे',
      description:
        'वीकेंड दिन हफ़्ते के दिनों से {{percent}}% ज़्यादा ख़र्च में रहे। पिछला वीकेंड {{total}} रहा।',
    },
    lateNight: {
      title: 'देर रात के ख़र्च नज़र आते हैं',
      description:
        'पिछले 30 दिनों में {{total}} रात 9 से 12 के बीच ख़र्च हुए।{{tail}}',
      tail: ' अधिकांश {{category}} ({{percent}}%) में है।',
    },
    frequentMerchant: {
      title: 'इस सप्ताह {{merchant}} पर {{count}} ऑर्डर',
      description:
        'यह {{count}} लेन-देन में कुल {{total}} है — औसतन {{average}}।',
    },
    accelerating: {
      title: 'ख़र्च की रफ़्तार बढ़ रही है',
      description:
        'पिछले 3 दिनों का औसत {{recent}} प्रति दिन — पिछले दो हफ़्तों के {{baseline}} प्रति दिन से ऊपर।',
    },
    biggestThisWeek: {
      title: 'इस सप्ताह का सबसे बड़ा ख़र्च',
      description: '{{day}} को {{merchant}} पर {{amount}}।',
    },
    betterMonth: {
      title: 'बेहतर महीने की ओर',
      description:
        'पिछले माह के इसी समय से आप {{change}}% कम ख़र्च कर रहे हैं — {{thisMonth}} बनाम {{lastMonth}}।',
    },
  },

  insightCard: {
    label: {
      positive: 'अच्छी ख़बर',
      warning: 'ध्यान दें',
      alert: 'देख लें',
      neutral: 'पैटर्न',
    },
  },

  trend: {
    onTrack: 'सही रास्ते पर',
    up: '{{percent}}% ऊपर',
    down: '{{percent}}% नीचे',
  },

  notifications: {
    received: '{{merchant}} से {{amount}} प्राप्त',
    receivedShort: '{{merchant}} से +{{amount}}',
    receivedDash: '{{merchant}} — +{{amount}}',
    spent: 'आपने अभी {{merchant}} पर {{amount}} ख़र्च किए',
    spentShort: '{{merchant}} पर {{amount}}',
    spentDash: '{{merchant}} — {{amount}}',
    overAverageTitle: 'आप सामान्य से ज़्यादा तेज़ी से ख़र्च कर रहे हैं',
    overAverageBody:
      'आज आपके औसत से {{percent}}% ऊपर चल रहा है। {{amount}} ख़र्च हुए।',
  },

  language: {
    en: 'English',
    ur: 'اردو',
    hi: 'हिन्दी',
    systemDefault: 'सिस्टम डिफ़ॉल्ट',
  },
};
