import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/');
      }
    });

    // Handle the initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#06080A] flex flex-col items-center justify-center font-sans tracking-widest text-[#0070f3] uppercase font-black gap-6">
      <Loader2 className="w-16 h-16 animate-spin" />
      <div className="flex flex-col items-center gap-2">
        <span>Authenticating...</span>
        <span className="text-xs text-white/40 font-bold">Verifying Neural Credentials</span>
      </div>
    </div>
  );
}
