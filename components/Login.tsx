
import React, { useState, useEffect } from 'react';
import { Shield, Loader2, AlertCircle, User, ShieldCheck, Mail, Lock, Sparkles, Chrome, CheckCircle2, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [inviteProjectId, setInviteProjectId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite');
    if (invite) {
      setInviteProjectId(invite);
      localStorage.setItem('pending_invite_id', invite);
      setIsSignUp(true);
    }
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: inviteProjectId ? 'user' : 'admin',
            }
          }
        });

        if (signUpError) throw signUpError;
        if (!data.user) throw new Error("Initialization failed. Security node rejected.");

        // If email confirmation is enabled, we show the success view
        setSuccessMessage(`System deployment initiated. Please check ${email} to verify your identity and activate this node.`);
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;
      }
    } catch (err: any) {
      setError(err.message || 'Verification failure');
    } finally {
      setLoading(false);
    }
  };

  if (successMessage) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-inter">
        <div className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl border border-slate-200 p-12 text-center animate-in zoom-in duration-500">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-emerald-500 rounded-[2.5rem] mb-8 shadow-2xl shadow-emerald-100">
            <CheckCircle2 className="text-white w-12 h-12" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-tight mb-4">Activation Required</h2>
          <p className="text-slate-500 font-medium mb-10 leading-relaxed">
            {successMessage}
          </p>
          <button 
            onClick={() => { setSuccessMessage(null); setIsSignUp(false); }}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-all"
          >
            <ArrowLeft size={16} /> Return to Identity Gate
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-inter">
      <div className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl border border-slate-200 p-10 md:p-12 overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-2 bg-indigo-600"></div>
        
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 rounded-[2rem] mb-6 shadow-2xl shadow-indigo-100 animate-in zoom-in duration-500">
            <Shield className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter leading-tight">
            {inviteProjectId ? 'Cluster Access' : (isSignUp ? 'Master Deployment' : 'Identity Gate')}
          </h1>
          <p className="text-slate-400 mt-2 font-black uppercase text-[9px] tracking-[0.4em]">
            {inviteProjectId ? 'Project Invitation Detected' : (isSignUp ? 'First user will be Admin' : 'Secure Verification')}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-5 rounded-2xl text-[10px] font-black uppercase tracking-widest border flex gap-3 items-center animate-in slide-in-from-top-2 bg-rose-50 text-rose-600 border-rose-100">
            <AlertCircle size={16} className="shrink-0" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-4 py-4 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <Chrome size={18} className="text-slate-600" />
            Continue with Google
          </button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
            <div className="relative flex justify-center text-[8px] font-black uppercase tracking-[0.4em]"><span className="bg-white px-4 text-slate-300">Identity Protocol</span></div>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Email Node</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input 
                  type="email" required placeholder="identity@protocol.io"
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 font-bold"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Access Key</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input 
                  type="password" required placeholder="••••••••"
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 font-black tracking-widest"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" disabled={loading}
              className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (isSignUp ? 'DEPLOY NODE' : 'AUTHORIZE')}
            </button>
          </form>

          <div className="pt-6 text-center">
            <button 
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em] hover:underline flex items-center justify-center gap-2 mx-auto"
            >
              <Sparkles size={12} />
              {isSignUp ? 'Existing Identity Protocol' : 'Deploy New Workspace'}
            </button>
          </div>
        </div>
      </div>
      <p className="mt-8 text-[8px] font-black text-slate-300 uppercase tracking-[0.5em]">Antigravity CRM v3.2 Enterprise</p>
    </div>
  );
};

export default Login;
