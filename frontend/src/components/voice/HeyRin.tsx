import { useAuth } from '@/features/auth/AuthContext';
import { motion } from 'framer-motion';
import {
CheckCircle2,
ChevronDown,
Copy,
ExternalLink,
Forward,
Hash,
Loader2,MessageSquare,
Mic,MicOff,
Radio,
Send,
Users,
Volume2,VolumeX,
X,
XCircle,
} from 'lucide-react';
import React,{ useCallback,useEffect,useRef,useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useVenue } from '../../hooks/useVenue';
import api from '../../lib/api';
import { smartCopy } from '../../lib/copyUtils';
import './HeyRin.css';
import RinMascot from './RinMascot';

/* ─── Markdown-lite Renderer (ported from AICopilot) ──────────── */
function renderMarkdown(text: string): React.ReactNode {
    if (!text) return null;
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let inTable = false;
    let tableRows: string[][] = [];
    let tableKey = 0;

    const flushTable = () => {
        if (tableRows.length > 0) {
            const headers = tableRows[0];
            const body = tableRows.slice(2);
            elements.push(
                <div key={`table-${tableKey++}`} className="rin-md-table-wrap">
                    <table className="rin-md-table">
                        <thead>
                            <tr>
                                {headers.map((h, i) => (
                                    <th key={i}>{renderInline(h.trim())}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {body.map((row, ri) => (
                                <tr key={ri}>
                                    {row.map((cell, ci) => (
                                        <td key={ci}>{renderInline(cell.trim())}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
            tableRows = [];
        }
        inTable = false;
    };

    const renderInline = (text: string): React.ReactNode => {
        const parts = text.split(/(\*\*[^*]+\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i}>{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
                return <em key={i}>{part.slice(1, -1)}</em>;
            }
            return part;
        });
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.includes('|') && line.trim().startsWith('|')) {
            const cells = line.split('|').filter(c => c.trim() !== '');
            if (cells.length > 0) {
                if (!inTable) inTable = true;
                if (cells.every(c => c.trim().match(/^[-:]+$/))) {
                    tableRows.push(cells.map(c => c.trim()));
                    continue;
                }
                tableRows.push(cells.map(c => c.trim()));
                continue;
            }
        } else if (inTable) {
            flushTable();
        }

        if (line.startsWith('# ')) {
            elements.push(<h3 key={i} className="rin-md-h1">{renderInline(line.slice(2))}</h3>);
        } else if (line.startsWith('## ')) {
            elements.push(<h4 key={i} className="rin-md-h2">{renderInline(line.slice(3))}</h4>);
        } else if (line.startsWith('- ')) {
            elements.push(
                <div key={i} className="rin-md-li">
                    <span className="rin-md-bullet">•</span>
                    <span>{renderInline(line.slice(2))}</span>
                </div>
            );
        } else if (line.startsWith('_') && line.endsWith('_')) {
            elements.push(<p key={i} className="rin-md-hint">{line.slice(1, -1)}</p>);
        } else if (line.trim()) {
            elements.push(<p key={i} className="rin-md-p">{renderInline(line)}</p>);
        } else {
            elements.push(<div key={i} className="rin-md-spacer" />);
        }
    }

    if (inTable) flushTable();
    return <>{elements}</>;
}

/* ─── Language Config ──────────────────────────────────────────── */
const LANGUAGES = [
    { code: 'en-GB', label: 'English', flag: '\u{1F1EC}\u{1F1E7}' },
    { code: 'tr-TR', label: 'Türkçe', flag: '\u{1F1F9}\u{1F1F7}' },
    { code: 'mt-MT', label: 'Malti', flag: '\u{1F1F2}\u{1F1F9}' },
    { code: 'it-IT', label: 'Italiano', flag: '\u{1F1EE}\u{1F1F9}' },
    { code: 'es-ES', label: 'Español', flag: '\u{1F1EA}\u{1F1F8}' },
] as const;

type LangCode = typeof LANGUAGES[number]['code'];

/* ─── Types ───────────────────────────────────────────────────── */
interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly [index: number]: { transcript: string; confidence: number };
}

interface SpeechRecognitionEvent {
    readonly results: SpeechRecognitionResult[];
    readonly resultIndex: number;
}

interface ActionPayload {
    type: string;
    requires_confirmation: boolean;
    sensitivity: 'normal' | 'sensitive' | 'critical';
    icon: string;
    label: string;
    params: /**/any;
}

interface RinMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    intent?: string;
    source?: string;
    processing_ms?: number;
    timestamp: string;
    action?: ActionPayload;
}

/* ─── Wake Word Detection ─────────────────────────────────────── */
const WAKE_WORDS = [
    // "Hey Rin" variants (speech recognition often mishears)
    'hey rin', 'hey rain', 'hey wren', 'heyrin', 'hey ring', 'hey run',
    // "Rin" standalone
    'rin', 'rain', 'wren',
    // "Hey Restin" variants
    'hey restin', 'hey resting', 'hey rest in', 'heyrestin', 'hey rest-in',
];

function containsWakeWord(transcript: string): boolean {
    const lower = transcript.toLowerCase().trim();
    if (WAKE_WORDS.some(w => w.includes(' ') && lower.includes(w))) return true;
    const words = lower.split(/\s+/);
    return WAKE_WORDS.filter(w => !w.includes(' ')).some(w => words.includes(w));
}

function stripWakeWord(transcript: string): string {
    let result = transcript;
    for (const w of WAKE_WORDS) {
        result = result.replace(new RegExp(w, 'gi'), '').trim();
    }
    return result;
}

/* ─── TTS Helper ──────────────────────────────────────────────── */
function speak(text: string, lang: LangCode): void {
    if (!('speechSynthesis' in window)) return;
    const clean = text
        .replace(/\*\*/g, '').replace(/\*/g, '')
        .replace(/\|/g, ' ').replace(/---/g, '')
        .replace(/[#_`]/g, '').replace(/\n+/g, '. ')
        .replace(/\s+/g, ' ').trim();

    const chunks = clean.match(/.{1,200}[.!?,;\s]|.{1,200}/g) || [clean];
    window.speechSynthesis.cancel();
    chunks.forEach(chunk => {
        const utterance = new SpeechSynthesisUtterance(chunk.trim());
        utterance.lang = lang;
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
    });
}

/* ─── LocalStorage Keys ───────────────────────────────────────── */
const STORAGE_KEY = 'heyrin_messages';
const SESSION_KEY = 'heyrin_session';

function loadSavedMessages(): RinMessage[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

function saveMessages(msgs: RinMessage[]): void {
    try {
        // Keep last 100 messages
        const toSave = msgs.slice(-100);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch { /* quota exceeded — ignore */ }
}

function loadSessionId(): string {
    try {
        const stored = localStorage.getItem(SESSION_KEY);
        if (stored) return stored;
    } catch { /* ignore */ }
    const newId = `rin-${Date.now()}`;
    try { localStorage.setItem(SESSION_KEY, newId); } catch { /* ignore */ }
    return newId;
}

/* ─── Panel Tab Types ─────────────────────────────────────────── */
type PanelTab = 'voice' | 'walkie' | 'hive';

/* ─── Walkie-Talkie Data ──────────────────────────────────────── */
const WALKIE_CHANNELS = ['General', 'Kitchen', 'Service', 'Management'];
const CHANNEL_MEMBERS = [
    { name: 'Maria', initials: 'ML', color: '#ef4444' },
    { name: 'Marco', initials: 'CM', color: '#f59e0b' },
    { name: 'John', initials: 'JK', color: '#22c55e' },
    { name: 'Sarah', initials: 'SP', color: '#8b5cf6' },
    { name: 'Alex', initials: 'AK', color: '#06b6d4' },
];

/* ─── Main Component ──────────────────────────────────────────── */
export default function HeyRin() {
    const { activeVenueId } = useVenue();
    const { user } = useAuth();
    const location = useLocation();

    // Don't render on public (unauthenticated) pages
    const publicPaths = ['/', '/login', '/register', '/technic', '/modules'];
    const isPublicPage = publicPaths.includes(location.pathname);
    if (!user || isPublicPage) return null;

    const venueId = activeVenueId || localStorage.getItem('venueId') || '';

    // State
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<PanelTab>('voice');
    const [isListening, setIsListening] = useState(false);
    const [isWakeListening, setIsWakeListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(true);
    const [lang, setLang] = useState<LangCode>('en-GB');
    const [showLangPicker, setShowLangPicker] = useState(false);
    const [messages, setMessages] = useState<RinMessage[]>(() => loadSavedMessages());
    const [transcript, setTranscript] = useState('');
    const [textInput, setTextInput] = useState('');

    // Walkie state
    const [isTalking, setIsTalking] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [walkieChannel, setWalkieChannel] = useState('General');
    const [showChannelPicker, setShowChannelPicker] = useState(false);

    // Action confirmation state
    const [pendingAction, setPendingAction] = useState<ActionPayload | null>(null);
    const [isExecuting, setIsExecuting] = useState(false);

    // Hive mini-chat state
    const [hiveMsgInput, setHiveMsgInput] = useState('');
    const [hiveMessages, setHiveMessages] = useState([
        { id: '1', sender: 'Maria', initials: 'ML', color: '#ef4444', text: 'Table 5 order is ready 🍕', time: '23:42' },
        { id: '2', sender: 'Marco', initials: 'CM', color: '#f59e0b', text: 'On it!', time: '23:43' },
        { id: '3', sender: 'John', initials: 'JK', color: '#22c55e', text: 'Need more napkins at bar', time: '23:45' },
    ]);

    // Refs
    const recognitionRef = useRef<{ stop: () => void; start: () => void } | null>(null);
    const wakeRecognitionRef = useRef<{ stop: () => void; start: () => void } | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const hiveMsgEndRef = useRef<HTMLDivElement>(null);
    const sessionIdRef = useRef<string>(loadSessionId());

    // Scroll on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        hiveMsgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [hiveMessages]);

    // Persist messages
    useEffect(() => {
        saveMessages(messages);
    }, [messages]);

    // ─── Send Query to Backend (uses /ai/ask like AICopilot) ────
    const sendQuery = useCallback(async (text: string) => {
        if (!text.trim() || !venueId) return;

        // Voice confirmation for pending action
        const CONFIRM_WORDS = ['yes', 'evet', 'tamam', 'onayla', 'confirm', 'onay', 'do it', 'yap'];
        const CANCEL_WORDS = ['no', 'hayır', 'iptal', 'cancel', 'vazgeç', 'stop'];
        const lower = text.toLowerCase().trim();

        if (pendingAction) {
            if (CONFIRM_WORDS.some(w => lower.includes(w))) {
                executeAction();
                return;
            }
            if (CANCEL_WORDS.some(w => lower.includes(w))) {
                cancelAction();
                return;
            }
        }

        const userMsg: RinMessage = {
            id: `u-${Date.now()}`, role: 'user', content: text,
            timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, userMsg]);
        setIsProcessing(true);

        try {
            const res = await api.post('/ai/ask',
                { query: text, session_id: sessionIdRef.current },
                { params: { venue_id: venueId } }
            );
            const data = res.data;
            const botMsg: RinMessage = {
                id: `b-${Date.now()}`, role: 'assistant',
                content: data.response || 'No response.',
                intent: data.intent,
                source: data.source,
                processing_ms: data.processing_ms,
                timestamp: new Date().toISOString(),
                action: data.action || undefined,
            };
            setMessages(prev => [...prev, botMsg]);

            // Store pending action if present
            if (data.action?.requires_confirmation) {
                setPendingAction(data.action);
            }

            if (isSpeaking && activeTab === 'voice') speak(data.response || '', lang);
        } catch {
            setMessages(prev => [...prev, {
                id: `e-${Date.now()}`, role: 'assistant',
                content: '⚠️ Connection error. Please try again.',
                timestamp: new Date().toISOString(),
            }]);
        } finally {
            setIsProcessing(false);
        }
    }, [venueId, isSpeaking, lang, activeTab, pendingAction]);

    // ─── Execute Confirmed Action ──────────────────────────────
    const executeAction = useCallback(async () => {
        if (!pendingAction || !venueId) return;
        setIsExecuting(true);

        try {
            const res = await api.post('/ai/execute',
                { action_type: pendingAction.type, params: pendingAction.params },
                { params: { venue_id: venueId } }
            );
            const data = res.data;
            const resultMsg: RinMessage = {
                id: `a-${Date.now()}`, role: 'assistant',
                content: data.success
                    ? `✅ ${data.message || 'İşlem tamamlandı.'}`
                    : `❌ ${data.message || 'İşlem başarısız.'}`,
                timestamp: new Date().toISOString(),
            };
            setMessages(prev => [...prev, resultMsg]);
            if (isSpeaking && data.success) speak(data.message || 'İşlem tamamlandı.', lang);
        } catch {
            setMessages(prev => [...prev, {
                id: `ae-${Date.now()}`, role: 'assistant',
                content: '❌ İşlem sırasında hata oluştu.',
                timestamp: new Date().toISOString(),
            }]);
        } finally {
            setPendingAction(null);
            setIsExecuting(false);
        }
    }, [pendingAction, venueId, isSpeaking, lang]);

    const cancelAction = useCallback(() => {
        setPendingAction(null);
        setMessages(prev => [...prev, {
            id: `c-${Date.now()}`, role: 'assistant',
            content: '🚫 İşlem iptal edildi.',
            timestamp: new Date().toISOString(),
        }]);
    }, []);

    // ─── Active Listening ───────────────────────────────────────
    const startListening = useCallback(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SR = (window as /**/any).SpeechRecognition || (window as /**/any).webkitSpeechRecognition;
        if (!SR) return;
        recognitionRef.current?.stop();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recognition = new (SR as { new(): /**/any })();
        recognition.lang = lang;
        recognition.interimResults = true;
        recognition.continuous = false;

        recognition.onstart = () => { setIsListening(true); };
        recognition.onresult = (event: SpeechRecognitionEvent) => {
            const result = event.results[event.results.length - 1];
            setTranscript(result[0].transcript);
            if (result.isFinal) {
                setTranscript('');
                sendQuery(result[0].transcript);
                setIsListening(false);
            }
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognitionRef.current = recognition;
        recognition.start();
    }, [lang, sendQuery]);

    const stopListening = useCallback(() => {
        recognitionRef.current?.stop();
        setIsListening(false);
    }, []);

    // ─── Wake Word Listener ─────────────────────────────────────
    const startWakeWordListener = useCallback(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SR = (window as /**/any).SpeechRecognition || (window as /**/any).webkitSpeechRecognition;
        if (!SR) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recognition = new (SR as { new(): /**/any })();
        recognition.lang = lang;
        recognition.interimResults = true;
        recognition.continuous = true;
        recognition.maxAlternatives = 3;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const text = event.results[i][0].transcript;
                if (containsWakeWord(text)) {
                    recognition.stop();
                    setIsOpen(true);
                    setActiveTab('voice');
                    const command = stripWakeWord(text).trim();
                    if (command.length > 3 && event.results[i].isFinal) {
                        sendQuery(command);
                    } else {
                        setTimeout(() => startListening(), 300);
                    }
                    return;
                }
            }
        };
        recognition.onerror = () => setTimeout(() => startWakeWordListener(), 1000);
        recognition.onend = () => { if (isWakeListening && !isListening) setTimeout(() => startWakeWordListener(), 200); };
        wakeRecognitionRef.current = recognition;
        recognition.start();
    }, [lang, isWakeListening, isListening, startListening, sendQuery]);

    useEffect(() => {
        if (isWakeListening && !isListening) startWakeWordListener();
        else wakeRecognitionRef.current?.stop();
        return () => { wakeRecognitionRef.current?.stop(); };
    }, [isWakeListening, isListening, startWakeWordListener]);

    useEffect(() => {
        return () => {
            recognitionRef.current?.stop();
            wakeRecognitionRef.current?.stop();
            window.speechSynthesis?.cancel();
        };
    }, []);

    // ─── Space Key PTT for Walkie ────────────────────────────────
    useEffect(() => {
        if (activeTab !== 'walkie' || !isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !e.repeat && !isMuted) {
                e.preventDefault();
                setIsTalking(true);
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
                setIsTalking(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [activeTab, isOpen, isMuted]);

    // ─── Hive send handler ──────────────────────────────────────
    const sendHiveMsg = (e: React.FormEvent) => {
        e.preventDefault();
        if (!hiveMsgInput.trim()) return;
        setHiveMessages(prev => [...prev, {
            id: `h-${Date.now()}`,
            sender: user?.name || 'You',
            initials: (user?.name || 'Y').slice(0, 2).toUpperCase(),
            color: '#dc2626',
            text: hiveMsgInput.trim(),
            time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        }]);
        setHiveMsgInput('');
    };

    // ─── Text submit ────────────────────────────────────────────
    const handleTextSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (textInput.trim()) {
            sendQuery(textInput.trim());
            setTextInput('');
        }
    };

    // ─── Clear history ──────────────────────────────────────────
    const clearHistory = () => {
        setMessages([]);
        localStorage.removeItem(STORAGE_KEY);
        const newSession = `rin-${Date.now()}`;
        sessionIdRef.current = newSession;
        try { localStorage.setItem(SESSION_KEY, newSession); } catch { /* ignore */ }
    };

    const currentLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

    return (
        <>
            {/* ─── Composite FAB ──────────────────────────────── */}
            {!isOpen && (
                <motion.div
                    className="rin-fab-group"
                    drag
                    dragMomentum={false}
                    dragElastic={0.1}
                >
                    <button
                        className={`rin-fab-main ${isWakeListening ? 'wake-active' : ''}`}
                        onClick={() => { setActiveTab('voice'); setIsOpen(true); }}
                        title="Hey Rin — AI Assistant"
                        aria-label="Hey Rin AI assistant"
                    >
                        <RinMascot size={36} listening={isWakeListening} />
                        {isWakeListening && <span className="rin-wake-dot" />}
                    </button>

                    <button
                        className="rin-fab-mini rin-fab-walkie"
                        onClick={(e) => { e.stopPropagation(); setActiveTab('walkie'); setIsOpen(true); }}
                        title="Walkie-Talkie"
                        aria-label="Open Walkie-Talkie"
                    >
                        <Radio size={11} />
                    </button>

                    <button
                        className="rin-fab-mini rin-fab-hive"
                        onClick={(e) => { e.stopPropagation(); setActiveTab('hive'); setIsOpen(true); }}
                        title="Hive Chat"
                        aria-label="Open Hive Chat"
                    >
                        <MessageSquare size={11} />
                    </button>
                </motion.div>
            )}


            {/* ─── Compact Popup Panel ────────────────────────── */}
            {isOpen && (
                <motion.div
                    className="rin-popup"
                    drag
                    dragMomentum={false}
                    dragElastic={0.1}
                    style={{ touchAction: "none"  /* keep-inline */ }} /* keep-inline */ /* keep-inline */
                >
                    {/* Header */}
                    <div className="rin-header" style={{ cursor: "move"  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                        <div className="rin-header-left">
                            <RinMascot size={24} listening={isProcessing} />
                            <span className="rin-title">Hey Rin</span>
                            <span className="rin-badge">AI</span>
                        </div>
                        <div className="rin-header-actions">
                            <button className={`rin-icon-btn ${isWakeListening ? 'active' : ''}`}
                                onClick={() => setIsWakeListening(!isWakeListening)}
                                title={isWakeListening ? 'Disable wake word' : 'Enable "Hey Rin"'}
                                aria-label="Toggle wake word">
                                <Mic size={13} />
                            </button>

                            <div className="rin-lang-wrap">
                                <button className="rin-icon-btn" onClick={() => setShowLangPicker(!showLangPicker)}
                                    title="Language" aria-label="Change language">
                                    <span className="rin-flag">{currentLang.flag}</span>
                                </button>
                                {showLangPicker && (
                                    <div className="rin-lang-dropdown">
                                        {LANGUAGES.map(l => (
                                            <button key={l.code}
                                                className={`rin-lang-opt ${lang === l.code ? 'sel' : ''}`}
                                                onClick={() => { setLang(l.code); setShowLangPicker(false); }}>
                                                <span className="rin-flag">{l.flag}</span>
                                                <span>{l.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button className={`rin-icon-btn ${isSpeaking ? 'active' : ''}`}
                                onClick={() => { setIsSpeaking(!isSpeaking); window.speechSynthesis?.cancel(); }}
                                title={isSpeaking ? 'Mute' : 'Unmute'} aria-label="Toggle speech">
                                {isSpeaking ? <Volume2 size={13} /> : <VolumeX size={13} />}
                            </button>

                            <button className="rin-icon-btn" onClick={() => setIsOpen(false)}
                                title="Close" aria-label="Close Hey Rin">
                                <X size={13} />
                            </button>
                        </div>
                    </div>

                    {/* ─── Tabs ─────────────────────────────────── */}
                    <div className="rin-tabs">
                        <button className={`rin-tab ${activeTab === 'voice' ? 'active' : ''}`}
                            onClick={() => setActiveTab('voice')}>
                            <Mic size={12} /> Hey Rin
                        </button>
                        <button className={`rin-tab ${activeTab === 'walkie' ? 'active' : ''}`}
                            onClick={() => setActiveTab('walkie')}>
                            <Radio size={12} /> Walkie
                        </button>
                        <button className={`rin-tab ${activeTab === 'hive' ? 'active' : ''}`}
                            onClick={() => setActiveTab('hive')}>
                            <MessageSquare size={12} /> Hive
                        </button>
                    </div>

                    {/* ═══ Voice Tab (Hey Rin AI) ═══════════════════ */}
                    {activeTab === 'voice' && (
                        <div className="rin-voice-body">
                            <div className="rin-messages">
                                {messages.length === 0 && (
                                    <div className="rin-empty">
                                        <RinMascot size={64} listening={false} />
                                        <h3>Hey Rin</h3>
                                        <p>Your AI assistant. Ask anything about your restaurant.</p>
                                        <div className="rin-hints">
                                            <button onClick={() => sendQuery('System overview')}>📊 Overview</button>
                                            <button onClick={() => sendQuery('Who is working?')}>👥 Staff</button>
                                            <button onClick={() => sendQuery('Shift schedule')}>📅 Shifts</button>
                                            <button onClick={() => sendQuery('How many recipes?')}>📋 Recipes</button>
                                            <button onClick={() => sendQuery('Low stock?')}>⚠️ Stock</button>
                                        </div>
                                    </div>
                                )}

                                {messages.map(msg => (
                                    <div key={msg.id} className={`rin-msg ${msg.role}`}>
                                        {msg.role === 'assistant' && (
                                            <div className="rin-msg-avatar">
                                                <RinMascot size={20} />
                                            </div>
                                        )}
                                        <div className="rin-msg-bubble">
                                            {msg.role === 'assistant'
                                                ? renderMarkdown(msg.content)
                                                : msg.content
                                            }
                                            {/* ─── Action Confirmation Card ────── */}
                                            {msg.action && pendingAction?.type === msg.action.type && (
                                                <div className={`rin-action-card ${msg.action.sensitivity === 'sensitive' ? 'sensitive' : ''}`}>
                                                    <div className="rin-action-header">
                                                        <span className="rin-action-icon">{msg.action.icon}</span>
                                                        <span className="rin-action-label">{msg.action.label}</span>
                                                        {msg.action.sensitivity === 'sensitive' && (
                                                            <span className="rin-action-warn">⚠️ Hassas</span>
                                                        )}
                                                    </div>
                                                    <div className="rin-action-params">
                                                        {Object.entries(msg.action.params).filter(([, v]) => v).map(([k, v]) => (
                                                            <div key={k} className="rin-action-param">
                                                                <span className="rin-param-key">{k}:</span>
                                                                <span className="rin-param-val">{String(v)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="rin-action-buttons">
                                                        <button
                                                            className="rin-action-cancel-btn"
                                                            onClick={cancelAction}
                                                            disabled={isExecuting}
                                                        >
                                                            <XCircle size={14} /> İptal
                                                        </button>
                                                        <button
                                                            className="rin-action-confirm-btn"
                                                            onClick={executeAction}
                                                            disabled={isExecuting}
                                                        >
                                                            {isExecuting
                                                                ? <><Loader2 size={14} className="spin" /> Çalışıyor...</>
                                                                : <><CheckCircle2 size={14} /> Onayla</>
                                                            }
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                            {msg.role === 'assistant' && msg.source && (
                                                <span className="rin-msg-meta">
                                                    {msg.source}{msg.processing_ms ? ` · ${msg.processing_ms}ms` : ''}
                                                </span>
                                            )}
                                        </div>
                                        {msg.role === 'assistant' && (
                                            <div className="rin-msg-actions">
                                                <button
                                                    onClick={() => smartCopy(msg.content)}
                                                    className="rin-msg-action-btn"
                                                    title="Kopyala"
                                                    aria-label="Copy message"
                                                >
                                                    <Copy size={11} />
                                                </button>
                                                <button
                                                    onClick={() => smartCopy(msg.content)}
                                                    className="rin-msg-action-btn"
                                                    title="İlet"
                                                    aria-label="Forward message"
                                                >
                                                    <Forward size={11} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {isProcessing && (
                                    <div className="rin-msg assistant">
                                        <div className="rin-msg-avatar">
                                            <RinMascot size={20} listening />
                                        </div>
                                        <div className="rin-msg-bubble thinking">
                                            <Loader2 size={12} className="spin" /> Thinking...
                                        </div>
                                    </div>
                                )}

                                {transcript && (
                                    <div className="rin-transcript"><Mic size={11} /> {transcript}</div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input bar */}
                            <div className="rin-controls">
                                {messages.length > 0 && (
                                    <button className="rin-clear-btn" onClick={clearHistory}
                                        title="Clear history" aria-label="Clear conversation history">
                                        🗑
                                    </button>
                                )}
                                <button
                                    className={`rin-mic-btn ${isListening ? 'listening' : ''}`}
                                    onClick={isListening ? stopListening : startListening}
                                    title={isListening ? 'Stop' : 'Speak'}
                                    aria-label={isListening ? 'Stop listening' : 'Start listening'}
                                >
                                    {isListening ? <Loader2 size={16} className="spin" /> : <Mic size={16} />}
                                </button>
                                <form className="rin-input-form" onSubmit={handleTextSubmit}>
                                    <input aria-label="Input"
                                        type="text"
                                        className="rin-text-input"
                                        value={textInput}
                                        onChange={e => setTextInput(e.target.value)}
                                        placeholder="Ask Rin anything..."
                                    />
                                    <button type="submit" className="rin-send-btn" disabled={!textInput.trim()}
                                        title="Send" aria-label="Send message">
                                        <Send size={14} />
                                    </button>
                                </form>
                            </div>

                            {/* Open full Hey Rin page */}
                            <button className="rin-open-full" onClick={() => { setIsOpen(false); window.location.href = '/manager/ai/copilot'; }}
                                title="Open full Hey Rin" aria-label="Open full Hey Rin page">
                                <ExternalLink size={11} /> Open Hey Rin
                            </button>
                        </div>
                    )}

                    {/* ═══ Walkie-Talkie Tab ════════════════════════ */}
                    {activeTab === 'walkie' && (
                        <div className="wk-body">
                            <div className="wk-scroll-area">
                                {/* Channel Selector */}
                                <div className="wk-channel-bar">
                                    <button className="wk-channel-btn"
                                        onClick={() => setShowChannelPicker(!showChannelPicker)}
                                        title="Select channel" aria-label="Select channel">
                                        <Hash size={13} />
                                        <span>{walkieChannel}</span>
                                        <span className="wk-online-count">{CHANNEL_MEMBERS.length} on</span>
                                        <ChevronDown size={12} />
                                    </button>
                                    {showChannelPicker && (
                                        <div className="wk-channel-dropdown">
                                            {WALKIE_CHANNELS.map(ch => (
                                                <button key={ch}
                                                    className={`wk-ch-opt ${ch === walkieChannel ? 'sel' : ''}`}
                                                    onClick={() => { setWalkieChannel(ch); setShowChannelPicker(false); }}>
                                                    <Hash size={11} /> {ch}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* PTT Area */}
                                <div className="wk-ptt-area">
                                    <div className={`wk-signal ${isTalking ? 'active' : ''}`}>
                                        <span /><span /><span /><span /><span /><span /><span />
                                    </div>

                                    <button
                                        className={`wk-mic-circle ${isTalking ? 'talking' : ''} ${isMuted ? 'muted' : ''}`}
                                        onMouseDown={() => !isMuted && setIsTalking(true)}
                                        onMouseUp={() => setIsTalking(false)}
                                        onMouseLeave={() => setIsTalking(false)}
                                        onTouchStart={() => !isMuted && setIsTalking(true)}
                                        onTouchEnd={() => setIsTalking(false)}
                                        onClick={() => { if (!isTalking) setIsMuted(!isMuted); }}
                                        title={isMuted ? 'Unmute' : 'Hold to talk'}
                                        aria-label={isMuted ? 'Unmute microphone' : 'Hold to talk'}
                                    >
                                        {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
                                    </button>

                                    <p className="wk-hint">
                                        {isTalking ? '🔴 Talking...' : isMuted ? 'Tap to unmute' : 'Hold to talk · Space'}
                                    </p>
                                </div>

                                {/* Online Members */}
                                <div className="wk-members">
                                    <div className="wk-members-label">
                                        <Users size={11} /> ON THIS CHANNEL
                                    </div>
                                    <div className="wk-member-chips">
                                        {CHANNEL_MEMBERS.map(m => (
                                            <div key={m.name} className="wk-chip">
                                                <span className="wk-avatar" style={{ background: m.color  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>{m.initials}</span>
                                                <span className="wk-name">{m.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Open full Walkie-Talkie */}
                            <button className="rin-open-full" onClick={() => { setIsOpen(false); window.location.href = '/manager/hive'; }}
                                title="Open full Walkie-Talkie" aria-label="Open full Walkie-Talkie">
                                <ExternalLink size={11} /> Open Walkie-Talkie
                            </button>
                        </div>
                    )}

                    {/* ═══ Hive Mini Chat Tab ═══════════════════════ */}
                    {activeTab === 'hive' && (
                        <div className="hv-body">
                            {/* Messages */}
                            <div className="hv-messages">
                                {hiveMessages.map(msg => (
                                    <div key={msg.id} className={`hv-msg ${msg.sender === (user?.name || 'You') ? 'me' : ''}`}>
                                        {msg.sender !== (user?.name || 'You') && (
                                            <span className="hv-avatar" style={{ background: msg.color  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>{msg.initials}</span>
                                        )}
                                        <div className="hv-bubble">
                                            {msg.sender !== (user?.name || 'You') && (
                                                <span className="hv-sender">{msg.sender}</span>
                                            )}
                                            <span className="hv-text">{msg.text}</span>
                                            <span className="hv-time">{msg.time}</span>
                                        </div>
                                    </div>
                                ))}
                                <div ref={hiveMsgEndRef} />
                            </div>

                            {/* Input */}
                            <form className="hv-input-bar" onSubmit={sendHiveMsg}>
                                <input aria-label="Input"
                                    type="text"
                                    className="hv-input"
                                    placeholder="Message #General..."
                                    value={hiveMsgInput}
                                    onChange={e => setHiveMsgInput(e.target.value)}
                                />
                                <button type="submit" className="hv-send" disabled={!hiveMsgInput.trim()}
                                    title="Send" aria-label="Send hive message">
                                    <Send size={14} />
                                </button>
                            </form>

                            {/* Open full */}
                            <button className="rin-open-full" onClick={() => { setIsOpen(false); window.location.href = '/manager/hive'; }}
                                title="Open full Hive" aria-label="Open full Hive chat">
                                <ExternalLink size={11} /> Open Hive Chat
                            </button>
                        </div>
                    )}
                </motion.div>
            )}
        </>
    );
}
