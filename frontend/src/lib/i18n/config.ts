import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        fallbackLng: 'en',
        debug: false,
        interpolation: {
            escapeValue: false,
        },
        resources: {
            en: {
                translation: {
                    common: {
                        loading: 'Loading...',
                        error: 'Something went wrong',
                        save: 'Save',
                        cancel: 'Cancel',
                        sync: 'Sync All',
                    },
                    restin: {
                        crm: {
                            title: 'Autopilot CRM',
                            subtitle: 'Autonomous retention and growth engine.',
                            boomerang: 'Run "Boomerang" Protocol',
                            campaignStudio: 'Campaign Studio',
                            stats: {
                                totalGuests: 'Total Guests',
                                churnRisk: 'Churn Risk',
                                aiCampaigns: 'AI Campaigns',
                                retentionRate: 'Retention Rate',
                            },
                        },
                        ops: {
                            title: 'Ops & Aggregator Hub',
                            subtitle: 'Real-time operational efficiency and delivery injection.',
                            metrics: {
                                avgPrep: 'Avg Prep Time',
                                errorRate: 'Error Rate',
                                labourCost: 'Labour Cost %',
                            },
                        },
                        fintech: {
                            title: 'Fintech & Omni-Payment',
                            subtitle: 'Seamless transaction management and kiosk configurations.',
                            kioskInit: 'Enter Kiosk Mode',
                            kioskExit: 'Exit Kiosk Mode',
                            terminalHub: 'Terminal Hub',
                        },
                    },
                },
            },
        },
    });

export default i18n;
