/**
 * Restin AI — Message Constants (i18n-ready)
 * ============================================
 * All AI Copilot user-facing strings centralized here.
 * When i18next is integrated, replace these with t('key') calls.
 *
 * Usage:  import { AI_MSG } from '@/lib/ai-messages';
 */

export const AI_MSG = {
    // ─── Access Control ────────────────────────────
    accessDenied: {
        title: '🔒 **Erişim Kısıtlı**',
        body: (label: string, tier: string) =>
            `${label.charAt(0).toUpperCase() + label.slice(1)} bilgisine erişim yetkiniz bulunmamaktadır.\n` +
            `Bu verilere yalnızca yönetici ve üzeri yetkiye sahip kullanıcılar erişebilir.\n\n` +
            `_Yetki seviyeniz: **${tier}**_`,
    },
    externalAiDenied: {
        title: '🔒 **Harici AI Erişimi Kısıtlı**',
        body: 'Harici AI (Gemini/OpenAI) kullanımı maliyet oluşturduğu için ' +
            'yalnızca yönetici ve üzeri yetkiye sahip kullanıcılara açıktır.\n\n' +
            '_Yerel AI ile sormaya devam edebilirsiniz._',
    },
    externalAiDisabled: {
        title: '🔒 **Harici AI devre dışı.**',
        body: 'Daha derin analiz için harici AI (Gemini/OpenAI) desteği açılabilir.\n' +
            '**Ayarlar → AI Yapılandırma** bölümünden etkinleştirin.\n\n' +
            '_Bu özellik ek maliyet doğurabilir._',
    },

    // ─── Rate Limiting ─────────────────────────────
    rateLimited: {
        title: '⏳ **Rate Limit**',
        body: (remaining: number) =>
            `Çok fazla sorgu gönderdiniz. Lütfen biraz bekleyin.\n_Kalan hak: ${remaining} / dakika_`,
    },

    // ─── General ───────────────────────────────────
    empty: 'Lütfen bir soru sorun.',
    aiError: '⚠️ AI servisine bağlanamadı. Lütfen tekrar deneyin.',
    noApiKey: '⚠️ API anahtarı yapılandırılmamış. Ayarlar → AI Yapılandırma\'dan ekleyin.',

    // ─── Copilot Header ────────────────────────────
    copilotSubtitle: 'Sıfır maliyet • Venue verinize hakim • Türkçe & English',
    roleBadge: {
        owner: '👑 Owner',
        manager: '🔧 Manager',
        staff: '👤 Staff',
    },

    // ─── Help Command ──────────────────────────────
    helpFooter: '_Türkçe veya İngilizce sorabilirsin!_',
    escalationHint: 'Bu soruyu daha detaylı analiz etmek için harici AI kullanılabilir.',

    // ─── Intent Labels (for denied messages) ───────
    intentLabels: {
        sales_today: 'satış verileri',
        sales_period: 'dönemsel satış raporları',
        top_sellers: 'en çok satan ürünler',
        suppliers: 'tedarikçi bilgileri',
    } as Record<string, string>,

    // ─── Hive Chat AI ──────────────────────────────
    hiveWelcome: [
        '🤖 **Merhaba! Ben Hey Rin.**\n',
        'Venue verilerinize tam hâkimim. Bana şunları sorabilirsiniz:\n',
        '• 💰 _Bugünkü satışlar nedir?_',
        '• 📦 _Envanter özeti göster_',
        '• ⚠️ _Düşük stok var mı?_',
        '• 👨‍🍳 _Kimler çalışıyor?_',
        '• 📋 _Kaç tarif var?_',
        '• 🗑️ _Fire raporu_\n',
        '_Türkçe veya İngilizce sorabilirsiniz!_',
    ].join('\n'),
    hiveSenderName: '✨ Hey Rin',
} as const;
