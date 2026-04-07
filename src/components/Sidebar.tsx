import React from "react";
import {
  UploadCloud,
  Users,
  AlertCircle,
  History,
  Trophy,
  Settings,
  HelpCircle,
  Shield,
  LogOut
} from "lucide-react";
import { cn } from "../lib/utils";
import { Module } from "../types";
import { useData } from "../context/DataContext";

interface SidebarProps {
  activeModule: Module;
  onModuleChange: (module: Module) => void;
}

export default function Sidebar({
  activeModule,
  onModuleChange,
}: SidebarProps) {
  const { currentUser, setCurrentUser } = useData();

  // Permissões
  const isAdmin = currentUser?.role === "admin";
  const isGerente = currentUser?.role === "gerente";
  const canImport = isAdmin || isGerente;

  const menuItems = [
    ...(canImport ? [{ id: "import" as Module, label: "Importação", icon: UploadCloud }] : []),
    { id: "monitoring" as Module, label: "Monitoramento da Equipe", icon: Users },
    { id: "discrepancies" as Module, label: "Divergências Técnicas", icon: AlertCircle },
    { id: "attendance" as Module, label: "Atrasos de Ponto", icon: History },
    { id: "ranking" as Module, label: "Ranking Geral", icon: Trophy },
  ] as const;

  const handleLogout = () => {
    if(window.confirm("Deseja sair da sua conta?")) {
        setCurrentUser(null);
    }
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-slate-50 border-r border-outline-variant/10 flex flex-col z-50">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Shield className="text-white w-6 h-6" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-primary leading-none">
              The Sovereign
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
              Auditor
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onModuleChange(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all group",
              activeModule === item.id
                ? "bg-indigo-50 text-indigo-700 font-semibold border-r-4 border-indigo-700"
                : "text-slate-600 hover:bg-slate-100",
            )}
          >
            <item.icon
              className={cn(
                "w-5 h-5",
                activeModule === item.id
                  ? "text-indigo-700"
                  : "text-slate-400 group-hover:text-indigo-900",
              )}
            />
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100 space-y-1">
        {isAdmin && (
            <button 
                onClick={() => onModuleChange("admin")}
                className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                    activeModule === "admin" ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-600 hover:bg-slate-100"
                )}
            >
                <Settings className={cn("w-5 h-5", activeModule === "admin" ? "text-indigo-700" : "text-slate-400")} />
                <span className="text-sm font-medium">Cadastros & API</span>
            </button>
        )}
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">
          <HelpCircle className="w-5 h-5 text-slate-400" />
          <span className="text-sm font-medium">Suporte</span>
        </button>
      </div>

      <div className="p-6 border-t border-outline-variant/10 flex items-center justify-between group cursor-pointer hover:bg-slate-100 transition-colors" onClick={handleLogout}>
        <div className="flex items-center gap-3">
          {currentUser?.photoUrl ? (
             <img src={currentUser.photoUrl} alt="User" className="w-10 h-10 rounded-full object-cover border border-primary/20 shadow-sm" />
          ) : (
             <div className="w-10 h-10 rounded-full border border-primary/20 bg-primary/10 flex items-center justify-center text-primary font-bold shadow-sm">
                {currentUser?.name?.substring(0, 2).toUpperCase() || "US"}
             </div>
          )}
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-slate-900 truncate" title={currentUser?.name || ""}>{currentUser?.name || "Usuário"}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">
              {currentUser?.role === 'admin' ? 'Administrador' : currentUser?.role === 'gerente' ? 'Gerência' : 'Visualizador'}
            </p>
          </div>
        </div>
        <LogOut className="w-4 h-4 text-slate-400 group-hover:text-error transition-colors" />
      </div>
    </aside>
  );
}
