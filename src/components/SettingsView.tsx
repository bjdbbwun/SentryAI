import React from 'react';
import { motion } from 'motion/react';
import { Languages, Moon, Sun, Shield, Bell, User, HelpCircle, LogOut, ChevronRight } from 'lucide-react';
import { translations, AppLanguage } from '../constants/translations';

interface SettingsViewProps {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  user: any;
  profile: any;
  onLogout: () => void;
  onOpenHelp: () => void;
}

export const SettingsView = ({ language, setLanguage, theme, setTheme, user, profile, onLogout, onOpenHelp }: SettingsViewProps) => {
  const uiLanguage = language === 'Auto' ? 'English' : language;
  const t = translations[uiLanguage];
  const isRtl = language === 'Arabic';
  const initial = profile?.full_name?.[0] || user?.email?.[0] || 'U';

  const languages: { code: string, name: AppLanguage }[] = [
    { code: 'AUTO', name: 'Auto' },
    { code: 'EN', name: 'English' },
    { code: 'AR', name: 'Arabic' },
    { code: 'FR', name: 'French' },
    { code: 'ES', name: 'Spanish' },
    { code: 'DE', name: 'German' },
    { code: 'NL', name: 'Dutch' }
  ];

  return (
    <div className={`space-y-8 max-w-2xl mx-auto py-8 ${isRtl ? 'font-cairo' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <header className="mb-12">
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          {language === 'Arabic' ? 'الإعدادات' : 'Settings'}
        </h2>
        <p className="text-slate-500 mt-2">
          {language === 'Arabic' ? 'إدارة تفضيلات حسابك وتطبيقك' : 'Manage your account and application preferences'}
        </p>
      </header>

      <section className="bg-white dark:bg-[#1a1a2e] rounded-[32px] border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-white/5">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <User className="w-4 h-4" />
            {language === 'Arabic' ? 'الملف الشخصي' : 'Profile'}
          </h3>
          <div className="mt-6 flex items-center gap-4">
            <div className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center text-white text-2xl font-bold border-2 border-white dark:border-white/10 shadow-lg uppercase">
              {initial}
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">{profile?.full_name || 'User'}</h4>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Language Selection */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Languages className="w-4 h-4" />
              {language === 'Arabic' ? 'اللغة' : 'Language'}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.name)}
                  className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                    language === lang.name 
                      ? 'bg-cyan-400 text-black shadow-lg shadow-cyan-500/20' 
                      : 'bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
                  }`}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </div>

          {/* Theme Toggle */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              {language === 'Arabic' ? 'المظهر' : 'Appearance'}
            </h3>
            <div className="flex bg-slate-50 dark:bg-white/5 p-1.5 rounded-[20px] border border-slate-100 dark:border-white/5">
              <button
                onClick={() => setTheme('light')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[14px] text-xs font-bold transition-all ${
                  theme === 'light' ? 'bg-white text-cyan-400 shadow-md' : 'text-slate-400'
                }`}
              >
                <Sun className="w-4 h-4" />
                {language === 'Arabic' ? 'فاتح' : 'Light'}
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[14px] text-xs font-bold transition-all ${
                  theme === 'dark' ? 'bg-[#1a1a2e] text-cyan-400 shadow-md border border-white/10' : 'text-slate-400'
                }`}
              >
                <Moon className="w-4 h-4" />
                {language === 'Arabic' ? 'داكن' : 'Dark'}
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 px-8 py-6">
          <div className="flex flex-col gap-3">
             <button 
               onClick={onOpenHelp}
               className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-slate-600 dark:text-slate-300 w-full"
             >
               <div className="flex items-center gap-3">
                 <HelpCircle className="w-5 h-5 text-[#888888]" />
                 <span className="font-bold">{language === 'Arabic' ? 'مركز المساعدة' : 'Help Center'}</span>
               </div>
               <ChevronRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
             </button>
             <button 
               onClick={onLogout}
               className="flex items-center justify-between p-4 rounded-2xl hover:bg-red-500/10 transition-all text-red-500 w-full"
             >
               <div className="flex items-center gap-3">
                 <LogOut className="w-5 h-5 text-red-500" />
                 <span className="font-bold">{language === 'Arabic' ? 'تسجيل الخروج' : 'Log Out'}</span>
               </div>
             </button>
          </div>
        </div>
      </section>

      <div className="text-center text-[10px] text-slate-400 uppercase font-black tracking-widest leading-loose pb-12">
        SentryAI v1.1.0 — Security Terminal <br />
        Encryption Mode: AES-256-GCM <br />
        © 2026 Sentry Security Labs
      </div>
    </div>
  );
};
