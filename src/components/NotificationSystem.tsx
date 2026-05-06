import React, { useState, useEffect, useRef } from 'react';
import { Bell, AlertCircle, AlertTriangle, ShieldCheck, FileText, CheckCircle2, X, ChevronRight, Volume2, VolumeX, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import supabase, { FamilyAlert } from '../lib/supabase';
import { translations, AppLanguage } from '../constants/translations';

interface NotificationSystemProps {
  language: Exclude<AppLanguage, 'Auto'>;
  theme: 'light' | 'dark';
}

interface AlertWithSenior extends FamilyAlert {
  senior_name?: string;
}

export const NotificationSystem = ({ language, theme }: NotificationSystemProps) => {
  const t = translations[language];
  const isRtl = language === 'Arabic';
  const [alerts, setAlerts] = useState<AlertWithSenior[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
    return localStorage.getItem('sentry_sound_enabled') !== 'false';
  });
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const soundRef = useRef<HTMLAudioElement | null>(null);

  // Refs for stale closure prevention
  const stateRef = useRef({ language, isSoundEnabled });
  useEffect(() => {
    stateRef.current = { language, isSoundEnabled };
  }, [language, isSoundEnabled]);

  useEffect(() => {
    // Initialize audio
    soundRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          localStorage.setItem('sentry_notifications_granted', 'true');
        }
      });
    }

    // Initial fetch of unread alerts
    const fetchInitialAlerts = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('family_alerts')
        .select(`
          *,
          profiles:senior_id (full_name)
        `)
        .eq('guardian_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        const formattedAlerts = data.map((item: any) => ({
          ...item,
          senior_name: item.profiles?.full_name || (stateRef.current.language === 'Arabic' ? 'فرد من العائلة' : 'Family Member')
        }));
        setAlerts(formattedAlerts);
        setUnreadCount(formattedAlerts.length);
      }
    };

    fetchInitialAlerts();

    // Subscribe to realtime changes
    let channel: any = null;
    let mounted = true;
    
    const setupSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !mounted) return;

        // Change the channel name to be unique per user as requested
        const channelName = `realtime:notifications-${user.id}-${Date.now()}`;
        
        // Refactor to ensure .on is called before .subscribe
        channel = supabase.channel(channelName);
        
        channel.on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'family_alerts',
            filter: `guardian_id=eq.${user.id}`
          },
          async (payload) => {
            if (!mounted) return;
            const newAlert = payload.new as FamilyAlert;
            
            // Fetch senior name for the new alert
            const { data: seniorProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', newAlert.senior_id)
              .single();
              
            const alertWithSenior: AlertWithSenior = {
              ...newAlert,
              senior_name: (seniorProfile as any)?.full_name || (stateRef.current.language === 'Arabic' ? 'فرد من العائلة' : 'Family Member')
            };

            setAlerts(prev => [alertWithSenior, ...prev].slice(0, 20));
            setUnreadCount(prev => prev + 1);

            // Handle background notification
            if (document.visibilityState === 'hidden' && Notification.permission === 'granted') {
              showBrowserNotification(alertWithSenior);
            }

            // Handle sound using stateRef for current settings
            if (stateRef.current.isSoundEnabled && (alertWithSenior.alert_type === 'critical_threat' || alertWithSenior.alert_type === 'sos_manual')) {
              soundRef.current?.play().catch(e => console.error('Audio play failed', e));
            }
          }
        ).subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            console.log(`SentryAI: Notifications channel active [${channelName}]`);
          }
        });
      } catch (error) {
        console.error('Subscription setup failed:', error);
      }
    }

    setupSubscription();

    // Close dropdown on click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      mounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []); // Run only once on mount

  const showBrowserNotification = (alert: AlertWithSenior) => {
    const title = language === 'Arabic' ? '🚨 تنبيه SentryAI' : '🚨 SentryAI Alert';
    const body = `${alert.senior_name} ${language === 'Arabic' ? 'تلقى رسالة خطيرة' : 'received a dangerous message'}: ${alert.message || alert.alert_type}`;
    
    const notification = new Notification(title, {
      body,
      icon: '/image_0.png',
    });

    notification.onclick = () => {
      window.focus();
      setIsOpen(true);
    };
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await (supabase.from('family_alerts') as any)
      .update({ is_read: true })
      .eq('guardian_id', user.id)
      .eq('is_read', false);

    if (!error) {
      setAlerts([]);
      setUnreadCount(0);
    }
  };

  const markAsRead = async (alertId: string) => {
    const { error } = await (supabase.from('family_alerts') as any)
      .update({ is_read: true })
      .eq('id', alertId);

    if (!error) {
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical_threat': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'sos_manual': return <ShieldAlert className="w-5 h-5 text-red-600 animate-pulse" />;
      case 'weekly_report': return <FileText className="w-5 h-5 text-indigo-500" />;
      default: return <Bell className="w-5 h-5 text-cyan-400" />;
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return language === 'Arabic' ? 'الآن' : 'just now';
    if (diffMins < 60) return `${diffMins}${language === 'Arabic' ? 'د' : 'm'} ${language === 'Arabic' ? 'منذ' : 'ago'}`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}${language === 'Arabic' ? 'سا' : 'h'} ${language === 'Arabic' ? 'منذ' : 'ago'}`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2.5 rounded-2xl transition-all ${
          theme === 'dark' ? 'bg-white/5 border-white/10 text-white/60 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
        } border shadow-sm active:scale-95`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#121417] shadow-lg">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className={`absolute ${isRtl ? 'left-0' : 'right-0'} mt-4 w-[350px] max-h-[400px] overflow-hidden bg-white dark:bg-[#151619] border ${
              theme === 'dark' ? 'border-white/10' : 'border-slate-200'
            } rounded-[12px] shadow-[0_4px_20px_rgba(0,0,0,0.15)] z-[100] flex flex-col`}
          >
            <div className={`p-4 border-b ${theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'} flex items-center justify-between`}>
              <h4 className="text-xs font-black uppercase tracking-widest text-[#888]">{language === 'Arabic' ? 'التنبيهات' : 'Notifications'}</h4>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    const newValue = !isSoundEnabled;
                    setIsSoundEnabled(newValue);
                    localStorage.setItem('sentry_sound_enabled', String(newValue));
                  }}
                  className="p-1 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors"
                >
                  {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <button 
                  onClick={markAllAsRead}
                  className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase underline decoration-cyan-400/30 underline-offset-4"
                >
                  {language === 'Arabic' ? 'تحديد الكل كمقروء' : 'Mark all as read'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {alerts.length > 0 ? (
                alerts.map(alert => (
                  <div 
                    key={alert.id}
                    className={`p-4 border-b ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'} hover:bg-white/[0.04] transition-colors relative group`}
                  >
                    {!alert.is_read && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400" />
                    )}
                    <div className="flex gap-3">
                      <div className={`p-2 rounded-lg shrink-0 ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'}`}>
                        {getAlertIcon(alert.alert_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-black uppercase tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {alert.senior_name}
                          </span>
                          <span className="text-[9px] font-mono text-[#888]">
                            {getTimeAgo(alert.created_at)}
                          </span>
                        </div>
                        <p className={`text-[11px] leading-snug mb-3 ${theme === 'dark' ? 'text-white/60' : 'text-slate-500'}`}>
                          {alert.message || (alert.alert_type === 'critical_threat' ? 'Critical threat detected' : alert.alert_type)}
                        </p>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => markAsRead(alert.id)}
                            className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest bg-cyan-400/10 px-2 py-1 rounded-lg"
                          >
                            {language === 'Arabic' ? 'عرض التفاصيل' : 'View Details'}
                          </button>
                          <button 
                            onClick={() => markAsRead(alert.id)}
                            className="opacity-0 group-hover:opacity-100 text-[9px] font-bold text-[#888] uppercase tracking-widest transition-opacity"
                          >
                            {language === 'Arabic' ? 'إخفاء' : 'Dismiss'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center flex flex-col items-center gap-3">
                  <div className={`p-4 rounded-full ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'}`}>
                    <Bell className="w-8 h-8 text-[#444]" />
                  </div>
                  <p className="text-[10px] font-bold text-[#888] uppercase tracking-widest">
                    {language === 'Arabic' ? 'لا توجد تنبيهات جديدة' : 'No new notifications'}
                  </p>
                </div>
              )}
            </div>

            <button className={`p-4 text-center text-[10px] font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'bg-white/[0.02] hover:bg-white/[0.05] text-[#888]' : 'bg-slate-50 hover:bg-slate-100 text-slate-500'}`}>
              {language === 'Arabic' ? 'عرض كل التنبيهات' : 'View all alerts'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
