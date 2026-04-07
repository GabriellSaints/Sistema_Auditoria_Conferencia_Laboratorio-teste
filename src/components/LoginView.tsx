import React, { useState } from "react";
import { UserCircle2, Lock, ShieldAlert, KeyRound } from "lucide-react";
import { useData } from "../context/DataContext";

export default function LoginView() {
  const { users, setCurrentUser } = useData();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
        setError("Preencha o e-mail e a senha para entrar.");
        return;
    }
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
        setError("E-mail ou senha incorretos.");
        return;
    }
    if (!user.active) {
        setError("Esta conta está inativa.");
        return;
    }
    setCurrentUser(user);
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-indigo-500 to-tertiary"></div>
        
        <div className="p-10 pt-12">
            <div className="flex flex-col items-center justify-center mb-8">
                <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center text-primary mb-4 shadow-inner rotate-3 transition-transform hover:rotate-6 shadow-indigo-500/20">
                   <KeyRound className="w-10 h-10" />
                </div>
                <h1 className="text-2xl font-black text-slate-800 font-headline">The Architect</h1>
                <p className="text-slate-500 text-sm font-medium mt-1 text-center">Geração de relatórios de auditoria</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
                {error && (
                    <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 animate-in fade-in zoom-in-95">
                        <ShieldAlert className="w-5 h-5 shrink-0" />
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">E-mail corporativo</label>
                        <div className="relative">
                            <UserCircle2 className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setError("");
                                }}
                                placeholder="nome@empresa.com"
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm font-medium text-slate-700"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Senha de Acesso</label>
                        <div className="relative">
                            <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setError("");
                                }}
                                placeholder="******"
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm font-medium text-slate-700"
                            />
                        </div>
                    </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full py-4 bg-slate-900 hover:bg-primary text-white rounded-xl font-black font-headline tracking-widest uppercase transition-all shadow-lg hover:shadow-primary/30 flex items-center justify-center gap-2 group"
                >
                    <Lock className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" /> ACESSAR PLATAFORMA
                </button>
            </form>
        </div>
        
        <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-xs font-bold text-slate-400">Ambiente Restrito &copy; 2026</p>
        </div>
      </div>
    </div>
  );
}
