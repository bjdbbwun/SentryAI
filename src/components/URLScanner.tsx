import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, AlertTriangle, CheckCircle2, Loader2, Send, X, History, AlertCircle, Zap } from 'lucide-react';
import { scanURL, getScanHistory, createSecurityAlert, URLScanResult } from '../services/urlScanService';
import supabase from '../lib/supabase';
import { translations, AppLanguage } from '../constants/translations';

interface URLScannerProps {
  language: Exclude<AppLanguage, 'Auto'>;
  theme: 'light' | 'dark';
}

interface ScanHistoryItem {
  id: string;
  content_preview: string;
  verdict: string;
  risk_level: string;
  threat_type: string;
  explanation: string;
  created_at: string;
}

export const URLScanner = ({ language, theme }: URLScannerProps) => {
  const t = translations[language];
  const isRtl = language === 'Arabic';
  
  // State Management
  const [url, setUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<URLScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [highRiskNotification, setHighRiskNotification] = useState<URLScanResult | null>(null);

  // Initialize: Get current user and fetch history
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          await fetchScanHistory(user.id);
        }
      } catch (err) {
        console.error('Failed to initialize user:', err);
      }
    };

    initializeUser();
  }, []);

  // Fetch scan history from database
  const fetchScanHistory = async (uid: string) => {
    try {
      const history = await getScanHistory(uid, 10);
      setScanHistory(history as unknown as ScanHistoryItem[]);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  // Handle URL submission
  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError(language === 'Arabic' ? 'يرجى إدخال عنوان URL' : 'Please enter a URL');
      return;
    }

    if (!userId) {
      setError(language === 'Arabic' ? 'يجب تسجيل الدخول أولاً' : 'Please sign in first');
      return;
    }

    setIsScanning(true);
    setError(null);
    setScanResult(null);
    setSuccessMessage(null);

    try {
      // Call the scanning service
      const result = await scanURL(url, userId);
      setScanResult(result);

      // Show success message
      setSuccessMessage(language === 'Arabic' ? 'تم تحليل الرابط بنجاح' : 'URL analysis complete');

      // If high risk, trigger notification and alert
      if (result.risk_level === 'high' || result.risk_level === 'critical') {
        setHighRiskNotification(result);
        
        // Create alert for guardians
        await createSecurityAlert(
          userId,
          url,
          result.risk_level,
          result.explanation
        );

        // Play notification sound
        playAlertSound();
      }

      // Clear input
      setUrl('');

      // Refresh history
      await fetchScanHistory(userId);

      // Auto-dismiss success message
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to scan URL';
      setError(errorMessage);
      console.error('Scan error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  // Play alert sound for high-risk URLs
  const playAlertSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(err => console.log('Audio play failed:', err));
    } catch (err) {
      console.log('Could not play alert sound:', err);
    }
  };

  // Get risk color based on level
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'from-red-600 to-red-700';
      case 'high':
        return 'from-orange-500 to-orange-600';
      case 'medium':
        return 'from-yellow-500 to-yellow-600';
      case 'low':
        return 'from-green-500 to-green-600';
      default:
        return 'from-slate-500 to-slate-600';
    }
  };

  // Get verdict icon
  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case 'safe':
        return <CheckCircle2 className="w-6 h-6 text-green-400" />;
      case 'suspicious':
        return <AlertTriangle className="w-6 h-6 text-yellow-400" />;
      case 'dangerous':
        return <AlertCircle className="w-6 h-6 text-red-400" />;
      default:
        return <Shield className="w-6 h-6 text-cyan-400" />;
    }
  };

  return (
    <div className={`w-full ${isRtl ? 'rtl' : 'ltr'}`}>
      {/* High Risk Notification Modal */}
      <AnimatePresence>
        {highRiskNotification && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50"
          >
            <motion.div
              className={`bg-gradient-to-br ${getRiskColor(highRiskNotification.risk_level)} rounded-2xl p-8 shadow-2xl max-w-md w-full border-2 border-white/20`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Zap className="w-8 h-8 text-white animate-pulse" />
                  <h3 className="text-2xl font-black text-white uppercase tracking-wider">
                    {language === 'Arabic' ? '⚠️ تحذير' : '⚠️ Alert'}
                  </h3>
                </div>
                <button
                  onClick={() => setHighRiskNotification(null)}
                  className="p-2 hover:bg-white/20 rounded-full transition"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              
              <div className="space-y-3 text-white">
                <p className="text-sm font-semibold">
                  {language === 'Arabic' ? 'اكتُشف تهديد أمني عالي المستوى' : 'High-risk security threat detected!'}
                </p>
                <p className="text-sm">{highRiskNotification.explanation}</p>
                <div className="pt-3 border-t border-white/30">
                  <p className="text-xs font-semibold">
                    {language === 'Arabic' ? 'المستوى:' : 'Risk Level:'} {highRiskNotification.risk_level.toUpperCase()}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        {/* URL Input Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-2xl border-2 ${
            theme === 'dark'
              ? 'bg-slate-800/50 border-cyan-500/30'
              : 'bg-white/50 border-cyan-500/20'
          } backdrop-blur-sm`}
        >
          <form onSubmit={handleScan} className="space-y-4">
            <label className={`block text-sm font-semibold ${
              theme === 'dark' ? 'text-cyan-300' : 'text-cyan-600'
            }`}>
              {language === 'Arabic' ? 'أدخل الرابط للفحص' : 'Enter URL to Scan'}
            </label>
            
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(null);
                }}
                placeholder={language === 'Arabic' ? 'https://example.com' : 'https://example.com'}
                disabled={isScanning}
                className={`flex-1 px-4 py-3 rounded-lg border-2 font-mono text-sm ${
                  theme === 'dark'
                    ? 'bg-slate-900 border-cyan-500/40 text-cyan-100 placeholder-slate-500'
                    : 'bg-white border-cyan-400/40 text-slate-900 placeholder-slate-400'
                } focus:outline-none focus:border-cyan-400 disabled:opacity-50 transition`}
              />
              
              <button
                type="submit"
                disabled={isScanning || !url.trim()}
                className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all ${
                  isScanning || !url.trim()
                    ? 'opacity-50 cursor-not-allowed'
                    : theme === 'dark'
                    ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-2 border-cyan-500/50 hover:border-cyan-400'
                    : 'bg-cyan-400/20 hover:bg-cyan-400/30 text-cyan-600 border-2 border-cyan-400'
                }`}
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {language === 'Arabic' ? 'جاري الفحص...' : 'Scanning...'}
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    {language === 'Arabic' ? 'فحص' : 'Scan'}
                  </>
                )}
              </button>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 rounded-lg bg-red-500/20 border-2 border-red-500/50 text-red-300 text-sm font-semibold flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success Message */}
            <AnimatePresence>
              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 rounded-lg bg-green-500/20 border-2 border-green-500/50 text-green-300 text-sm font-semibold flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  {successMessage}
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </motion.div>

        {/* Current Scan Result */}
        <AnimatePresence>
          {scanResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`p-6 rounded-2xl border-2 backdrop-blur-sm ${
                theme === 'dark'
                  ? 'bg-slate-800/50 border-cyan-500/30'
                  : 'bg-white/50 border-cyan-500/20'
              }`}
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {getVerdictIcon(scanResult.verdict)}
                    <div>
                      <h4 className={`text-lg font-black uppercase tracking-wider ${
                        scanResult.verdict === 'safe' ? 'text-green-400' :
                        scanResult.verdict === 'suspicious' ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {language === 'Arabic' 
                          ? (scanResult.verdict === 'safe' ? 'آمن' : scanResult.verdict === 'suspicious' ? 'مريب' : 'خطير')
                          : scanResult.verdict.toUpperCase()}
                      </h4>
                      <p className={`text-xs font-semibold ${
                        theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        {language === 'Arabic' ? 'مستوى الخطر:' : 'Risk Level:'} {scanResult.risk_level.toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Explanation */}
                <div className={`p-4 rounded-lg ${
                  theme === 'dark'
                    ? 'bg-slate-700/50 border-l-4 border-cyan-400'
                    : 'bg-slate-100/50 border-l-4 border-cyan-500'
                }`}>
                  <p className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-slate-200' : 'text-slate-700'
                  }`}>
                    {scanResult.explanation}
                  </p>
                </div>

                {/* Tags */}
                {scanResult.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {scanResult.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          theme === 'dark'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                            : 'bg-cyan-400/20 text-cyan-600 border border-cyan-400'
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action Recommendation */}
                <div className={`p-3 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                  scanResult.action === 'block' ? 'bg-red-500/20 text-red-300' :
                  scanResult.action === 'report' ? 'bg-orange-500/20 text-orange-300' :
                  scanResult.action === 'monitor' ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-green-500/20 text-green-300'
                }`}>
                  <Shield className="w-4 h-4" />
                  {language === 'Arabic' ? 'الإجراء: ' : 'Action: '} {scanResult.action.toUpperCase()}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scan History Button */}
        {scanHistory.length > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`w-full px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition ${
              theme === 'dark'
                ? 'bg-slate-700/50 hover:bg-slate-700/70 text-cyan-300 border border-cyan-500/30'
                : 'bg-slate-200/50 hover:bg-slate-200/70 text-slate-700 border border-slate-400'
            }`}
          >
            <History className="w-5 h-5" />
            {language === 'Arabic' ? 'سجل الفحوصات' : 'Scan History'} ({scanHistory.length})
          </button>
        )}

        {/* Scan History List */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              {scanHistory.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`p-3 rounded-lg border-l-4 ${
                    item.verdict === 'safe' ? 'border-green-400' :
                    item.verdict === 'suspicious' ? 'border-yellow-400' :
                    'border-red-400'
                  } ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-100/50'}`}
                >
                  <p className={`text-xs font-mono truncate ${
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                    {item.content_preview}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs font-semibold uppercase ${
                      item.verdict === 'safe' ? 'text-green-400' :
                      item.verdict === 'suspicious' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {item.verdict}
                    </span>
                    <span className={`text-xs ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};