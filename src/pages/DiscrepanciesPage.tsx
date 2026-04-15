import React, { useMemo, useState } from "react";
import {
  Search,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  PieChart,
  ShieldCheck,
  FileX2,
  X,
  ListOrdered,
  Target,
  TrendingUp,
  Zap,
  Eye,
  Calendar,
  Filter,
  ChevronRight,
  BarChart3,
  Wrench,
  FileWarning
} from "lucide-react";
import { cn } from "../lib/utils";
import { useData } from "../context/DataContext";
import { motion, AnimatePresence } from "motion/react";

/* ──────────────────────────────────────────────────────────────────────
   DIVERGÊNCIAS TÉCNICAS — REDESIGN COMPLETO COM ANIMAÇÕES
   Design: KPI hero, rankings com barras animadas, horizontal bar charts,
   timeline com cards sofisticados, modais com spring physics.
   ────────────────────────────────────────────────────────────────────── */

type TimeFilter = "dia" | "semana" | "mes" | "ano" | "custom";
type RankingType = "infratores" | "melhores" | "auditores" | null;

// ─── Animated counter ────────────────────────────────────────────────
function AnimatedNumber({ value, className }: { value: number; className?: string }) {
    const [displayValue, setDisplayValue] = React.useState(0);
    React.useEffect(() => {
        const duration = 900;
        const start = performance.now();
        const startVal = displayValue;
        const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            setDisplayValue(Math.round(startVal + (value - startVal) * eased));
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [value]);
    return <span className={className}>{displayValue}</span>;
}

// ─── Animation variants ──────────────────────────────────────────────
const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const cardVariant = {
    hidden: { opacity: 0, y: 24, scale: 0.96 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 280, damping: 24 } },
};
const rowVariant = {
    hidden: { opacity: 0, x: -14 },
    visible: (i: number) => ({
        opacity: 1, x: 0,
        transition: { delay: i * 0.04, type: "spring", stiffness: 300, damping: 28 },
    }),
};
const modalOverlay = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
};
const modalContent = {
    hidden: { opacity: 0, scale: 0.92, y: 30 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 340, damping: 28, delay: 0.05 } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.15 } },
};

// Period labels
const periodLabels: Record<TimeFilter, string> = {
    dia: "Hoje",
    semana: "Semana",
    mes: "Mês",
    ano: "Ano",
    custom: "Custom"
};

