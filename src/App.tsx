import { useState, useEffect, useMemo, FormEvent } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Shield, ShieldAlert, ShieldCheck, Info, History, Trash2, Send, Loader2, AlertTriangle, CheckCircle2, ChevronRight, Download, X, ThumbsUp, ThumbsDown, Languages, Settings, Mail, Forward, Users, Bell, FileText, Lock, LogOut, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { scanText, ScanResult } from './services/geminiService';
import { translations, AppLanguage } from './constants/translations';
import { FamilyShield } from './components/FamilyShield';
import { SettingsView } from './components/SettingsView';
import { NotificationSystem } from './components/NotificationSystem';
import { URLScanner } from './components/URLScanner';
import { AuthPage } from './components/AuthPage';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import AuthCallbackPage from './components/AuthCallbackPage';
import supabase, { ScanHistory as DBScanHistory, FamilyAlert } from './lib/supabase';
import { Sun, Moon } from 'lucide-react';

const AppLogo = ({ className = "h-10" }: { className?: string }) => (
  <img src="/image_0.png" alt="SentryAI Logo" className={className} referrerPolicy="no-referrer" />
);

interface ScanHistoryItem extends ScanResult {
  id: string;
  text: string;
  timestamp: Date;
}

const FeedbackForm = ({ onDismiss, language = 'English' }: { onDismiss?: () => void, language?: Exclude<AppLanguage, 'Auto'> }) => {
  const t = translations[language];
  const [rating, setRating] = useState<'accurate' | 'inaccurate' | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Simulate submission
    console.log('Feedback submitted:', { rating, comment });
    setSubmitted(true);
    if (onDismiss) {
      setTimeout(onDismiss, 2000);
    }
  };

    if (submitted) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-6 bg-cyan-500/10 border-2 border-cyan-500/30 rounded-2xl text-center shadow-xl"
      >
        <CheckCircle2 className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
        <p className="text-base font-black text-cyan-400 uppercase tracking-widest">{t.feedbackReceived}</p>
        <p className="text-sm text-white/60 mt-2 uppercase tracking-wider font-bold">{t.helpful}</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6 p-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-white/40 uppercase tracking-widest">{t.rateAccuracy || 'Rate accuracy'}</span>
        <div className="flex gap-4">
          <button 
            onClick={() => setRating('accurate')}
            className={`p-4 rounded-xl transition-all shadow-lg ${rating === 'accurate' ? 'bg-cyan-400 text-black scale-110' : 'bg-white/5 text-white/40 hover:text-white'}`}
          >
            <ThumbsUp className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setRating('inaccurate')}
            className={`p-4 rounded-xl transition-all shadow-lg ${rating === 'inaccurate' ? 'bg-red-500 text-black scale-110' : 'bg-white/5 text-white/40 hover:text-white'}`}
          >
            <ThumbsDown className="w-6 h-6" />
          </button>
        </div>
      </div>
      
      {rating && (
        <motion.form 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t.addComments}
            className="w-full bg-white/5 border-2 border-white/10 rounded-2xl p-4 text-base text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 resize-none h-32 font-sans leading-relaxed"
          />
          <button 
            type="submit"
            className="w-full py-4 bg-cyan-400 text-black rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:bg-cyan-300 shadow-xl active:scale-95"
          >
            {t.submitFeedback}
          </button>
        </motion.form>
      )}
    </div>
  );
};

