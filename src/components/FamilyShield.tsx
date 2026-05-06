import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Bell, FileText, Lock, ShieldAlert, ShieldCheck, ChevronRight, AlertTriangle, CheckCircle2, Loader2, Send, Sparkles, X } from 'lucide-react';
import { translations, AppLanguage } from '../constants/translations';
import { familyGuardianAnalysis } from '../services/geminiService';
import supabase, { Profile } from '../lib/supabase';

interface FamilyShieldProps {
  language: Exclude<AppLanguage, 'Auto'>;
}

type Mode = 'selection' | 'guardian' | 'senior';

export const FamilyShield = ({ language }: FamilyShieldProps) => {
  const t = translations[language];
  const isRtl = language === 'Arabic';
  const [mode, setMode] = useState<Mode>('selection');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<string[]>(['senior-1']);
  
  // Real-time integration states
  const [seniorEmail, setSeniorEmail] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [addMemberMessage, setAddMemberMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seniorEmail) return;

    setIsAddingMember(true);
    setAddMemberMessage(null);

    try {
      // 1. Find the senior profile by email
      const { data: seniorProfile, error: findError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('email', seniorEmail)
        .single();

      if (findError || !seniorProfile) {
        throw new Error(language === 'Arabic' ? 'لم يتم العثور على حساب بهذا البريد الإلكتروني.' : 'No user found with this email.');
      }

      const foundProfile = seniorProfile as Pick<Profile, 'id' | 'full_name'>;

      // 2. Link the guardian (current user) to the senior
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) throw new Error('Not authenticated');

      const { error: updateError } = await (supabase as any)
        .from('profiles')
        .update({ guardian_id: currentUser.user.id })
        .eq('id', foundProfile.id);

      if (updateError) throw updateError;
      
      // 3. Create a notification for the guardian
      await (supabase.from('family_alerts') as any).insert({
        senior_id: foundProfile.id,
        guardian_id: currentUser.user.id,
        alert_type: 'family_link_established',
        message: language === 'Arabic' ? `تم ربط حسابك بـ ${foundProfile.full_name}` : `Linked with ${foundProfile.full_name}`,
        is_read: false
      });

      setAddMemberMessage({
        text: language === 'Arabic' ? `تمت إضافة ${foundProfile.full_name || 'العضو'} بنجاح!` : `Successfully added ${foundProfile.full_name || 'member'}!`,
        type: 'success'
      });
      setSeniorEmail('');
    } catch (err: any) {
      setAddMemberMessage({
        text: err.message || 'Operation failed',
        type: 'error'
      });
    } finally {
      setIsAddingMember(false);
    }
  };
  
  const [seniors, setSeniors] = useState<any[]>([]);
  const [isLoadingSeniors, setIsLoadingSeniors] = useState(false);

  useEffect(() => {
    if (mode === 'guardian') {
      fetchSeniors();
    }
  }, [mode]);

  const fetchSeniors = async () => {
    setIsLoadingSeniors(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: seniorsList, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('guardian_id', user.id);

      if (error) throw error;

      // For each senior, fetch recent alerts
      const enrichedSeniors = await Promise.all((seniorsList || []).map(async (senior) => {
      const { data: alerts, error: alertsError } = await supabase
          .from('family_alerts')
          .select('*')
          .eq('senior_id', senior.id)
          .order('created_at', { ascending: false })
          .limit(5);

        const typedAlerts = (alerts || []) as any[];

        return {
          id: senior.id,
          name: senior.full_name || 'Senior',
          avatar: senior.avatar_url || '👴',
          status: typedAlerts.length > 0 ? 'warning' : 'safe',
          lastScan: typedAlerts[0] ? new Date(typedAlerts[0].created_at).toLocaleTimeString() : 'No activity',
          alerts: typedAlerts.map(a => ({
            id: a.id,
            type: a.alert_type,
            risk: a.alert_type === 'critical_threat' ? 'high' : 'medium',
            time: new Date(a.created_at).toLocaleTimeString(),
            title: a.alert_type,
            desc: a.message
          }))
        };
      }));

      setSeniors(enrichedSeniors);
    } catch (err) {
      console.error('Failed to fetch seniors', err);
    } finally {
      setIsLoadingSeniors(false);
    }
  };

  const handleGenerateReport = async (senior: any) => {
    if (!senior) return;
    setIsGeneratingReport(true);
    try {
      const report = await familyGuardianAnalysis(senior.name, senior.alerts, language);
      setAiReport(report);
    } catch (error) {
      console.error('Report generation failed', error);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const toggleCard = (id: string) => {
    setExpandedCards(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  if (mode === 'selection') {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto py-12 ${isRtl ? 'font-cairo' : ''}`}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <button
          onClick={() => setMode('guardian')}
          className="group relative bg-white dark:bg-[#1a1a2e] border-2 border-transparent hover:border-indigo-500/50 rounded-[32px] p-10 text-left transition-all hover:translate-y-[-4px] shadow-xl hover:shadow-2xl overflow-hidden"
        >
          <div className={`absolute top-0 ${isRtl ? 'left-0' : 'right-0'} p-8 opacity-5 group-hover:opacity-10 transition-opacity`}>
            <Users className="w-40 h-40 text-indigo-500" />
          </div>
          <div className="relative z-10">
            <div className={`w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-8 border border-indigo-500/20 ${isRtl ? 'mr-0' : ''}`}>
              <Users className="w-8 h-8 text-indigo-500" />
            </div>
            <h3 className="text-2xl font-extrabold tracking-tight mb-4 text-slate-900 dark:text-white uppercase">{t.guardianMode}</h3>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-8 text-lg font-medium">
              {language === 'Arabic' ? 'احمِ أفراد عائلتك. راقب حالتهم الأمنية، وحلل التهديدات التي يتلقونها، وقدم المساعدة عن بعد.' : 'Protect your family members. Monitor their security status, analyze threats they receive, and provide remote assistance.'}
            </p>
            <div className={`flex items-center gap-2 text-indigo-500 font-bold text-sm uppercase tracking-widest ${isRtl ? 'flex-row-reverse justify-end' : ''}`}>
              <span>{t.guardian}</span>
              <ChevronRight className={`w-5 h-5 ${isRtl ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </button>

        <button
          onClick={() => setMode('senior')}
          className="group relative bg-white dark:bg-[#1a1a2e] border-2 border-transparent hover:border-emerald-500/50 rounded-[32px] p-10 text-left transition-all hover:translate-y-[-4px] shadow-xl hover:shadow-2xl overflow-hidden"
        >
          <div className={`absolute top-0 ${isRtl ? 'left-0' : 'right-0'} p-8 opacity-5 group-hover:opacity-10 transition-opacity`}>
            <ShieldCheck className="w-40 h-40 text-emerald-500" />
          </div>
          <div className="relative z-10">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-8 border border-emerald-500/20">
              <ShieldCheck className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-2xl font-extrabold tracking-tight mb-4 text-slate-900 dark:text-white uppercase">{t.protectSenior}</h3>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-8 text-lg font-medium">
              {language === 'Arabic' ? 'اتصل بفرد من العائلة تثق به. سيتم إخطاره بالرسائل المشبوهة ويمكنه مساعدتك في البقاء آمناً.' : 'Connect to a family member you trust. They will be notified of suspicious messages and can help you stay safe online.'}
            </p>
            <div className={`flex items-center gap-2 text-emerald-500 font-bold text-sm uppercase tracking-widest ${isRtl ? 'flex-row-reverse justify-end' : ''}`}>
              <span>{t.senior}</span>
              <ChevronRight className={`w-5 h-5 ${isRtl ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </button>
      </motion.div>
    );
  }

  if (mode === 'guardian') {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`max-w-4xl mx-auto space-y-8 py-8 ${isRtl ? 'font-cairo' : ''}`}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-white/10 pb-8 gap-6">
          <div className="flex flex-col gap-6">
            <button 
              onClick={() => setMode('selection')} 
              className="w-fit flex items-center gap-3 px-6 py-3 bg-cyan-400 text-black rounded-xl text-lg font-bold shadow-lg shadow-cyan-500/20 hover:bg-cyan-300 transition-all font-cairo"
            >
              <span>←</span>
              <span>{language === 'Arabic' ? 'العودة إلى لوحة التحكم' : 'Back to Dashboard'}</span>
            </button>
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                {language === 'Arabic' ? '👋 مرحباً بك!' : 'Welcome back!'}
              </h2>
              <p className="text-slate-500 text-sm mt-1">{t.familyDashboard}</p>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">
                {language === 'Arabic' ? 'إضافة فرد للعائلة' : 'Add Family Member'}
              </h3>
              <form onSubmit={handleAddMember} className="space-y-4">
                <input 
                  type="email" 
                  value={seniorEmail}
                  onChange={(e) => setSeniorEmail(e.target.value)}
                  placeholder={language === 'Arabic' ? 'البريد الإلكتروني لكبير السن' : "Senior's email"}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  required
                />
                <button 
                  type="submit"
                  disabled={isAddingMember}
                  className="w-full px-6 py-3 bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isAddingMember ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{language === 'Arabic' ? 'جاري الإرسال...' : 'Sending...'}</span>
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4" />
                      <span>{language === 'Arabic' ? 'إضافة عضو' : 'Add Member'}</span>
                    </>
                  )}
                </button>
              </form>
              <AnimatePresence>
                {addMemberMessage && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`mt-4 p-3 rounded-lg text-xs font-bold text-center border ${
                      addMemberMessage.type === 'success' 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                      : 'bg-red-500/10 border-red-500/20 text-red-500'
                    }`}
                  >
                    {addMemberMessage.text}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {isLoadingSeniors ? (
            <div className="py-20 text-center">
              <Loader2 className="w-10 h-10 animate-spin mx-auto text-indigo-500 mb-4" />
              <p className="text-slate-500">Loading family members...</p>
            </div>
          ) : seniors.length > 0 ? (
            seniors.map(senior => (
            <div key={senior.id} className="bg-white dark:bg-[#1a1a2e] rounded-[24px] border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div 
                onClick={() => toggleCard(senior.id)}
                className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-5">
                  <span className="text-4xl bg-slate-100 dark:bg-white/5 w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner">
                    {senior.avatar}
                  </span>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{senior.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">آخر فحص: {senior.lastScan}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm ${
                  senior.status === 'safe' 
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                }`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${senior.status === 'safe' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {senior.status === 'safe' ? (language === 'Arabic' ? 'آمن' : 'Safe') : (language === 'Arabic' ? 'حذر' : 'Warning')}
                </div>
              </div>

              <AnimatePresence>
                {expandedCards.includes(senior.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 pt-0 border-t border-slate-100 dark:border-white/5">
                      <div className="mt-6 space-y-4">
                        <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 px-1">
                          {language === 'Arabic' ? `⚠️ ${senior.alerts.length} تنبيهات اليوم` : `⚠️ ${senior.alerts.length} Alerts Today`}
                        </p>
                        
                        {senior.alerts.map(alert => (
                          <div key={alert.id} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all">
                            <div className={`p-3 rounded-xl ${alert.risk === 'high' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                              {alert.risk === 'high' ? <ShieldAlert className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="font-bold text-slate-900 dark:text-white truncate">{alert.title}</h4>
                                <span className="text-[10px] text-slate-400 font-mono">{alert.time}</span>
                              </div>
                              <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">{alert.desc}</p>
                            </div>
                          </div>
                        ))}

                        <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-slate-100 dark:border-white/5">
                          <button className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-xs font-bold transition-all">
                            {language === 'Arabic' ? '📋 عرض التفاصيل' : 'Details'}
                          </button>
                          <button className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-xs font-bold transition-all">
                            {language === 'Arabic' ? '📞 اتصل به' : 'Call'}
                          </button>
                          <button className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl text-xs font-bold transition-all">
                            {language === 'Arabic' ? '🗑️ حذف الرسائل' : 'Emergency Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        ) : (
          <div className="py-20 text-center bg-white dark:bg-white/5 rounded-3xl border border-dashed border-slate-200 dark:border-white/10">
             <Users className="w-12 h-12 mx-auto text-slate-300 mb-4" />
             <p className="text-slate-500">{t.noSeniors}</p>
          </div>
        )}
        </div>

        {/* AI Weekly Report */}
        <div className="bg-white dark:bg-[#1a1a2e] rounded-[32px] p-8 border border-slate-200 dark:border-white/10 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                📊 {language === 'Arabic' ? 'التقرير الأسبوعي' : 'Weekly Security Report'}
              </h3>
              <p className="text-slate-500 mt-1">28 {language === 'Arabic' ? 'أبريل' : 'April'} - 4 {language === 'Arabic' ? 'مايو' : 'May'}</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handleGenerateReport(seniors[0])}
                disabled={isGeneratingReport || seniors.length === 0}
                className="px-6 py-3 bg-indigo-500 text-white rounded-2xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-600 transition-all disabled:opacity-50"
              >
                {isGeneratingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isGeneratingReport ? (language === 'Arabic' ? 'جاري التحليل...' : 'Analyzing...') : (language === 'Arabic' ? 'تحليل الذكاء الاصطناعي' : 'AI Analysis')}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {aiReport && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8 p-6 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl relative overflow-hidden"
              >
                <button onClick={() => setAiReport(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white">
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-3 mb-4 text-indigo-500">
                  <Sparkles className="w-5 h-5" />
                  <span className="font-bold uppercase tracking-widest text-[10px]">AI Forensics Synthesis</span>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                  {aiReport}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { val: '17', label: language === 'Arabic' ? 'تهديد محظور' : 'Blocked Threats', icon: '🛡️' },
              { val: '9', label: language === 'Arabic' ? 'تصيد' : 'Phishing', icon: '🎣' },
              { val: '👵', label: language === 'Arabic' ? 'الأكثر استهدافاً' : 'Most Targeted', icon: '🎯' },
              { val: '98%', label: language === 'Arabic' ? 'معدل الأمان' : 'Safety Score', icon: '📈' }
            ].map((stat, i) => (
              <div key={i} className="p-6 bg-slate-50 dark:bg-white/[0.03] rounded-2xl text-center border border-slate-100 dark:border-transparent">
                <div className="text-2xl mb-2">{stat.icon}</div>
                <div className="text-2xl font-extrabold text-indigo-500">{stat.val}</div>
                <div className="text-[10px] uppercase font-bold text-slate-400 mt-1 tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  // Senior Mode View
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`max-w-2xl mx-auto space-y-8 py-8 ${isRtl ? 'font-cairo' : ''}`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="flex justify-start">
        <button 
          onClick={() => setMode('selection')}
          className="flex items-center gap-2 bg-cyan-400 hover:bg-cyan-300 text-black px-5 py-2.5 rounded-lg text-base font-bold shadow-md transition-all font-cairo"
        >
          <span>{language === 'Arabic' ? '⬅️ رجوع' : '⬅️ Back'}</span>
        </button>
      </div>

      <div className="text-center space-y-6">
        <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.1)]">
          <Lock className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">{t.protectSenior}</h2>
        <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed max-w-md mx-auto">
          {language === 'Arabic' ? 'ابقَ محمياً من الاحتيال والاختراق. سيقوم فرد العائلة الذي تثق به بمساعدتك.' : 'Stay protected from scams and hackers. Your trusted family member will help look out for you.'}
        </p>
      </div>

      <div className="bg-white dark:bg-[#1a1a2e] border border-slate-200 dark:border-white/10 rounded-[32px] p-10 space-y-10 shadow-xl">
         <div className="space-y-4">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] block">{t.guardianCode}</label>
            <div className="flex gap-4">
               {[1, 2, 3, 4, 5, 6].map(i => (
                 <div key={i} className="flex-1 h-16 bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/10 rounded-2xl flex items-center justify-center text-2xl font-extrabold text-emerald-500">
                   -
                 </div>
               ))}
            </div>
         </div>

         <div className="p-6 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex items-start gap-4">
            <Bell className="w-6 h-6 text-emerald-500 mt-1 shrink-0" />
            <div>
               <h4 className="font-bold text-slate-900 dark:text-white mb-2">{t.activeProtection}</h4>
               <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                 {language === 'Arabic' ? 'نقوم بمراقبة رسائلك بحثاً عن التهديدات. إذا وجدنا شيئاً مشبوهاً، سنخطرك أنت وحارس العائلة المرتبط بك.' : "We are monitoring your messages for threats. If we find something suspicious, we'll notify you and your linked guardian."}
               </p>
            </div>
         </div>

         <div className="flex flex-col gap-4">
           <button 
             onClick={async () => {
               const { data: { user } } = await supabase.auth.getUser();
               if (!user) return;
               const { data: profile } = await supabase.from('profiles').select('guardian_id, full_name').eq('id', user.id).single();
               const profileData = profile as any;
               if (profileData?.guardian_id) {
                 await (supabase.from('family_alerts') as any).insert({
                   senior_id: user.id,
                   guardian_id: profileData.guardian_id,
                   alert_type: 'sos_manual',
                   message: `${profileData.full_name || 'Senior'} pressed the SOS button! Immediate assistance required.`,
                   is_read: false
                 });
                 alert(language === 'Arabic' ? 'تم إرسال نداء الاستغاثة بنجاح!' : 'SOS Alert sent successfully!');
               } else {
                 alert(language === 'Arabic' ? 'يرجى ربط حسابك بـ حارس أولاً.' : 'Please link with a guardian first.');
               }
             }}
             className="w-full py-5 bg-red-600 text-white rounded-2xl text-lg font-black uppercase tracking-[0.2em] transition-all hover:bg-red-700 shadow-xl shadow-red-600/30 active:scale-95 flex items-center justify-center gap-4"
           >
             <AlertTriangle className="w-6 h-6" />
             {language === 'Arabic' ? 'إرسال نداء استغاثة SOS' : 'SEND EMERGENCY SOS'}
           </button>

           <button className="w-full py-5 bg-emerald-500 text-white rounded-2xl text-sm font-extrabold uppercase tracking-widest transition-all hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 disabled:opacity-50">
              {t.connectGuardian}
           </button>
         </div>
      </div>

      <p className="text-center text-[10px] text-slate-400 uppercase tracking-widest leading-loose">
         {language === 'Arabic' ? 'خصوصيتك هي أولويتنا القصوى. يمكن للحراس رؤية بيانات التهديدات فقط، ولن يتمكنوا أبداً من رؤية محادثاتك الخاصة غير المشبوهة.' : 'Your privacy is our priority. Guardians can only see threat data, and never private non-suspicious conversations.'}
      </p>
    </motion.div>
  );
};