export default function DiscrepanciesView() {
  const { discrepanciesData, technicians: registeredTechnicians } = useData();
  const [techFilter, setTechFilter] = useState("");
  const [selectedTech, setSelectedTech] = useState<string | null>(null);
  
  const [period, setPeriod] = useState<TimeFilter>("mes");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [rankingModalOpen, setRankingModalOpen] = useState<RankingType>(null);
  
  const [timelineSearch, setTimelineSearch] = useState("");
  const [timelineAuditorFilter, setTimelineAuditorFilter] = useState("all");
  const [timelineSeverityFilter, setTimelineSeverityFilter] = useState("all");

  // ─── BUSINESS LOGIC (preserved exactly) ────────────────────────────
  const stats = useMemo(() => {
    if (!discrepanciesData || discrepanciesData.length === 0) return null;

    let startD: Date | undefined = customStart ? new Date(customStart + "T00:00:00") : undefined;
    let endD: Date | undefined = customEnd ? new Date(customEnd + "T23:59:59") : undefined;
    if (startD && !endD) endD = new Date(startD.getTime() + 86400000 - 1);

    const now = new Date();
    if (period !== "custom") {
        if (period === "dia") {
            startD = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endD = new Date(startD.getTime() + 86400000 - 1);
        } else if (period === "semana") {
            const day = now.getDay() || 7; 
            if (day !== 1) now.setHours(-24 * (day - 1)); 
            startD = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endD = new Date(startD.getTime() + 7 * 86400000 - 1);
        } else if (period === "mes") {
            startD = new Date(now.getFullYear(), now.getMonth(), 1);
            endD = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        } else if (period === "ano") {
            startD = new Date(now.getFullYear(), 0, 1);
            endD = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        }
    }

    const records = techFilter 
      ? discrepanciesData.filter(r => {
          const tech = r.TECNICO || r.CLIENTE || "Técnico Desconhecido";
          return tech.toLowerCase().includes(techFilter.toLowerCase());
        })
      : discrepanciesData;

    const dateFilteredRecords = records.filter(r => {
        let tempDate: Date | null = null;
        if (typeof r["DATA/HORA_FECHAMENTO"] === "number") {
             tempDate = new Date((r["DATA/HORA_FECHAMENTO"] - 25569) * 86400 * 1000);
        } else if (r["DATA/HORA_FECHAMENTO"]) {
             const parts = String(r["DATA/HORA_FECHAMENTO"]).substr(0, 10).split('/');
             if (parts.length === 3) tempDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`);
        }
        
        if (!tempDate) return true;
        if (startD && tempDate < startD) return false;
        if (endD && tempDate > endD) return false;
        
        return true;
    });

    const techMap = new Map<string, number>();
    const audMap = new Map<string, number>();
    const diagMap = new Map<string, number>();
    const serviceMap = new Map<string, number>();

    if (registeredTechnicians) {
        registeredTechnicians.forEach(t => {
            if (t.status === "Ativo") {
                techMap.set(t.name.toUpperCase(), 0);
            }
        });
    }

    dateFilteredRecords.forEach(r => {
       const techRaw = r.TECNICO || r.CLIENTE || "Técnico Desconhecido";
       const tech = techRaw.toUpperCase();
       techMap.set(techRaw, (techMap.get(techRaw) || techMap.get(tech) || 0) + 1);

       const aud = r.AUDITOR || "Auditor Não Informado";
       audMap.set(aud, (audMap.get(aud) || 0) + 1);

       const diag = r.DIAGNOSTICO_MENSAGEM_OS || "Não Informado";
       diagMap.set(diag, (diagMap.get(diag) || 0) + 1);
       
       const service = r.ASSUNTO_SERVIÇO_REALIZADO || "Não Informado";
       serviceMap.set(service, (serviceMap.get(service) || 0) + 1);
    });

    const allTechniciansDesc = Array.from(techMap.entries())
      .map(([name, count]) => ({ name, count, percentage: 0 }))
      .sort((a, b) => b.count - a.count);
      
    if (allTechniciansDesc.length > 0) {
      const maxTech = allTechniciansDesc[0].count;
      allTechniciansDesc.forEach(t => t.percentage = (t.count / maxTech) * 100);
    }
    const technicians = allTechniciansDesc.slice(0, 5);

    const allTechniciansAsc = [...allTechniciansDesc].sort((a, b) => a.count - b.count);
    if (allTechniciansAsc.length > 0) {
      const maxBest = allTechniciansAsc[allTechniciansAsc.length - 1].count;
      allTechniciansAsc.forEach(t => t.percentage = (t.count / maxBest) * 100);
    }
    const bestTechnicians = allTechniciansAsc.slice(0, 5);

    const allAuditors = Array.from(audMap.entries())
      .map(([name, count]) => ({ name, count, percentage: 0 }))
      .sort((a, b) => b.count - a.count);
    if (allAuditors.length > 0) {
      const maxAud = allAuditors[0].count;
      allAuditors.forEach(a => a.percentage = (a.count / maxAud) * 100);
    }
    const auditors = allAuditors.slice(0, 5);

    const diagnostics = Array.from(diagMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); 
      
    const services = Array.from(serviceMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); 
    
    const totalDiags = dateFilteredRecords.length;

    const cardsRaw = [...dateFilteredRecords].reverse().map((r, i) => {
        let dateStr = String(r["DATA/HORA_FECHAMENTO"] || "");
        if (typeof r["DATA/HORA_FECHAMENTO"] === "number") {
             const tempDate = new Date((r["DATA/HORA_FECHAMENTO"] - 25569) * 86400 * 1000);
             dateStr = tempDate.toLocaleDateString('pt-BR');
        } else if (dateStr.length > 10) {
             dateStr = dateStr.substring(0, 10);
        }

        const msgString = r.DIAGNOSTICO_MENSAGEM_OS || r.MENSAGEM_OS || "Detalhe da divergência omitido no apontamento.";
        const isCritical = msgString.toLowerCase().includes("crítico") || msgString.toLowerCase().includes("vza");

        return {
           id: String(i),
           title: r.ASSUNTO_OS || r.ASSUNTO_SERVIÇO_REALIZADO || "O.S Com Divergência",
           date: dateStr,
           description: msgString,
           auditor: r.AUDITOR || "Desconhecido",
           technician: r.TECNICO || r.CLIENTE || "Desconhecido",
           severity: isCritical ? "high" : "medium"
        };
    });

    return { 
        technicians, allTechniciansDesc, 
        bestTechnicians, allTechniciansAsc, 
        auditors, allAuditors, 
        diagnostics, services, 
        totalDiags, cardsRaw,
        dateFilteredRecords
    };
  }, [discrepanciesData, registeredTechnicians, techFilter, period, customStart, customEnd]);

  const cardsRaw = stats?.cardsRaw || [];

  const { filteredCards, availableAuditors } = useMemo(() => {
    if (!cardsRaw || cardsRaw.length === 0) return { filteredCards: [], availableAuditors: [] };
    
    const availableAuditors = Array.from(new Set(cardsRaw.map((c: any) => c.auditor))).sort() as string[];
    
    const filtered = cardsRaw.filter((c: any) => {
       const searchLower = timelineSearch.toLowerCase();
       if (timelineSearch && !c.title.toLowerCase().includes(searchLower) && !c.description.toLowerCase().includes(searchLower) && !c.technician.toLowerCase().includes(searchLower)) return false;
       if (timelineAuditorFilter !== "all" && c.auditor !== timelineAuditorFilter) return false;
       if (timelineSeverityFilter !== "all" && c.severity !== timelineSeverityFilter) return false;
       return true;
    }).slice(0, 50);

    return { filteredCards: filtered, availableAuditors };
  }, [cardsRaw, timelineSearch, timelineAuditorFilter, timelineSeverityFilter]);

  // ─── Empty State ───────────────────────────────────────────────────
  if (!stats) {
    return (
      <motion.div
          className="flex flex-col items-center justify-center py-24 text-center space-y-5"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
      >
        <motion.div
            className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200 shadow-inner"
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        >
           <FileX2 className="w-9 h-9 text-slate-300" />
        </motion.div>
        <div className="max-w-sm">
          <h3 className="text-xl font-bold text-slate-700 font-headline mb-1.5">Base de Divergências Vazia</h3>
          <p className="text-slate-500 text-sm">Importe o arquivo de Divergências dos Técnicos na aba "Importação" para popular este painel.</p>
        </div>
      </motion.div>
    );
  }

  const { 
    technicians, allTechniciansDesc, 
    bestTechnicians, allTechniciansAsc, 
    auditors, allAuditors, 
    diagnostics, services, 
    totalDiags,
    dateFilteredRecords
  } = stats;

  const currentRankingList = 
    rankingModalOpen === 'infratores' ? allTechniciansDesc :
    rankingModalOpen === 'melhores' ? allTechniciansAsc :
    rankingModalOpen === 'auditores' ? allAuditors : [];

  const barColors = ["bg-indigo-500", "bg-purple-500", "bg-violet-400", "bg-fuchsia-400", "bg-pink-400"];

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════
  return (
    <>
      <motion.div
          className="space-y-7"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
      >
        {/* ═══ HEADER ═══════════════════════════════════════════════════ */}
        <motion.header
            className="flex flex-col xl:flex-row xl:items-end justify-between gap-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
        >
            <div className="max-w-2xl">
                <div className="flex items-center gap-3 mb-3">
                    <motion.div
                        className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.2 }}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                    >
                        <Target className="w-5 h-5 text-white" />
                    </motion.div>
                    <motion.h2
                        className="text-3xl font-extrabold text-slate-900 font-headline tracking-tight"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                    >
                        Divergências Técnicas
                    </motion.h2>
                </div>
                <motion.p
                    className="text-slate-500 text-sm leading-relaxed ml-[52px]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.45, duration: 0.4 }}
                >
                    Erros e retrabalhos identificados em campo pelos auditores.
                </motion.p>
            </div>

            <div className="flex flex-col items-end gap-3">
                {/* Period Selector */}
                <motion.div
                    className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200/60 shadow-sm"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    {(["dia", "semana", "mes", "ano"] as TimeFilter[]).map((p) => (
                        <motion.button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={cn(
                                "px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-200",
                                period === p
                                    ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md shadow-violet-500/20"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                            )}
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {periodLabels[p]}
                        </motion.button>
                    ))}
                    <div className="w-px h-5 bg-slate-200 mx-1" />
                    <motion.button
                        onClick={() => setPeriod("custom")}
                        className={cn(
                            "px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-200 flex items-center gap-1.5",
                            period === "custom"
                                ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md shadow-violet-500/20"
                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                        )}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Calendar className="w-3.5 h-3.5" /> Custom
                    </motion.button>
                </motion.div>

                {/* Custom date range + search */}
                <motion.div
                    className="flex flex-wrap items-center gap-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    <AnimatePresence>
                        {period === "custom" && (
                            <motion.div
                                className="flex items-center gap-2"
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: "auto" }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.25 }}
                            >
                                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/20 transition-all" />
                                <span className="text-slate-400 text-xs font-bold">até</span>
                                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/20 transition-all" />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar técnico..."
                            value={techFilter}
                            onChange={(e) => setTechFilter(e.target.value)}
                            className="pl-8 pr-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-violet-400/30 focus:border-violet-400 min-w-[200px] text-xs font-bold text-slate-700 transition-all"
                        />
                    </div>

                    {/* Total badge */}
                    <motion.div
                        className="bg-gradient-to-r from-violet-500 to-purple-600 text-white px-4 py-2 rounded-lg shadow-md shadow-violet-500/20 flex items-center gap-2"
                        whileHover={{ scale: 1.03 }}
                    >
                        <AlertTriangle className="w-4 h-4 text-white/70" />
                        <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-white/60 leading-none">Casos</p>
                            <p className="text-sm font-black leading-none mt-0.5"><AnimatedNumber value={totalDiags} /></p>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </motion.header>

        {/* ═══ RANKING TRIPTYCH ════════════════════════════════════════ */}
        <motion.div
            className="grid grid-cols-1 lg:grid-cols-3 gap-5"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
        >
            {/* Top Infratores */}
            <motion.div variants={cardVariant} className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden group" whileHover={{ y: -3 }}>
                <div className="p-5 pb-3">
                    <div className="flex items-center gap-2 mb-5">
                        <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-colors duration-300">
                            <AlertCircle className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 font-headline">Top Infratores</h3>
                    </div>
                    <div className="space-y-3.5">
                        {technicians.map((tech, i) => (
                            <motion.div
                                key={i}
                                className="cursor-pointer group/item"
                                onClick={() => setSelectedTech(tech.name)}
                                custom={i}
                                variants={rowVariant}
                                initial="hidden"
                                animate="visible"
                                whileHover={{ x: 3 }}
                            >
                                <div className="flex justify-between text-[11px] font-bold mb-1.5">
                                    <span className="text-slate-700 uppercase group-hover/item:text-rose-600 transition-colors truncate mr-2">{tech.name}</span>
                                    <span className="text-rose-500 shrink-0">{tech.count}</span>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                    <motion.div
                                        className="bg-gradient-to-r from-rose-400 to-rose-600 h-full rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${tech.percentage}%` }}
                                        transition={{ duration: 1, ease: "easeOut", delay: 0.3 + i * 0.08 }}
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
                <motion.button
                    onClick={() => setRankingModalOpen('infratores')}
                    className="w-full px-5 py-3 bg-slate-50/50 border-t border-slate-100 text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors flex items-center justify-center gap-1.5 uppercase tracking-widest"
                    whileHover={{ backgroundColor: "rgba(255,241,242,0.5)" }}
                >
                    <ListOrdered className="w-3.5 h-3.5" /> Ver Ranking Completo
                </motion.button>
            </motion.div>

            {/* Menos Divergência */}
            <motion.div variants={cardVariant} className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden group" whileHover={{ y: -3 }}>
                <div className="p-5 pb-3">
                    <div className="flex items-center gap-2 mb-5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 font-headline">Menos Divergência</h3>
                    </div>
                    <div className="space-y-3.5">
                        {bestTechnicians.map((tech, i) => (
                            <motion.div
                                key={i}
                                className="cursor-pointer group/item"
                                onClick={() => setSelectedTech(tech.name)}
                                custom={i}
                                variants={rowVariant}
                                initial="hidden"
                                animate="visible"
                                whileHover={{ x: 3 }}
                            >
                                <div className="flex justify-between text-[11px] font-bold mb-1.5">
                                    <span className="text-slate-700 uppercase group-hover/item:text-emerald-600 transition-colors truncate mr-2">{tech.name}</span>
                                    <span className="text-emerald-500 shrink-0">{tech.count}</span>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                    <motion.div
                                        className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${tech.percentage}%` }}
                                        transition={{ duration: 1, ease: "easeOut", delay: 0.3 + i * 0.08 }}
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
                <motion.button
                    onClick={() => setRankingModalOpen('melhores')}
                    className="w-full px-5 py-3 bg-slate-50/50 border-t border-slate-100 text-[10px] font-bold text-slate-400 hover:text-emerald-500 transition-colors flex items-center justify-center gap-1.5 uppercase tracking-widest"
                    whileHover={{ backgroundColor: "rgba(236,253,245,0.5)" }}
                >
                    <ListOrdered className="w-3.5 h-3.5" /> Ver Ranking Completo
                </motion.button>
            </motion.div>

            {/* Auditores */}
            <motion.div variants={cardVariant} className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden group" whileHover={{ y: -3 }}>
                <div className="p-5 pb-3">
                    <div className="flex items-center gap-2 mb-5">
                        <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-500 flex items-center justify-center group-hover:bg-violet-500 group-hover:text-white transition-colors duration-300">
                            <Eye className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 font-headline">Reportes por Auditor</h3>
                    </div>
                    <div className="space-y-3.5">
                        {auditors.map((auditor, i) => (
                            <motion.div
                                key={i}
                                custom={i}
                                variants={rowVariant}
                                initial="hidden"
                                animate="visible"
                            >
                                <div className="flex justify-between text-[11px] font-bold mb-1.5">
                                    <span className="text-slate-700 uppercase truncate mr-2">{auditor.name}</span>
                                    <span className="text-violet-500 shrink-0">{auditor.count}</span>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                    <motion.div
                                        className="bg-gradient-to-r from-violet-400 to-purple-600 h-full rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${auditor.percentage}%` }}
                                        transition={{ duration: 1, ease: "easeOut", delay: 0.3 + i * 0.08 }}
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
                <motion.button
                    onClick={() => setRankingModalOpen('auditores')}
                    className="w-full px-5 py-3 bg-slate-50/50 border-t border-slate-100 text-[10px] font-bold text-slate-400 hover:text-violet-500 transition-colors flex items-center justify-center gap-1.5 uppercase tracking-widest"
                    whileHover={{ backgroundColor: "rgba(245,243,255,0.5)" }}
                >
                    <ListOrdered className="w-3.5 h-3.5" /> Ver Ranking Completo
                </motion.button>
            </motion.div>
        </motion.div>

        {/* ═══ HORIZONTAL BAR CHARTS — DIAGNÓSTICOS + SERVIÇOS ════════ */}
        <motion.div
            className="grid grid-cols-1 lg:grid-cols-2 gap-5"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
        >
            {/* Diagnósticos */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
                <div className="flex items-center gap-2 mb-5">
                    <FileWarning className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-sm font-bold text-slate-800 font-headline">Top Motivos (Diagnósticos)</h3>
                </div>
                <div className="space-y-4">
                    {diagnostics.map((diag, i) => {
                        const pct = totalDiags > 0 ? Math.round((diag.count / totalDiags) * 100) : 0;
                        return (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.6 + i * 0.08 }}
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className={cn("w-2 h-2 rounded-full shrink-0", barColors[i] || "bg-slate-300")} />
                                        <span className="text-[11px] font-bold text-slate-700 truncate uppercase" title={diag.name}>{diag.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                        <span className="text-[10px] font-black text-slate-400">{diag.count}</span>
                                        <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">{pct}%</span>
                                    </div>
                                </div>
                                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                                    <motion.div
                                        className={cn("h-full rounded-full", barColors[i] || "bg-slate-300")}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${pct}%` }}
                                        transition={{ duration: 1.2, ease: "easeOut", delay: 0.7 + i * 0.1 }}
                                    />
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Serviços */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
                <div className="flex items-center gap-2 mb-5">
                    <Wrench className="w-5 h-5 text-purple-500" />
                    <h3 className="text-sm font-bold text-slate-800 font-headline">Top Tipos de Serviço</h3>
                </div>
                <div className="space-y-4">
                    {services.map((svc, i) => {
                        const pct = totalDiags > 0 ? Math.round((svc.count / totalDiags) * 100) : 0;
                        return (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.6 + i * 0.08 }}
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className={cn("w-2 h-2 rounded-full shrink-0", barColors[i] || "bg-slate-300")} />
                                        <span className="text-[11px] font-bold text-slate-700 truncate uppercase" title={svc.name}>{svc.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                        <span className="text-[10px] font-black text-slate-400">{svc.count}</span>
                                        <span className="text-[10px] font-black text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded">{pct}%</span>
                                    </div>
                                </div>
                                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                                    <motion.div
                                        className={cn("h-full rounded-full", barColors[i] || "bg-slate-300")}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${pct}%` }}
                                        transition={{ duration: 1.2, ease: "easeOut", delay: 0.7 + i * 0.1 }}
                                    />
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </motion.div>

        {/* ═══ TIMELINE ═══════════════════════════════════════════════ */}
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.4 }}
        >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-2.5">
                    <Zap className="w-5 h-5 text-violet-500" />
                    <h3 className="text-base font-bold font-headline text-slate-800">Timeline de Divergências</h3>
                    <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">50 recentes</span>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={timelineSearch}
                            onChange={(e) => setTimelineSearch(e.target.value)}
                            className="pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-violet-400/30 focus:border-violet-400 w-[160px] text-xs font-bold text-slate-700 transition-all"
                        />
                    </div>
                    <select
                        value={timelineAuditorFilter}
                        onChange={(e) => setTimelineAuditorFilter(e.target.value)}
                        className="py-2 pl-3 pr-7 bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-violet-400/30 focus:border-violet-400 text-xs font-bold text-slate-700 appearance-none transition-all"
                    >
                        <option value="all">Todos Auditores</option>
                        {availableAuditors.map((aud: string) => (
                            <option key={aud} value={aud}>{aud}</option>
                        ))}
                    </select>
                    <select
                        value={timelineSeverityFilter}
                        onChange={(e) => setTimelineSeverityFilter(e.target.value)}
                        className="py-2 pl-3 pr-7 bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-violet-400/30 focus:border-violet-400 text-xs font-bold text-slate-700 appearance-none transition-all"
                    >
                        <option value="all">Todas Severidades</option>
                        <option value="high">Crítico</option>
                        <option value="medium">Médio</option>
                    </select>
                </div>
            </div>

            {filteredCards.length === 0 ? (
                <motion.div
                    className="py-16 flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <Search className="w-7 h-7 text-slate-300 mb-2" />
                    <p className="text-sm font-semibold">Nenhuma divergência encontrada com estes filtros.</p>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {filteredCards.map((card: any, i: number) => (
                        <motion.div
                            key={card.id}
                            custom={i}
                            variants={rowVariant}
                            initial="hidden"
                            animate="visible"
                            className="bg-white rounded-xl border border-slate-200/60 hover:border-slate-300 hover:shadow-md transition-all duration-200 group relative overflow-hidden"
                            whileHover={{ y: -2 }}
                        >
                            {/* Severity bar */}
                            <div className={cn(
                                "absolute top-0 left-0 w-1 h-full",
                                card.severity === "high" ? "bg-gradient-to-b from-rose-500 to-red-600" : "bg-gradient-to-b from-amber-400 to-orange-500"
                            )} />

                            <div className="p-5 pl-6">
                                {/* Header */}
                                <div className="flex justify-between items-start mb-3 gap-3">
                                    <div className="min-w-0">
                                        <h4 className="text-sm font-bold text-slate-800 font-headline leading-snug truncate">{card.title}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={cn(
                                                "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight",
                                                card.severity === "high" ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-amber-50 text-amber-600 border border-amber-100"
                                            )}>
                                                {card.severity === "high" ? <AlertTriangle className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
                                                {card.severity === "high" ? "Crítico" : "Médio"}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 shrink-0 whitespace-nowrap">{card.date}</span>
                                </div>

                                {/* Description */}
                                <div className="text-xs text-slate-600 leading-relaxed bg-slate-50/60 p-3 rounded-lg border border-slate-100/60 mb-4 italic line-clamp-2">
                                    "{card.description}"
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Eye className="w-2.5 h-2.5" /> Auditor</p>
                                            <p className="text-[11px] font-black text-slate-700 uppercase mt-0.5">{card.auditor}</p>
                                        </div>
                                        <div className="w-px h-6 bg-slate-100" />
                                        <div>
                                            <p className="text-[9px] font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1"><AlertCircle className="w-2.5 h-2.5" /> Técnico</p>
                                            <motion.p
                                                className="text-[11px] font-black text-slate-700 uppercase mt-0.5 cursor-pointer hover:text-violet-600 transition-colors"
                                                onClick={() => setSelectedTech(card.technician)}
                                                whileHover={{ x: 2 }}
                                            >
                                                {card.technician}
                                            </motion.p>
                                        </div>
                                    </div>
                                    <motion.div
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        whileHover={{ scale: 1.1 }}
                                    >
                                        <ChevronRight className="w-4 h-4 text-slate-300" />
                                    </motion.div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
      </motion.div>

      {/* ═══ MODAL: TÉCNICO DETALHE ═══════════════════════════════════ */}
      <AnimatePresence>
          {selectedTech && (
              <motion.div className="fixed inset-0 z-[60] flex items-center justify-center p-4" variants={modalOverlay} initial="hidden" animate="visible" exit="exit">
                  <motion.div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setSelectedTech(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
                  <motion.div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col relative z-10 border border-slate-200/60" variants={modalContent} initial="hidden" animate="visible" exit="exit">
                      <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                          <div className="flex items-center gap-3">
                              <motion.div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/20" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}>
                                  <Search className="w-5 h-5 text-white" />
                              </motion.div>
                              <div>
                                  <h3 className="text-lg font-black font-headline text-slate-800 uppercase">{selectedTech}</h3>
                                  <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Diagnósticos registrados no período</p>
                              </div>
                          </div>
                          <motion.button onClick={() => setSelectedTech(null)} className="w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-xl transition-colors" whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}>
                              <X className="w-5 h-5" />
                          </motion.button>
                      </div>
                      <div className="p-5 overflow-y-auto flex-1 space-y-2.5 custom-scrollbar">
                          {dateFilteredRecords
                            ?.filter((r: any) => {
                                const tech = r.TECNICO || r.CLIENTE || "Técnico Desconhecido";
                                return tech === selectedTech;
                            })
                            .map((r: any, i: number) => {
                                const diag = r.DIAGNOSTICO_MENSAGEM_OS || r.MENSAGEM_OS || "Não Informado";
                                const assunto = r.ASSUNTO_SERVIÇO_REALIZADO || r.ASSUNTO_OS || "O.S";
                                return (
                                    <motion.div
                                        key={i}
                                        custom={i}
                                        variants={rowVariant}
                                        initial="hidden"
                                        animate="visible"
                                        className="p-4 bg-white border border-slate-200 rounded-xl relative overflow-hidden group shadow-sm hover:shadow-md transition-all"
                                        whileHover={{ x: 4 }}
                                    >
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-200 group-hover:bg-violet-500 transition-colors" />
                                        <div className="ml-2 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">{assunto}</p>
                                                <p className="text-sm font-semibold text-slate-700 leading-relaxed">"{diag}"</p>
                                            </div>
                                            {r.ID_CLIENTE && (
                                                <div className="shrink-0 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-right">
                                                    <p className="text-[8px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">Cód. Cliente</p>
                                                    <p className="text-xs font-black text-violet-500 font-headline">{r.ID_CLIENTE}</p>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                      </div>
                  </motion.div>
              </motion.div>
          )}
      </AnimatePresence>

      {/* ═══ MODAL: RANKING COMPLETO ══════════════════════════════════ */}
      <AnimatePresence>
          {rankingModalOpen && (
              <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" variants={modalOverlay} initial="hidden" animate="visible" exit="exit">
                  <motion.div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setRankingModalOpen(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
                  <motion.div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col relative z-10 border border-slate-200/60" variants={modalContent} initial="hidden" animate="visible" exit="exit">
                      <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                          <div className="flex items-center gap-3">
                              <motion.div
                                  className={cn(
                                      "w-10 h-10 rounded-xl flex items-center justify-center shadow-md",
                                      rankingModalOpen === 'infratores' ? "bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/20" :
                                      rankingModalOpen === 'melhores' ? "bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/20" :
                                      "bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/20"
                                  )}
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: "spring", stiffness: 300 }}
                              >
                                  <ListOrdered className="w-5 h-5 text-white" />
                              </motion.div>
                              <div>
                                  <h3 className="text-lg font-black font-headline text-slate-800">
                                      {rankingModalOpen === 'infratores' ? 'Ranking de Infratores' : 
                                       rankingModalOpen === 'melhores' ? 'Ranking de Qualidade' : 
                                       'Ranking de Auditores'}
                                  </h3>
                                  <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Lista completa do período</p>
                              </div>
                          </div>
                          <motion.button onClick={() => setRankingModalOpen(null)} className="w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-xl transition-colors" whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}>
                              <X className="w-5 h-5" />
                          </motion.button>
                      </div>
                      <div className="p-4 overflow-y-auto flex-1 space-y-1.5 custom-scrollbar">
                          {currentRankingList.map((item, i) => (
                              <motion.div 
                                  key={i}
                                  custom={i}
                                  variants={rowVariant}
                                  initial="hidden"
                                  animate="visible"
                                  onClick={() => {
                                      if(rankingModalOpen !== 'auditores') {
                                          setSelectedTech(item.name);
                                      }
                                  }}
                                  className={cn(
                                      "flex items-center justify-between px-4 py-3 bg-white border border-slate-100 rounded-xl relative overflow-hidden group transition-all",
                                      rankingModalOpen !== 'auditores' ? "cursor-pointer hover:shadow-sm hover:border-slate-200" : ""
                                  )}
                                  whileHover={rankingModalOpen !== 'auditores' ? { x: 4 } : {}}
                              >
                                  <div className="flex items-center gap-3">
                                      <div className={cn(
                                          "w-7 h-7 flex items-center justify-center rounded-lg text-[11px] font-black",
                                          i === 0 ? (rankingModalOpen === 'infratores' ? "bg-rose-100 text-rose-600" : rankingModalOpen === 'melhores' ? "bg-emerald-100 text-emerald-600" : "bg-violet-100 text-violet-600") :
                                          "bg-slate-100 text-slate-500"
                                      )}>
                                          {i + 1}
                                      </div>
                                      <span className="text-xs font-bold uppercase text-slate-700 group-hover:text-violet-600 transition-colors">{item.name}</span>
                                  </div>
                                  <span className={cn(
                                      "text-xs font-black",
                                      rankingModalOpen === 'infratores' ? "text-rose-500" : 
                                      rankingModalOpen === 'melhores' ? "text-emerald-500" : "text-violet-500"
                                  )}>
                                      {item.count}
                                      <span className="text-[9px] font-bold text-slate-400 ml-1">{rankingModalOpen === 'auditores' ? 'reportes' : 'falhas'}</span>
                                  </span>
                              </motion.div>
                          ))}
                      </div>
                  </motion.div>
              </motion.div>
          )}
      </AnimatePresence>
    </>
  );
}
