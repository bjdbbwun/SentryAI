import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import supabase from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export const ResetPasswordPage = ({ isRtl = false }: { isRtl?: boolean }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password !== confirmPassword) {
      setError(isRtl ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => navigate('/'), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100 via-slate-50 to-emerald-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[450px] bg-white rounded-[32px] p-10 md:p-12 shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-white/40 backdrop-blur-xl"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-[#0070f3]" />
          </div>
          <h1 className="text-3xl font-black text-[#121417] tracking-tight mb-3">
            {isRtl ? 'تعيين كلمة مرور جديدة' : 'Set New Password'}
          </h1>
          <p className="text-slate-500 font-medium">
            {isRtl ? 'يرجى إدخال كلمة المرور الجديدة وتأكيدها' : 'Please enter and confirm your new password'}
          </p>
        </div>

        {success ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              {isRtl ? 'تم التحديث بنجاح!' : 'Update Successful!'}
            </h2>
            <p className="text-slate-500">
              {isRtl ? 'سيتم توجيهك إلى صفحة تسجيل الدخول...' : 'Redirecting you to sign in...'}
            </p>
          </motion.div>
        ) : (
          <form onSubmit={handleReset} className="space-y-6">
            <div className="relative group">
              <input
                type={showPassword ? 'text' : 'password'}
                className={`w-full h-[52px] rounded-[26px] border ${error ? 'border-red-300' : 'border-[#e0e0e0]'} ${isRtl ? 'pr-12 pl-12 text-right' : 'pl-12 pr-12'} text-[15px] font-medium focus:outline-none focus:border-[#0070f3] focus:ring-[3px] focus:ring-[#0070f3]/10 transition-all`}
                placeholder={isRtl ? 'كلمة المرور الجديدة' : 'New Password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className={`absolute top-[7px] ${isRtl ? 'right-[7px]' : 'left-[7px]'} w-[38px] h-[38px] rounded-full bg-[#f0f0f0] flex items-center justify-center`}>
                <Lock className="w-[18px] h-[18px] text-[#666]" />
              </div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute top-[8px] ${isRtl ? 'left-[8px]' : 'right-[8px]'} w-[36px] h-[36px] rounded-full flex items-center justify-center text-slate-400 hover:text-[#0070f3] transition-colors`}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="relative group">
              <input
                type={showPassword ? 'text' : 'password'}
                className={`w-full h-[52px] rounded-[26px] border ${error ? 'border-red-300' : 'border-[#e0e0e0]'} ${isRtl ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4'} text-[15px] font-medium focus:outline-none focus:border-[#0070f3] focus:ring-[3px] focus:ring-[#0070f3]/10 transition-all`}
                placeholder={isRtl ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <div className={`absolute top-[7px] ${isRtl ? 'right-[7px]' : 'left-[7px]'} w-[38px] h-[38px] rounded-full bg-[#f0f0f0] flex items-center justify-center`}>
                <Lock className="w-[18px] h-[18px] text-[#666]" />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-400/10 border border-red-400/20 rounded-2xl text-red-500 text-xs font-bold uppercase tracking-wider text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-[52px] rounded-[26px] bg-[#0070f3] hover:bg-[#0060d1] text-white font-bold text-base transition-all shadow-xl shadow-[#0070f3]/10 flex items-center justify-center"
            >
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (isRtl ? 'تحديث كلمة المرور' : 'Update Password')}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};