const ForwardingOptions = ({ 
  data, 
  language = 'English', 
  onComplete 
}: { 
  data: ScanResult, 
  language?: Exclude<AppLanguage, 'Auto'>,
  onComplete: () => void
}) => {
  const t = translations[language];
  const [includeRisk, setIncludeRisk] = useState(true);
  const [includeTags, setIncludeTags] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleForward = () => {
    // Validation: Ensure at least one data point is selected
    if (!includeRisk && !includeTags && (!includeMetadata || !data.emailMetadata)) {
      setError(language === 'Arabic' ? 'يرجى اختيار بيانات واحدة على الأقل للتقرير' : 'Please select at least one data point for the report');
      return;
    }

    setError(null);
    const subject = `[Security Alert] Suspicious Content Detected - Risk: ${data.risk}`;
    let body = `SECURITY ANALYSIS REPORT\n`;
    body += `Generated by SentryAI\n`;
    body += `----------------------------------------\n\n`;
    
    if (includeRisk) {
      body += `RISK LEVEL: ${data.risk}\n`;
    }
    
    body += `EXPLANATION: ${data.explanation}\n\n`;

    if (includeTags && data.tags.length > 0) {
      body += `THREAT INDICATORS:\n- ${data.tags.join('\n- ')}\n\n`;
    }

    if (includeMetadata && data.emailMetadata) {
      body += `EXTRACTED METADATA:\n`;
      if (data.emailMetadata.sender) body += `From: ${data.emailMetadata.sender}\n`;
      if (data.emailMetadata.recipient) body += `To: ${data.emailMetadata.recipient}\n`;
      if (data.emailMetadata.subject) body += `Subject: ${data.emailMetadata.subject}\n`;
      if (data.emailMetadata.body) body += `Body Preview: ${data.emailMetadata.body.substring(0, 200)}...\n`;
      body += `\n`;
    }

    body += `----------------------------------------\n`;
    body += `This report was automatically generated for human review.`;

    const mailtoUrl = `mailto:security-ops@example.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
    onComplete();
  };

  return (
    <div className="space-y-8 bg-white/[0.04] border-2 border-white/10 p-8 rounded-3xl shadow-xl">
      <div className="flex items-center gap-4 mb-2">
        <Forward className="w-6 h-6 text-cyan-400" />
        <h3 className="text-base font-black uppercase tracking-widest">{t.forwardAnalysis}</h3>
      </div>
      
      <div className="space-y-5">
        <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">{t.selectData}</p>
        
        <label className="flex items-center gap-4 cursor-pointer group">
          <input 
            type="checkbox" 
            checked={includeRisk} 
            onChange={() => {
              setIncludeRisk(!includeRisk);
              setError(null);
            }}
            className="w-6 h-6 rounded-lg border-white/20 bg-white/5 text-cyan-400 focus:ring-cyan-400/50 transition-all"
          />
          <span className="text-base font-bold text-white/60 group-hover:text-white transition-colors">{t.includeRisk}</span>
        </label>

        <label className="flex items-center gap-4 cursor-pointer group">
          <input 
            type="checkbox" 
            checked={includeTags} 
            onChange={() => {
              setIncludeTags(!includeTags);
              setError(null);
            }}
            className="w-6 h-6 rounded-lg border-white/20 bg-white/5 text-cyan-400 focus:ring-cyan-400/50 transition-all"
          />
          <span className="text-base font-bold text-white/60 group-hover:text-white transition-colors">{t.includeTags}</span>
        </label>

        {data.emailMetadata && (
          <label className="flex items-center gap-4 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={includeMetadata} 
              onChange={() => {
                setIncludeMetadata(!includeMetadata);
                setError(null);
              }}
              className="w-6 h-6 rounded-lg border-white/20 bg-white/5 text-cyan-400 focus:ring-cyan-400/50 transition-all"
            />
            <span className="text-base font-bold text-white/60 group-hover:text-white transition-colors">{t.includeMetadata}</span>
          </label>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-black uppercase tracking-wider shadow-lg"
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={handleForward}
        className={`w-full py-5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3 ${
          error ? 'bg-white/5 text-white/20' : 'bg-cyan-400 text-black hover:bg-cyan-300'
        }`}
      >
        <Mail className="w-5 h-5" />
        {t.sendNow}
      </button>
    </div>
  );
};

const ScanHistory = ({ language, history, setHistory, t, isRTL, theme, getRiskColor, getRiskIcon, openModal, clearHistory, exportToCSV }: any) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-cyan-400" />
          <h2 className={`text-xl font-extrabold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{t.historyTitle}</h2>
        </div>
        {history.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 text-cyan-400/60 hover:text-cyan-400 text-[10px] font-mono uppercase tracking-widest transition-colors py-2 px-4 rounded-lg bg-cyan-400/5 hover:bg-cyan-400/10"
            >
              <Download className="w-3 h-3" />
              {t.exportCsv}
            </button>
            <button
              onClick={clearHistory}
              className="flex items-center gap-2 text-red-500/60 hover:text-red-500 text-[10px] font-mono uppercase tracking-widest transition-colors py-2 px-4 rounded-lg bg-red-500/5 hover:bg-red-500/10"
            >
              <Trash2 className="w-3 h-3" />
              {t.clearHistory}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {history.length > 0 ? (
          history.map((item: any) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => openModal(item)}
              className={`group ${theme === 'dark' ? 'bg-[#151619] border-white/5 hover:border-white/20' : 'bg-white border-slate-200 hover:border-cyan-400/30 shadow-sm'} border rounded-xl p-4 transition-all cursor-pointer`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  <div className={`mt-1 p-2 rounded-lg border ${getRiskColor(item.risk)}`}>
                    {getRiskIcon(item.risk)}
                  </div>
                  <div className="space-y-2 flex-1">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                          <span className={`font-black text-2xl tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{item.risk} Threat</span>
                          {item.classification && (
                            <span className={`text-xs font-black italic px-3 py-1 rounded-lg border ${
                              item.classification === 'Safe' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20'
                            }`}>
                              {t[`classification${item.classification.replace(/\s+/g, '')}`] || item.classification}
                            </span>
                          )}
                          {item.action && (
                            <span className="text-[10px] font-black bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2 py-1 rounded uppercase tracking-tighter">
                              {item.action}
                            </span>
                          )}
                          <span className={`text-xs font-bold ${theme === 'dark' ? 'text-white/40' : 'text-slate-400'} uppercase bg-white/5 px-2 py-1 rounded`}>
                            {item.timestamp.toLocaleTimeString()} — {item.timestamp.toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    {item.emailMetadata && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {item.emailMetadata.sender && (
                          <span className={`text-[10px] font-bold ${theme === 'dark' ? 'text-white/40' : 'text-slate-400'} uppercase tracking-widest bg-white/5 px-2 py-1 rounded border border-white/10`}>
                            {t.sender}: {item.emailMetadata.sender}
                          </span>
                        )}
                        {item.emailMetadata.subject && (
                          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest bg-cyan-400/10 px-2 py-1 rounded border border-cyan-400/20">
                            {t.subject}: {item.emailMetadata.subject}
                          </span>
                        )}
                      </div>
                    )}
                    <p className={`text-base ${theme === 'dark' ? 'text-white/60' : 'text-slate-500'} line-clamp-2 italic leading-relaxed`}>
                      {t.historyContent}: {item.text}
                    </p>
                    <p className={`text-lg ${theme === 'dark' ? 'text-white/90' : 'text-slate-800'} border-l-4 border-cyan-400 pl-4 py-1 leading-relaxed font-bold`}>
                      {item.explanation}
                    </p>
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className={`w-4 h-4 ${theme === 'dark' ? 'text-white/20' : 'text-slate-300'}`} />
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className={`py-24 text-center space-y-4 ${theme === 'dark' ? 'bg-[#151619]/50 border-white/5' : 'bg-slate-100/50 border-slate-200'} rounded-3xl border border-dashed`}>
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
              <History className={`w-8 h-8 ${theme === 'dark' ? 'text-white/10' : 'text-slate-300'}`} />
            </div>
            <p className={`font-mono text-xs uppercase tracking-widest ${theme === 'dark' ? 'text-white/20' : 'text-slate-400'}`}>
              {t.emptyHistory}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

function Dashboard({ user, profile, language, setLanguage, theme, setTheme }: any) {
  const [inputText, setInputText] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(() => {
    const saved = localStorage.getItem('sentry_last_result');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'scanner' | 'url-scanner' | 'history' | 'family' | 'settings'>('scanner');
  const [showModal, setShowModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [modalData, setModalData] = useState<ScanResult | null>(null);
  const [showForwardScanner, setShowForwardScanner] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  const uiLanguage = language === 'Auto' ? 'English' : language;
  const t = translations[uiLanguage];
  const isRTL = language === 'Arabic';

  const languages = [
    { code: 'AUTO', name: 'Auto' },
    { code: 'EN', name: 'English' },
    { code: 'AR', name: 'Arabic' },
    { code: 'ES', name: 'Spanish' },
    { code: 'FR', name: 'French' },
    { code: 'DE', name: 'German' },
    { code: 'NL', name: 'Dutch' }
  ] as const;

  const liveSignals = useMemo(() => {
    if (!inputText.trim()) return [];
    
    const signals: { type: string, label: string, severity: 'warn' | 'crit' }[] = [];
    const text = inputText.toLowerCase();

    // Urgency Patterns
    if (/\b(urgent|immediately|asap|24 hours|expire|suspended|closed|action required)\b/.test(text)) {
      signals.push({ type: 'Urgency', label: 'High Urgency Detected', severity: 'crit' });
    }

    // Financial Triggers
    if (/\b(bank|account|transfer|wires|payment|prize|won|reward|lottery|crypto|bitcoin)\b/.test(text)) {
      signals.push({ type: 'Financial', label: 'Financial Trigger Keywords', severity: 'warn' });
    }

    // Credential Harvesting
    if (/\b(password|login|verify|identity|ssn|credentials|security code|otp)\b/.test(text)) {
      signals.push({ type: 'Auth', label: 'Sensitive Data Request', severity: 'crit' });
    }

    // Link/Action patterns
    if (/\b(click here|link below|bit\.ly|t\.co|shorturl)\b/.test(text)) {
      signals.push({ type: 'Action', label: 'Suspicious Call to Action', severity: 'warn' });
    }

    return signals;
  }, [inputText]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('sentry_history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        const now = new Date().getTime();
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

        // Filter out entries older than 7 days and convert strings back to Date objects
        const filteredHistory = parsed
          .map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp)
          }))
          .filter((item: any) => {
            return (now - item.timestamp.getTime()) < SEVEN_DAYS_MS;
          });

        setHistory(filteredHistory);
      } catch (e) {
        console.error('Failed to load history', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('sentry_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (result) {
      localStorage.setItem('sentry_last_result', JSON.stringify(result));
    } else {
      localStorage.removeItem('sentry_last_result');
    }
  }, [result]);

  const openModal = (data: ScanResult) => {
    setModalData(data);
    setShowForwardModal(false);
    setShowModal(true);
  };

  const handleScan = async () => {
    if (!inputText.trim() || isScanning) return;

    console.log("SentryAI: Initiating scan protocol for content length:", inputText.length);
    setIsScanning(true);
    setResult(null);
    setShowForwardScanner(false);

    try {
      const scanResult = await scanText(inputText, language);
      console.log("SentryAI: Scan complete. Result:", scanResult);
      setResult(scanResult);
      
      // Send family alert if user is a senior and threat is high
      if (profile?.role === 'senior' && profile.guardian_id && (scanResult.risk === 'High' || (scanResult.risk as string) === 'Critical')) {
        await (supabase.from('family_alerts') as any).insert({
          senior_id: profile.id,
          guardian_id: profile.guardian_id,
          alert_type: 'critical_threat',
          message: `${profile.full_name || 'Senior'} received a ${scanResult.risk} threat.`,
          is_read: false
        });
      }
      
      const newHistoryItem: ScanHistoryItem = {
        id: crypto.randomUUID(),
        text: inputText,
        ...scanResult,
        timestamp: new Date()
      };
      
      setHistory(prev => [newHistoryItem, ...prev].slice(0, 50));
    } catch (error) {
      console.error('Scan failed', error);
    } finally {
      setIsScanning(false);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('sentry_history');
  };

  const exportToCSV = () => {
    if (history.length === 0) return;

    const headers = ['Timestamp', 'Original Text', 'Risk Level', 'Explanation'];
    const rows = history.map(item => [
      item.timestamp.toISOString(),
      `"${item.text.replace(/"/g, '""').replace(/\n/g, ' ')}"`, // Escape quotes and remove newlines for CSV
      item.risk,
      `"${item.explanation.replace(/"/g, '""')}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sentry_audit_log_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLogout = async () => {
    console.log("SentryAI: Initiating sign out protocol...");
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('sentry_last_result');
      // Auth state change will handle redirection
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'High': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'Medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'Low': return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'High': return <ShieldAlert className="w-5 h-5 text-red-500" />;
      case 'Medium': return <Info className="w-5 h-5 text-amber-500" />;
      case 'Low': return <ShieldCheck className="w-5 h-5 text-cyan-400" />;
      default: return <Shield className="w-5 h-5 text-gray-500" />;
    }
  };

  const tabs = [
    { id: 'scanner', icon: Shield, label: language === 'Arabic' ? 'الفحص' : 'Scanner' },
    { id: 'url-scanner', icon: ShieldAlert, label: language === 'Arabic' ? 'الروابط' : 'URL Check' },
    { id: 'history', icon: History, label: language === 'Arabic' ? 'التنبيهات' : 'History' },
    { id: 'family', icon: Users, label: language === 'Arabic' ? 'العائلة' : 'Family' },
    { id: 'settings', icon: Settings, label: language === 'Arabic' ? 'الإعدادات' : 'Settings' }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-[#06080A] text-[#E4E3E0]' : 'bg-slate-50 text-slate-900'} font-sans selection:bg-cyan-400 selection:text-black ${isRTL ? 'text-right' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Sidebar for Desktop */}
      <aside className={`fixed top-0 bottom-0 ${isRTL ? 'right-0 border-l' : 'left-0 border-r'} w-24 hidden md:flex flex-col items-center py-10 space-y-8 ${theme === 'dark' ? 'bg-[#0D0D0D] border-white/5' : 'bg-white border-slate-200'} z-50`}>
        <div className="flex justify-center w-full">
          <AppLogo className="h-12 object-contain mx-auto" />
        </div>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`group flex flex-col items-center gap-1.5 transition-all duration-300 ${isActive ? 'scale-110' : 'hover:scale-105'}`}
            >
              <div className={`p-3.5 rounded-2xl transition-all duration-300 ${isActive ? 'bg-cyan-400/10 text-cyan-400' : 'text-[#888888] hover:text-slate-400 dark:hover:text-white'}`}>
                <Icon className="w-6 h-6" />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-tighter transition-colors duration-300 ${isActive ? 'text-cyan-400' : 'text-[#888888]'} ${isRTL ? 'font-cairo' : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
        
        <div className="mt-auto pb-4 flex flex-col items-center gap-4">
           <button 
             onClick={() => setShowHelpModal(true)}
             className={`p-3.5 rounded-2xl transition-all ${theme === 'dark' ? 'text-[#888888] hover:text-cyan-400 hover:bg-cyan-400/5' : 'text-slate-400 hover:text-cyan-600 hover:bg-cyan-50'}`}
             title="Help Centre"
           >
             <HelpCircle className="w-6 h-6" />
           </button>
           <button 
             onClick={handleLogout}
             className="p-3.5 rounded-2xl text-[#888888] hover:text-red-500 hover:bg-red-500/5 transition-all"
             title="Log Out"
           >
             <LogOut className="w-6 h-6" />
           </button>
        </div>
      </aside>

      {/* Main Content Container */}
      <div className={`relative max-w-6xl mx-auto px-6 py-12 ${isRTL ? 'md:pr-32' : 'md:pl-32'} pb-32`}>
        {/* Background Decor */}
        {theme === 'dark' && (
          <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
            <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-cyan-400/10 rounded-full blur-[120px]" />
            <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-cyan-400/10 rounded-full blur-[120px]" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-150" />
          </div>
        )}

        {/* Header */}
        <header className={`flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 border-b ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'} pb-8`}>
          <div>
            <div className="flex items-center gap-4 mb-2">
              <AppLogo className="h-12 object-contain" />
              <h1 className={`text-4xl font-extrabold tracking-tighter ${theme === 'dark' ? 'bg-gradient-to-br from-white via-white to-cyan-400/50 bg-clip-text text-transparent' : 'text-slate-900'} drop-shadow-sm leading-none`}>
                SentryAI
              </h1>
            </div>
            <p className="text-cyan-400 text-sm font-bold uppercase tracking-widest mb-4">
              {t.slogan}
            </p>
            <p className={`${theme === 'dark' ? 'text-white/60' : 'text-slate-500'} max-w-md text-base leading-relaxed`}>
              {t.tagline} <br />
              {t.engine}
            </p>
          </div>

          <div className="flex items-center gap-4">
             <NotificationSystem language={uiLanguage} theme={theme} />
             <button 
               onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
               className={`p-3 rounded-2xl transition-all shadow-sm border ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white/60' : 'bg-white border-slate-200 text-slate-500'}`}
             >
               {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
             </button>
             <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold border-2 border-white dark:border-white/10 shadow-lg uppercase">
                {profile?.full_name?.[0] || user?.email?.[0] || 'U'}
             </div>
          </div>
        </header>

        <main>
          <AnimatePresence mode="wait">
            {activeTab === 'scanner' && (
              <motion.div
                key="scanner"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                {/* Input Section */}
                <div className="space-y-6">
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-1000"></div>
                    <textarea
                      id="threat-input"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={t.placeholder}
                      className={`relative w-full h-[360px] ${theme === 'dark' ? 'bg-[#0E1012] border-white/10' : 'bg-white border-slate-200'} border-2 rounded-2xl p-8 text-xl focus:outline-none focus:border-cyan-400 transition-all placeholder:text-slate-400 resize-none font-sans leading-relaxed shadow-2xl`}
                    />
                    
                    <div className="absolute bottom-6 right-6 flex items-center gap-6">
                      <button
                        id="scan-button"
                        onClick={handleScan}
                        disabled={!inputText.trim() || isScanning}
                        className="flex items-center gap-3 bg-cyan-400 hover:bg-cyan-300 disabled:bg-slate-200 disabled:text-slate-400 text-black px-10 py-5 rounded-2xl text-lg font-black transition-all transform active:scale-95 shadow-[0_0_30px_rgba(34,211,238,0.4)]"
                      >
                        {isScanning ? (
                          <>
                            <Loader2 className="w-6 h-6 animate-spin" />
                            {t.scanning.toUpperCase()}
                          </>
                        ) : (
                          <>
                            <Send className="w-6 h-6" />
                            {t.scan.toUpperCase()}
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 px-2">
                    <div className="flex gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/40" />
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/20" />
                    </div>
                    <p className={`text-[10px] font-mono ${theme === 'dark' ? 'text-white/40' : 'text-slate-400'} uppercase tracking-[0.2em]`}>
                      {t.historyScanning || "Neural patterns active"}
                    </p>
                  </div>
                </div>

                {/* Analysis Results Display */}
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`space-y-8 pt-8 border-t-2 ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'}`}
                  >
                    <div className={`${theme === 'dark' ? 'bg-[#121417] border-white/10' : 'bg-white border-slate-200'} border rounded-2xl overflow-hidden shadow-2xl`}>
                          <div className={`p-4 border-b ${theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'} flex items-center justify-between`}>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-mono ${theme === 'dark' ? 'text-white/40' : 'text-slate-400'} uppercase tracking-widest leading-none`}>{t.securityResult}</span>
                          {result.detectedLanguage && (
                            <span className={`text-[9px] font-mono ${theme === 'dark' ? 'bg-white/5 text-white/30 border-white/5' : 'bg-slate-100 text-slate-500 border-slate-200'} px-2 py-0.5 rounded border uppercase tracking-tighter`}>
                              {t.detected}: {result.detectedLanguage}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                           <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest">{t.verifiedLog}</span>
                        </div>
                      </div>
                      
                      {/* Email Metadata Section */}
                      {result.emailMetadata && (
                        <div className={`px-8 py-6 border-b ${theme === 'dark' ? 'border-white/5 bg-cyan-400/[0.02]' : 'border-slate-100 bg-slate-50/50'}`}>
                          <div className="flex items-center gap-3 mb-6">
                            <div className={`p-2 ${theme === 'dark' ? 'bg-cyan-400/10 border-cyan-400/20' : 'bg-cyan-400/5 border-slate-200'} rounded-lg border`}>
                              <Mail className="w-4 h-4 text-cyan-400" />
                            </div>
                            <div>
                               <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-[0.2em] font-bold block">Email Forensics</span>
                               <span className={`text-[9px] ${theme === 'dark' ? 'text-white/20' : 'text-slate-400'} uppercase tracking-widest`}>Metadata Extraction Active</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              {result.emailMetadata.sender && (
                                <div className="group">
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <Send className={`w-3 h-3 ${theme === 'dark' ? 'text-white/20' : 'text-slate-300'}`} />
                                    <label className={`text-[9px] font-mono ${theme === 'dark' ? 'text-white/30' : 'text-slate-400'} uppercase tracking-widest`}>{t.sender}</label>
                                  </div>
                                  <p className={`text-xs ${theme === 'dark' ? 'text-white/80 bg-white/[0.03] border-white/5 group-hover:border-white/10' : 'text-slate-600 bg-white border-slate-100 group-hover:border-slate-200'} font-mono break-all p-3 rounded-xl border transition-colors shadow-inner`}>{result.emailMetadata.sender}</p>
                                </div>
                              )}
                            </div>
                            <div className="space-y-4">
                              {result.emailMetadata.subject && (
                                <div className="group">
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <Shield className={`w-3 h-3 ${theme === 'dark' ? 'text-white/20' : 'text-slate-300'}`} />
                                    <label className={`text-[9px] font-mono ${theme === 'dark' ? 'text-white/30' : 'text-slate-400'} uppercase tracking-widest`}>{t.subject}</label>
                                  </div>
                                  <p className={`text-xs text-cyan-400 font-bold ${theme === 'dark' ? 'bg-white/[0.03] border-white/5 group-hover:border-white/10' : 'bg-white border-slate-100 group-hover:border-slate-200'} p-3 rounded-xl border transition-colors shadow-inner`}>{result.emailMetadata.subject}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Analysis Results Display */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className={`border-b ${theme === 'dark' ? 'border-white/10 bg-white/[0.02] text-white/40' : 'border-slate-100 bg-slate-50 text-slate-500'} text-xs font-bold uppercase tracking-widest ${isRTL ? 'text-right' : ''}`}>
                              <th className="px-8 py-6 font-bold">{t.riskAssessment}</th>
                              <th className="px-8 py-6 font-bold">{t.threatClassification}</th>
                              <th className="px-8 py-6 font-bold">{t.technicalBriefing}</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className={`px-8 py-10 align-top ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'} w-[20%] ${isRTL ? 'border-l' : 'border-r'}`}>
                                <div className={`inline-flex items-center gap-4 p-5 rounded-2xl border-2 ${getRiskColor(result.risk)}`}>
                                  {getRiskIcon(result.risk)}
                                  <span className="text-3xl font-black uppercase tracking-tight">{result.risk}</span>
                                </div>
                              </td>
                          <td className={`px-8 py-10 align-top ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'} w-[30%] ${isRTL ? 'border-l' : 'border-r'}`}>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <span className={`text-[10px] font-mono ${theme === 'dark' ? 'text-white/40' : 'text-slate-400'} uppercase tracking-widest block`}>{t.detected}</span>
                                <p className={`text-2xl font-black italic tracking-tighter ${
                                  result.classification === 'Safe' ? 'text-emerald-500' : 'text-cyan-400'
                                }`}>
                                  {t[`classification${result.classification.replace(/\s+/g, '')}`] || result.classification}
                                </p>
                              </div>
                              {result.action && (
                                <div className={`pt-4 border-t ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'} space-y-1`}>
                                  <span className={`text-[9px] font-mono ${theme === 'dark' ? 'text-white/30' : 'text-slate-400'} uppercase tracking-widest block`}>Recommended Action</span>
                                  <p className={`text-base font-black ${result.risk === 'High' ? 'text-red-500' : 'text-cyan-400'} uppercase tracking-widest`}>
                                    {result.action}
                                  </p>
                                </div>
                              )}
                            </div>
                          </td>
                              <td className="px-8 py-10 align-top">
                                <p className={`leading-relaxed italic font-bold text-2xl ${theme === 'dark' ? 'text-white' : 'text-slate-900'} ${isRTL ? 'text-right' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                                  "{result.explanation}"
                                </p>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Threat Indicators Container */}
                      <div className="px-8 py-6 border-t border-white/5">
                        <h3 className={`text-[10px] font-bold ${theme === 'dark' ? 'text-white/40' : 'text-slate-400'} uppercase tracking-[0.3em] mb-4`}>{t.threatIndicators}</h3>
                        <div className="flex flex-wrap gap-2">
                          {result.tags.length > 0 ? result.tags.map(tag => (
                            <motion.span 
                              key={tag}
                              initial={{ scale: 0.9, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="bg-cyan-500/10 border border-cyan-500/30 px-3 py-1.5 rounded-lg text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                              {tag}
                            </motion.span>
                          )) : (
                            <span className="text-white/40 font-bold text-[10px] uppercase italic">{t.noIndicators}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="max-w-md space-y-8">
                       {showForwardScanner ? (
                         <motion.div
                           initial={{ opacity: 0, scale: 0.95 }}
                           animate={{ opacity: 1, scale: 1 }}
                         >
                           <ForwardingOptions 
                             data={result} 
                             language={uiLanguage} 
                             onComplete={() => setShowForwardScanner(false)} 
                           />
                         </motion.div>
                       ) : (
                         <button
                           onClick={() => setShowForwardScanner(true)}
                           className={`w-full py-4 ${theme === 'dark' ? 'bg-white/[0.03] border-white/10 text-white/60 hover:bg-white/[0.08]' : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'} border rounded-2xl flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-widest hover:text-white transition-all shadow-sm`}
                         >
                           <Forward className="w-4 h-4" />
                           {t.forwardToSecurity}
                         </button>
                       )}
                       <FeedbackForm language={uiLanguage} />
                    </div>
                  </motion.div>
                )}
                
                {!result && !isScanning && (
                   <div className={`py-24 text-center border-2 border-dashed ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'} rounded-3xl opacity-20`}>
                      <Shield className="w-16 h-16 mx-auto mb-4" />
                      <p className="text-sm font-mono uppercase tracking-widest">{t.emptyHistory.split('.')[0]} // Idle</p>
                   </div>
                )}
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <ScanHistory language={uiLanguage} history={history} setHistory={setHistory} t={t} isRTL={isRTL} theme={theme} getRiskColor={getRiskColor} getRiskIcon={getRiskIcon} openModal={openModal} clearHistory={clearHistory} exportToCSV={exportToCSV} />
              </motion.div>
            )}

            {activeTab === 'url-scanner' && (
              <motion.div
                key="url-scanner"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <URLScanner language={uiLanguage} theme={theme} />
              </motion.div>
            )}

            {activeTab === 'family' && (
              <motion.div
                key="family"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <FamilyShield language={uiLanguage} />
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <SettingsView 
                  language={language} 
                  setLanguage={setLanguage} 
                  theme={theme} 
                  setTheme={setTheme} 
                  user={user}
                  profile={profile}
                  onLogout={handleLogout}
                  onOpenHelp={() => setShowHelpModal(true)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className={`mt-24 pt-12 border-t ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'} flex flex-col md:flex-row justify-between gap-12 pb-12`}>
          <div className="space-y-4">
            <div className={`flex items-center gap-3 group cursor-help ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)] animate-pulse" />
              <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white/60' : 'text-slate-500'} uppercase tracking-widest`}>
                {t.systemNominal}
              </span>
            </div>
            <p className={`text-xs ${theme === 'dark' ? 'text-white/20' : 'text-slate-400'} max-w-sm uppercase font-bold tracking-widest leading-relaxed ${isRTL ? 'text-right' : ''}`}>
               SentryAI Terminal v1.1.0 <br />
               Created for digital safety and analysis aid.
            </p>
          </div>
          
          <div className={`flex items-end gap-10 text-xs font-bold ${theme === 'dark' ? 'text-white/40' : 'text-slate-400'} uppercase tracking-widest ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex flex-col gap-2 ${isRTL ? 'items-start' : 'items-end'}`}>
              <span>{t.securityLevel}</span>
              <span className="text-cyan-400 font-black opacity-100 text-sm tracking-tighter">{t.restricted}</span>
            </div>
            <div className={`flex flex-col gap-2 ${isRTL ? 'items-start' : 'items-end'}`}>
              <span>{t.dataCenter}</span>
              <span className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} opacity-80 leading-none`}>{t.region}</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Bottom Navigation for Mobile */}
      <nav className={`fixed bottom-6 left-6 right-6 h-20 ${theme === 'dark' ? 'bg-[#0D0D0D]/80 border-white/10' : 'bg-white/80 border-slate-200'} backdrop-blur-2xl border rounded-[28px] md:hidden flex items-center justify-around px-4 z-50 shadow-2xl`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center gap-1 transition-all duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}
            >
              <div className={`p-3 rounded-2xl transition-all duration-300 ${isActive ? 'bg-cyan-400 text-black shadow-lg shadow-cyan-500/30' : 'text-[#888888]'}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-tighter ${isActive ? 'text-cyan-400' : 'text-[#888888]'} ${isRTL ? 'font-cairo' : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Threat Alert Modal */}
      <AnimatePresence>
        {showModal && modalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-[#151619] border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
            >
              <div className={`h-2 w-full ${modalData.risk === 'High' ? 'bg-red-500' : 'bg-amber-500'}`} />
              
              <button 
                onClick={() => setShowModal(false)}
                className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-8 md:p-12">
                <div className="flex items-center gap-4 mb-8">
                  <div className={`p-4 rounded-2xl ${modalData.risk === 'High' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tighter uppercase italic leading-none">
                      {modalData.risk} {t.modalRisk}
                    </h2>
                    <div className="flex flex-wrap gap-3 mt-4">
                       {modalData.tags?.map(tag => (
                          <span key={tag} className="text-white/60 font-bold text-xs uppercase tracking-widest border-2 border-white/20 px-3 py-1 rounded-xl bg-white/5">
                            {tag}
                          </span>
                       ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-8">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white/40">{t.briefing}</h3>
                    <p className={`text-white leading-relaxed italic font-bold text-2xl border-cyan-400 py-4 ${isRTL ? 'border-r-4 pr-8 text-right' : 'border-l-4 pl-8'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                      "{modalData.explanation}"
                    </p>
                  </div>

                  {modalData.emailMetadata && (
                    <div className="space-y-6 bg-white/[0.06] border-2 border-white/20 rounded-3xl p-8 shadow-2xl">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="p-2.5 bg-cyan-400/10 rounded-xl border-2 border-cyan-400/30">
                          <Mail className="w-5 h-5 text-cyan-400" />
                        </div>
                        <span className="text-sm font-black text-cyan-400 uppercase tracking-widest">Extracted Forensics</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {modalData.emailMetadata.sender && (
                          <div className="space-y-2">
                            <span className="text-xs font-bold text-white/40 uppercase block tracking-widest">{t.sender}</span>
                            <span className="text-sm font-bold text-white/90 block truncate bg-white/10 p-3 rounded-xl border border-white/10">{modalData.emailMetadata.sender}</span>
                          </div>
                        )}
                        {modalData.emailMetadata.recipient && (
                          <div className="space-y-2">
                            <span className="text-xs font-bold text-white/40 uppercase block tracking-widest">{t.recipient}</span>
                            <span className="text-sm font-bold text-white/90 block truncate bg-white/10 p-3 rounded-xl border border-white/10">{modalData.emailMetadata.recipient}</span>
                          </div>
                        )}
                        {modalData.emailMetadata.subject && (
                          <div className="space-y-2">
                            <span className="text-xs font-bold text-white/40 uppercase block tracking-widest">{t.subject}</span>
                            <span className="text-sm font-bold text-cyan-400 block truncate bg-cyan-400/10 p-3 rounded-xl border border-cyan-400/20">{modalData.emailMetadata.subject}</span>
                          </div>
                        )}
                      </div>
                      {modalData.emailMetadata.body && (
                        <div className="space-y-2 pt-4">
                           <span className="text-xs font-bold text-white/40 uppercase block tracking-widest">{t.bodyLabel}</span>
                           <p className="text-base text-white/70 leading-relaxed italic bg-white/10 p-5 rounded-xl border border-white/10">
                             "{modalData.emailMetadata.body.length > 200 ? `${modalData.emailMetadata.body.substring(0, 200)}...` : modalData.emailMetadata.body}"
                           </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="space-y-6">
                    <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white/40">{t.countermeasures}</h3>
                    <div className="bg-red-500/10 border-2 border-red-500/20 p-8 rounded-3xl flex items-start gap-6 shadow-xl">
                      <AlertTriangle className="w-10 h-10 text-red-500 flex-shrink-0" />
                      <div>
                        <p className="text-lg font-black text-white uppercase tracking-tight">{t.doNotInteract}</p>
                        <p className="text-sm text-white/80 mt-2 leading-relaxed font-bold">{t.countermeasuresDesc}</p>
                      </div>
                    </div>
                  </div>

                  {showForwardModal ? (
                    <ForwardingOptions 
                      data={modalData} 
                      language={uiLanguage} 
                      onComplete={() => setShowForwardModal(false)} 
                    />
                  ) : (
                    <button
                      onClick={() => setShowForwardModal(true)}
                      className="w-full py-6 bg-cyan-400 text-black rounded-2xl flex items-center justify-center gap-4 text-xs font-black uppercase tracking-widest hover:bg-cyan-300 transition-all shadow-2xl active:scale-95"
                    >
                      <Forward className="w-6 h-6" />
                      {t.forwardToSecurity}
                    </button>
                  )}
                </div>

                <div className="mt-8 pt-8 border-t border-white/5">
                  <FeedbackForm language={uiLanguage} onDismiss={() => setShowModal(false)} />
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-8 py-3 bg-white text-black rounded-xl font-bold hover:bg-cyan-400 transition-colors shadow-lg active:scale-95"
                  >
                    {t.modalUnderstand}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Help Centre Modal */}
      <AnimatePresence>
        {showHelpModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHelpModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`relative w-full max-w-2xl ${theme === 'dark' ? 'bg-[#151619] border-white/10' : 'bg-white border-slate-200'} border rounded-3xl overflow-hidden shadow-2xl`}
            >
              <div className={`p-6 border-b ${theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'} flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-400/10 rounded-lg border border-cyan-400/20">
                    <HelpCircle className="w-5 h-5 text-cyan-400" />
                  </div>
                  <span className={`text-xs font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {language === 'Arabic' ? 'مركز المساعدة' : 'Help Centre'}
                  </span>
                </div>
                <button 
                  onClick={() => setShowHelpModal(false)}
                  className={`p-2 hover:bg-white/5 rounded-full transition-colors ${theme === 'dark' ? 'text-white/40 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 md:p-12 space-y-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                  <h3 className={`text-sm font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`}>
                    {language === 'Arabic' ? 'كيفية الفحص' : 'How to Scan'}
                  </h3>
                  <p className={`text-base leading-relaxed ${theme === 'dark' ? 'text-white/70' : 'text-slate-600'} font-medium`}>
                    {language === 'Arabic' ? 'ببساطة انسخ أي نص مشبوه من رسائل البريد الإلكتروني أو الرسائل النصية أو وسائل التواصل الاجتماعي والصقه في صندوق الفحص. سيقوم نظام الذكاء الاصطناعي لدينا بتحليل المحتوى فوراً بحثاً عن أي تهديدات.' : 'Simply copy any suspicious text from emails, text messages, or social media and paste it into the scanner box. Our AI engine will instantly analyze the content for threats.'}
                  </p>
                </div>

                <div className="space-y-6">
                  <h3 className={`text-sm font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`}>
                    {language === 'Arabic' ? 'مستويات الخطورة' : 'Risk Levels'}
                  </h3>
                  <div className="grid grid-cols-1 gap-6">
                    <div className={`flex gap-5 p-4 rounded-2xl ${theme === 'dark' ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
                      <div className="w-3 h-3 rounded-full bg-red-500 mt-1.5 flex-shrink-0 shadow-[0_0_12px_rgba(239,68,68,0.6)]" />
                      <div className="space-y-1">
                        <span className={`text-sm font-black uppercase tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>High / Critical</span>
                        <p className={`text-sm ${theme === 'dark' ? 'text-white/40' : 'text-slate-500'} leading-relaxed font-bold`}>
                          {language === 'Arabic' ? 'تهديد مؤكد. لا تتفاعل مع المحتوى أو تضغط على أي روابط.' : 'Confirmed threat. Do not interact with the content or click any links.'}
                        </p>
                      </div>
                    </div>
                    <div className={`flex gap-5 p-4 rounded-2xl ${theme === 'dark' ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
                      <div className="w-3 h-3 rounded-full bg-amber-500 mt-1.5 flex-shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.6)]" />
                      <div className="space-y-1">
                        <span className={`text-sm font-black uppercase tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Medium / Warning</span>
                        <p className={`text-sm ${theme === 'dark' ? 'text-white/40' : 'text-slate-500'} leading-relaxed font-bold`}>
                          {language === 'Arabic' ? 'محتوى مشبوه. يتطلب الحذر الشديد والتحقق الإضافي.' : 'Suspicious content. Requires extreme caution and further verification.'}
                        </p>
                      </div>
                    </div>
                    <div className={`flex gap-5 p-4 rounded-2xl ${theme === 'dark' ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
                      <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
                      <div className="space-y-1">
                        <span className={`text-sm font-black uppercase tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Low / Safe</span>
                        <p className={`text-sm ${theme === 'dark' ? 'text-white/40' : 'text-slate-500'} leading-relaxed font-bold`}>
                          {language === 'Arabic' ? 'يبدو أن المحتوى آمن للاستخدام العادي.' : 'Content appears legitimate for normal interaction.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className={`text-sm font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`}>
                    {language === 'Arabic' ? 'وضع الحماية (Guardian Mode)' : 'Guardian Mode'}
                  </h3>
                  <p className={`text-base leading-relaxed ${theme === 'dark' ? 'text-white/70' : 'text-slate-600'} font-medium`}>
                    {language === 'Arabic' ? 'اذهب إلى تبويب العائلة لربط حسابك بـ "ولي أمر" موثوق. سيتلقون تنبيهات فورية إذا اكتشف النظام تهديدات خطيرة موجهة إليك.' : 'Visit the Family tab to link your account with a trusted Guardian. They will receive instant alerts if the system detects high-level threats targeted at you.'}
                  </p>
                </div>

                <div className="pt-8 flex justify-end">
                  <button
                    onClick={() => setShowHelpModal(false)}
                    className="px-10 py-4 bg-cyan-400 text-black rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-cyan-300 transition-all shadow-xl active:scale-95"
                  >
                    {language === 'Arabic' ? 'فهمت' : 'Understood'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [language, setLanguage] = useState<AppLanguage>('English');
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('*').eq('id', user.id).single()
        .then(({ data }) => setProfile(data));
    } else {
      setProfile(null);
    }
  }, [user]);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#06080A] flex items-center justify-center font-sans tracking-widest text-[#0070f3] uppercase font-black">
        <div className="flex flex-col items-center gap-6">
          <Loader2 className="w-16 h-16 animate-spin" />
          <span>Initializing SentryAI...</span>
        </div>
      </div>
    );
  }

  const currentLanguage = language === 'Auto' ? 'English' : language;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage isRtl={currentLanguage === 'Arabic'} />} />
        <Route 
          path="/" 
          element={
            user ? (
              <Dashboard 
                user={user} 
                profile={profile} 
                language={language} 
                setLanguage={setLanguage}
                theme={theme}
                setTheme={setTheme}
              />
            ) : (
              <AuthPage 
                language={currentLanguage} 
                onSuccess={() => {
                  console.log("SentryAI: Auth success callback triggered. Refreshing session...");
                  supabase.auth.getSession().then(({ data: { session } }) => {
                    if (session) {
                      console.log("SentryAI: Session found, updating user state.");
                      setUser(session.user);
                    }
                  });
                }} 
              />
            )
          } 
        />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
