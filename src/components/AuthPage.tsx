import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, Eye, EyeOff, Shield, CheckCircle2, ChevronRight, Loader2, Apple, X } from 'lucide-react';
import supabase from '../lib/supabase';
import { translations, AppLanguage } from '../constants/translations';

interface AuthPageProps {
  language: Exclude<AppLanguage, 'Auto'>;
  onSuccess: () => void;
}

const GoogleIcon: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

const AppleIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="white">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
);

const SentryLogo: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`flex items-center gap-4 ${className}`}>
    <img src="/image_0.png" alt="SentryAI Logo" className="h-12 object-contain" referrerPolicy="no-referrer" />
    <h1 className="text-[28px] font-bold tracking-[-0.5px] bg-gradient-to-r from-[#0070f3] to-[#00d4ff] bg-clip-text text-transparent select-none">
      SentryAI
    </h1>
  </div>
);

export const AuthPage: React.FC<AuthPageProps> = ({ language, onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'guardian' | 'senior'>('guardian');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState(0); // 0-3
  const [showForgotModal, setShowForgotModal] = useState(false);

  const isRtl = language === 'Arabic';
  const t = translations[language];

  useEffect(() => {
    // Basic password strength calculation
    let strength = 0;
    if (password.length > 5) strength++;
    if (/[A-Z]/.test(password) && /[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    setPasswordStrength(strength);
  }, [password]);

  const validate = () => {
    if (!email || !password) {
      setError(isRtl ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill in all required fields');
      return false;
    }
    if (!isLogin) {
      if (!fullName) {
        setError(isRtl ? 'يرجى إدخال اسمك الكامل' : 'Please enter your full name');
        return false;
      }
      if (password !== confirmPassword) {
        setError(isRtl ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
        return false;
      }
      if (!agreedToTerms) {
        setError(isRtl ? 'يرجى الموافقة على الشروط والأحكام وسياسة الخصوصية' : 'Please agree to the Terms and Privacy Policy');
        return false;
      }
    }
    return true;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setError(null);
    console.log(`Starting ${isLogin ? 'Login' : 'Sign Up'} attempt for:`, email);

    try {
      if (isLogin) {
        const { error, data } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          console.error("Supabase Login Error:", error);
          throw error;
        }
        console.log("Login successful:", data.user?.id);
        onSuccess();
      } else {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, role: role }
          }
        });
        if (error) {
          console.error("Supabase Sign-Up Error:", error);
          throw error;
        }
        console.log("Sign-up successful:", data.user?.id);
        onSuccess();
      }
    } catch (err: any) {
      console.error("Authentication Catch Block:", err);
      setError(err.message || "An unexpected authentication error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setIsLoading(true);
    setError(null);
    console.log(`Initializing ${provider} OAuth flow...`);
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) {
        console.error(`${provider} OAuth Error:`, error);
        throw error;
      }
      
      console.log(`${provider} OAuth session initiated`);
    } catch (err: any) {
      console.error(`${provider} OAuth Catch Block:`, err);
      setError(err.message || `Failed to initialize ${provider} login`);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#0a0e27] font-sans overflow-hidden relative">
      {/* Background Layer: Hexagonal Grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cpath fill='none' stroke='%2300d4ff' stroke-width='1' d='M13.9 49L0 41.1V25.2l13.9-7.9l13.9 7.9v15.9L13.9 49zM0 8.2V0h27.8v8.2l-13.9 7.9L0 8.2z'/%3E%3C/svg%3E")`,
        backgroundSize: '28px 49px'
      }} />

      {/* Floating Orbs */}
      <motion.div 
        animate={{ 
          y: [0, -40, 0],
          x: [0, 20, 0]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-200px] right-[-100px] w-[600px] h-[600px] rounded-full bg-[#0070f3] opacity-20 blur-[80px] pointer-events-none"
      />
      
      <motion.div 
        animate={{ 
          y: [0, 50, 0],
          x: [0, -30, 0]
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] rounded-full bg-[#00d4ff] opacity-15 blur-[100px] pointer-events-none"
      />

      {/* Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(25)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: Math.random() * 100 + "%", 
              y: Math.random() * 100 + "%",
              opacity: Math.random() * 0.3 + 0.1 
            }}
            animate={{ 
              y: [null, (Math.random() - 0.5) * 100 + "px"],
              x: [null, (Math.random() - 0.5) * 100 + "px"]
            }}
            transition={{ 
              duration: 10 + Math.random() * 10, 
              repeat: Infinity, 
              ease: "linear" 
            }}
            className="absolute w-1 h-1 bg-[#00d4ff] rounded-full"
          />
        ))}
      </div>

      {/* Left Decoration (Desktop Only) */}
      <div className="hidden md:flex md:w-[40%] p-12 flex-col justify-between relative z-10">
        <div>
          <div className="flex items-center mb-16">
             <SentryLogo />
          </div>
          <div className="space-y-6">
            <h2 className="text-6xl font-black text-white leading-[1.1] tracking-tight">
              {isRtl ? 'درعك الذكي' : 'Your Smart Shield'}
            </h2>
            <p className="text-[#00d4ff] text-xl font-bold tracking-widest uppercase">
              {isRtl ? 'في عالم غير آمن' : 'In an unsafe world'}
            </p>
            <p className="text-white/50 text-lg font-medium max-w-sm leading-relaxed">
              {isRtl ? 'حماية مدعومة بالذكاء الاصطناعي لك ولعائلتك من التهديدات الرقمية.' : 'AI-powered protection for you and your family from digital threats.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
           <div className="flex -space-x-3">
             {[...Array(4)].map((_, i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-[#0a0e27] bg-slate-800 flex items-center justify-center overflow-hidden">
                  <User className="w-5 h-5 text-slate-500" />
                </div>
             ))}
           </div>
           <div className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] leading-relaxed">
             Trusted by<br/>Thousands
           </div>
        </div>
      </div>

      {/* Right Form Area */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative z-10">
        <div className="w-full max-w-[450px] flex flex-col items-center gap-8">
          <SentryLogo />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full bg-[#1a1f3a] border border-[#00d4ff]/15 rounded-[20px] p-10 md:p-12 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_60px_rgba(0,112,243,0.08)] relative"
          >
          {/* Header Toggle */}
          <div className="flex justify-center gap-12 mb-12">
            <div className="flex flex-col items-center gap-2">
              <button 
                onClick={() => handleOAuth('google')}
                className="w-[52px] h-[52px] rounded-full bg-[#131832] border border-[#2a2f4a] flex items-center justify-center hover:scale-110 transition-all hover:border-[#00d4ff] group"
              >
                <div className="group-active:scale-90 transition-transform">
                  <GoogleIcon />
                </div>
              </button>
              <span className="text-[12px] font-bold text-[#e0e0e0] tracking-tight">Google</span>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <button 
                onClick={() => handleOAuth('apple')}
                className="w-[52px] h-[52px] rounded-full bg-[#131832] border border-[#2a2f4a] flex items-center justify-center hover:scale-110 transition-all hover:border-[#00d4ff] group"
              >
                <div className="group-active:scale-95 transition-transform">
                  <AppleIcon />
                </div>
              </button>
              <span className="text-[12px] font-bold text-[#e0e0e0] tracking-tight">Apple</span>
            </div>
          </div>

          <div className="relative flex items-center justify-center mb-10">
             <div className="absolute inset-0 flex items-center">
               <div className="w-full border-t border-[#2a2f4a]"></div>
             </div>
             <span className="relative bg-[#1a1f3a] px-4 text-[#5a5f7a] text-xs font-bold uppercase tracking-widest leading-none text-center">
               {isRtl ? 'أو سجل باستخدام البريد الإلكتروني' : 'Or continue with email'}
             </span>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  key="signup-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-6 overflow-hidden"
                >
                  <div className="relative group">
                    <input
                      type="text"
                      className={`w-full h-[52px] rounded-[26px] bg-[#131832] border ${error && !fullName ? 'border-red-500/50' : 'border-[#2a2f4a]'} ${isRtl ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4'} text-[15px] font-medium text-[#e0e0e0] placeholder-[#5a5f7a] focus:outline-none focus:border-[#00d4ff] focus:ring-[3px] focus:ring-[#00d4ff]/10 transition-all`}
                      placeholder={isRtl ? 'الاسم الكامل' : 'Full Name'}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                    <div className={`absolute top-[7px] ${isRtl ? 'right-[7px]' : 'left-[7px]'} w-[38px] h-[38px] rounded-full bg-[#1a1f3a] flex items-center justify-center`}>
                      <User className="w-[18px] h-[18px] text-[#5a5f7a]" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setRole('guardian')}
                      className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${role === 'guardian' ? 'border-[#0070f3] bg-[#0070f3]/10' : 'border-[#2a2f4a] bg-[#131832] opacity-60 hover:opacity-100 hover:border-[#00d4ff]/50'}`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${role === 'guardian' ? 'bg-[#0070f3] text-white shadow-lg shadow-[#0070f3]/20' : 'bg-[#1a1f3a] text-[#5a5f7a]'}`}>
                        <Shield className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest text-[#e0e0e0]">{isRtl ? 'حارس' : 'Guardian'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('senior')}
                      className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${role === 'senior' ? 'border-[#0070f3] bg-[#0070f3]/10' : 'border-[#2a2f4a] bg-[#131832] opacity-60 hover:opacity-100 hover:border-[#00d4ff]/50'}`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${role === 'senior' ? 'bg-[#0070f3] text-white shadow-lg shadow-[#0070f3]/20' : 'bg-[#1a1f3a] text-[#5a5f7a]'}`}>
                        <User className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest text-[#e0e0e0]">{isRtl ? 'أحد كبار السن' : 'Senior'}</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative group">
              <input
                type="email"
                className={`w-full h-[52px] rounded-[26px] bg-[#131832] border ${error && !email ? 'border-red-500/50' : 'border-[#2a2f4a]'} ${isRtl ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4'} text-[15px] font-medium text-[#e0e0e0] placeholder-[#5a5f7a] focus:outline-none focus:border-[#00d4ff] focus:ring-[3px] focus:ring-[#00d4ff]/10 transition-all`}
                placeholder={isRtl ? 'البريد الإلكتروني' : 'Email address'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <div className={`absolute top-[7px] ${isRtl ? 'right-[7px]' : 'left-[7px]'} w-[38px] h-[38px] rounded-full bg-[#1a1f3a] flex items-center justify-center`}>
                <Mail className="w-[18px] h-[18px] text-[#5a5f7a]" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`w-full h-[52px] rounded-[26px] bg-[#131832] border ${error && !password ? 'border-red-500/50' : 'border-[#2a2f4a]'} ${isRtl ? 'pr-12 pl-12 text-right' : 'pl-12 pr-12'} text-[15px] font-medium text-[#e0e0e0] placeholder-[#5a5f7a] focus:outline-none focus:border-[#00d4ff] focus:ring-[3px] focus:ring-[#00d4ff]/10 transition-all`}
                  placeholder={isRtl ? 'كلمة المرور' : 'Password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div className={`absolute top-[7px] ${isRtl ? 'right-[7px]' : 'left-[7px]'} w-[38px] h-[38px] rounded-full bg-[#1a1f3a] flex items-center justify-center`}>
                  <Lock className="w-[18px] h-[18px] text-[#5a5f7a]" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute top-[8px] ${isRtl ? 'left-[8px]' : 'right-[8px]'} w-[36px] h-[36px] rounded-full flex items-center justify-center text-[#5a5f7a] hover:text-[#00d4ff] transition-colors`}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              {!isLogin && (
                <div className="flex gap-1.5 px-4">
                  <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${passwordStrength >= 1 ? 'bg-red-500' : 'bg-[#2a2f4a]'}`} />
                  <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${passwordStrength >= 2 ? 'bg-orange-400' : 'bg-[#2a2f4a]'}`} />
                  <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${passwordStrength >= 3 ? 'bg-emerald-500' : 'bg-[#2a2f4a]'}`} />
                </div>
              )}
            </div>

            <AnimatePresence>
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-6 overflow-hidden"
                >
                  <div className="relative group">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className={`w-full h-[52px] rounded-[26px] bg-[#131832] border ${error && !confirmPassword ? 'border-red-500/50' : 'border-[#2a2f4a]'} ${isRtl ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4'} text-[15px] font-medium text-[#e0e0e0] placeholder-[#5a5f7a] focus:outline-none focus:border-[#00d4ff] focus:ring-[3px] focus:ring-[#00d4ff]/10 transition-all`}
                      placeholder={isRtl ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <div className={`absolute top-[7px] ${isRtl ? 'right-[7px]' : 'left-[7px]'} w-[38px] h-[38px] rounded-full bg-[#1a1f3a] flex items-center justify-center`}>
                      <Lock className="w-[18px] h-[18px] text-[#5a5f7a]" />
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <button
                      type="button"
                      onClick={() => setAgreedToTerms(!agreedToTerms)}
                      className={`shrink-0 w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${agreedToTerms ? 'bg-[#0070f3] border-[#0070f3]' : 'bg-[#131832] border-[#2a2f4a]'}`}
                    >
                      {agreedToTerms && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </button>
                    <span className="text-[14px] text-[#5a5f7a] leading-snug">
                      {isRtl ? 'أوافق على ' : 'I agree to the '}
                      <a href="#" className="text-[#00d4ff] font-bold hover:underline" target="_blank">{isRtl ? 'الشروط والأحكام' : 'Terms of Service'}</a>
                      {isRtl ? ' و ' : ' and '}
                      <a href="#" className="text-[#00d4ff] font-bold hover:underline" target="_blank">{isRtl ? 'سياسة الخصوصية' : 'Privacy Policy'}</a>
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {isLogin && (
              <div className="flex justify-end px-2">
                <button 
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-sm font-bold text-[#00d4ff] hover:underline"
                >
                  {isRtl ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
                </button>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-400/10 border border-red-400/20 rounded-2xl flex flex-col gap-2 text-red-500 text-xs font-bold uppercase tracking-wider">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {error}
                </div>
                {error.toLowerCase().includes('redirect_uri') && (
                  <div className="mt-2 pt-2 border-t border-red-400/10 text-[10px] text-red-400/80 leading-relaxed font-mono">
                    💡 TROUBLESHOOTING: Ensure the Redirect URL is added to Supabase — Auth — Settings — Allowed Redirect URLs.
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || (!isLogin && !agreedToTerms)}
              className={`w-full h-[52px] rounded-[26px] ${isLoading || (!isLogin && !agreedToTerms) ? 'bg-[#2a2f4a] text-[#5a5f7a] cursor-not-allowed' : 'bg-[#0070f3] hover:bg-[#0056b3] active:scale-95'} text-white font-bold text-base transition-all shadow-xl shadow-[#0070f3]/10 flex items-center justify-center uppercase tracking-widest`}
              onClick={(e) => {
                if (!isLogin && !agreedToTerms) {
                  e.preventDefault();
                  setError(isRtl ? 'يرجى الموافقة على الشروط والخصوصية' : 'Please agree to the Terms and Privacy Policy');
                }
              }}
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                isLogin ? (isRtl ? 'تسجيل الدخول' : 'Sign In') : (isRtl ? 'إنشاء حساب' : 'Create Account')
              )}
            </button>
          </form>

          <div className="mt-10 text-center">
            <button 
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="text-sm font-medium text-[#5a5f7a]"
            >
              {isLogin ? (
                <>
                  {isRtl ? 'ليس لديك حساب؟ ' : "Don't have an account? "}
                  <span className="text-[#00d4ff] font-bold hover:underline">{isRtl ? 'إنشاء حساب جديد' : 'Sign Up'}</span>
                </>
              ) : (
                <>
                  {isRtl ? 'لديك حساب بالفعل؟ ' : 'Already have an account? '}
                  <span className="text-[#00d4ff] font-bold hover:underline">{isRtl ? 'تسجيل الدخول' : 'Sign In'}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-[420px] bg-[#1a1f3a] border border-[#00d4ff]/15 rounded-[24px] p-8 md:p-10 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowForgotModal(false)}
                className="absolute top-6 right-6 w-9 h-9 rounded-full bg-[#131832] flex items-center justify-center text-[#5a5f7a] hover:text-[#00d4ff] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-4 mb-8">
                <div className="w-16 h-16 bg-[#0070f3]/10 rounded-full flex items-center justify-center mx-auto">
                  <Lock className="w-8 h-8 text-[#0070f3]" />
                </div>
                <h3 className="text-2xl font-black text-white">
                  {isRtl ? 'استعادة كلمة المرور' : 'Reset Password'}
                </h3>
                <p className="text-[#5a5f7a] text-sm font-medium">
                  {isRtl ? 'أدخل بريدك الإلكتروني وسنرسل لك رابط استعادة كلمة المرور' : "Enter your email and we'll send you a reset link"}
                </p>
              </div>

              <div className="relative group mb-6">
                <input
                  type="email"
                  className={`w-full h-[52px] rounded-[26px] bg-[#131832] border border-[#2a2f4a] ${isRtl ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4'} text-[15px] font-medium text-[#e0e0e0] placeholder-[#5a5f7a] focus:outline-none focus:border-[#00d4ff] focus:ring-[3px] focus:ring-[#00d4ff]/10 transition-all`}
                  placeholder={isRtl ? 'البريد الإلكتروني' : 'Email address'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <div className={`absolute top-[7px] ${isRtl ? 'right-[7px]' : 'left-[7px]'} w-[38px] h-[38px] rounded-full bg-[#1a1f3a] flex items-center justify-center`}>
                  <Mail className="w-[18px] h-[18px] text-[#5a5f7a]" />
                </div>
              </div>

              <button
                onClick={async () => {
                  if (!email) return;
                  setIsLoading(true);
                  try {
                    await supabase.auth.resetPasswordForEmail(email, {
                      redirectTo: `${window.location.origin}/reset-password`
                    });
                    alert(isRtl ? 'تم إرسال رابط الاستعادة إلى بريدك الإلكتروني' : 'Reset link sent! Check your email.');
                    setShowForgotModal(false);
                  } catch (err: any) {
                    alert(err.message);
                  } finally {
                    setIsLoading(false);
                  }
                }}
                className="w-full h-[52px] rounded-[26px] bg-[#0070f3] hover:bg-[#0056b3] text-white font-bold text-base transition-all shadow-xl shadow-[#0070f3]/10 flex items-center justify-center uppercase tracking-widest"
              >
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (isRtl ? 'إرسال رابط الاستعادة' : 'Send Reset Link')}
              </button>
              
              <button 
                onClick={() => setShowForgotModal(false)}
                className="w-full mt-4 text-sm font-bold text-[#5a5f7a] hover:text-[#00d4ff]"
              >
                {isRtl ? 'العودة لتسجيل الدخول' : 'Back to Sign In'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
