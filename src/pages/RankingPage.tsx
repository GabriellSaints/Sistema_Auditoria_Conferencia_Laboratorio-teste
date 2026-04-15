import React, { useMemo, useState } from "react";
import {
    Trophy,
    Star,
    TrendingUp,
    TrendingDown,
    ChevronRight,
    Award,
    Medal,
    Users,
    CalendarDays,
    XCircle,
    X,
    Crown,
    Zap,
    Target,
    Clock,
    AlertTriangle,
    Flame,
    ShieldCheck,
    BarChart3,
    FileCheck2,
    Search
} from "lucide-react";
import { cn } from "../lib/utils";
import { useData } from "../context/DataContext";
import { motion, AnimatePresence } from "motion/react";

/* ──────────────────────────────────────────────────────────────────────
   RANKING PAGE — REDESIGN COM ANIMAÇÕES
   Motion: staggered podium cards, cascading list rows, animated panel,
   counting numbers, shimmer effects, floating trophy, pulse glows.
   ────────────────────────────────────────────────────────────────────── */

// ─── Animated number counter ──────────────────────────────────────────
function AnimatedScore({ value, className }: { value: number; className?: string }) {
    const [displayValue, setDisplayValue] = React.useState(0);

    React.useEffect(() => {
        const duration = 1200;
        const start = performance.now();
        const startVal = displayValue;

        const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // easeOutExpo
            const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            setDisplayValue(Math.round(startVal + (value - startVal) * eased));
            if (progress < 1) requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    }, [value]);

    return <span className={className}>{displayValue}</span>;
}

// ─── Stagger container variants ──────────────────────────────────────
const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.12,
            delayChildren: 0.1,
        },
    },
};

const staggerItem = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { type: "spring", stiffness: 260, damping: 24 },
    },
};

const listRowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
        opacity: 1,
        x: 0,
        transition: {
            delay: i * 0.05,
            type: "spring",
            stiffness: 300,
            damping: 28,
        },
    }),
};

const detailPanelVariants = {
    hidden: { opacity: 0, x: 40, scale: 0.97 },
    visible: {
        opacity: 1,
        x: 0,
        scale: 1,
        transition: { type: "spring", stiffness: 280, damping: 26, delay: 0.1 },
    },
    exit: {
        opacity: 0,
        x: 40,
        scale: 0.97,
        transition: { duration: 0.2 },
    },
};

const breakdownRowVariants = {
    hidden: { opacity: 0, x: -12 },
    visible: (i: number) => ({
        opacity: 1,
        x: 0,
        transition: { delay: 0.3 + i * 0.06, type: "spring", stiffness: 300, damping: 26 },
    }),
};

export default function RankingView() {
    const { monitoringData, discrepanciesData, attendanceData, auditors } = useData();
    const [filterMonth, setFilterMonth] = useState<string>("");
    const [selectedAuditorId, setSelectedAuditorId] = useState<string | null>(null);

    const formatMinutes = (m: number) => {
        if (!m) return "0min";
        if (m < 60) return `${m}min`;
        const h = Math.floor(m / 60);
        const min = m % 60;
        return min > 0 ? `${h}h ${min}min` : `${h}h`;
    };

    // ─── CÁLCULO DO RANKING (mesma lógica de negócio) ────────────────
    const ranking = useMemo(() => {
        let targetYear = -1;
        let targetMonth = -1;
        if (filterMonth) {
            const parts = filterMonth.split("-");
            if (parts.length === 2) {
                targetYear = parseInt(parts[0], 10);
                targetMonth = parseInt(parts[1], 10) - 1;
            }
        }

        const isMatch = (rawValue: any) => {
            if (targetYear === -1) return true;
            let tempDate: Date | null = null;
            if (typeof rawValue === "number") {
                tempDate = new Date((rawValue - 25569) * 86400 * 1000);
            } else if (rawValue) {
                const partsStr = String(rawValue).substr(0, 10).split(/[-/]/);
                if (partsStr.length === 3) {
                    if (partsStr[0].length === 4) {
                        tempDate = new Date(`${partsStr[0]}-${partsStr[1]}-${partsStr[2]}T12:00:00`);
                    } else {
                        tempDate = new Date(`${partsStr[2]}-${partsStr[1]}-${partsStr[0]}T12:00:00`);
                    }
                } else {
                    tempDate = new Date(rawValue);
                }
            }
            if (!tempDate || isNaN(tempDate.getTime())) return true;
            return tempDate.getFullYear() === targetYear && tempDate.getMonth() === targetMonth;
        };

        const filteredAttendance = attendanceData.filter(r => isMatch(r.DATA_REGISTRO));
        const filteredMonitoring = monitoringData.filter(r => isMatch(r["DATA/HORA_FECHAMENTO"] || r.DATA_REGISTRO));
        const filteredDiscrepancies = discrepanciesData.filter(r => isMatch(r["DATA/HORA_FECHAMENTO"] || r.DATA_REGISTRO || (r as any).date));

        // 1. Atrasos
        const delayMap = new Map<string, { totalDelay: number; faltas: number; records: any[] }>();
        filteredAttendance.forEach(r => {
            const collabName = (r.COLABORADOR || "").toUpperCase();
            if (!delayMap.has(collabName)) delayMap.set(collabName, { totalDelay: 0, faltas: 0, records: [] });

            const stat = delayMap.get(collabName)!;
            const status = (r.STATUS || "").toUpperCase();

            let recordDelay = 0;
            let isFalta = false;

            if (status === "FALTA") {
                stat.faltas += 1;
                isFalta = true;
            }

            const isJustified = (r.OBERVAÇÃO && r.OBERVAÇÃO.toUpperCase() !== "OK" && r.OBERVAÇÃO.toUpperCase() !== "SEM JUSTIFICATIVA" && !r.OBERVAÇÃO.toUpperCase().includes("ATRASO"));
            const auditorConfig = auditors.find(a => a.name.toUpperCase() === collabName);

            if (status === "ATRASO" && r.MINUTOS_ATRASO) {
                recordDelay = r.MINUTOS_ATRASO;
            } else if (auditorConfig && !isJustified && status !== "FALTA") {
                let escalaDia: any = auditorConfig.escala;

                let regDate: Date;
                if (typeof r.DATA_REGISTRO === 'number') {
                    regDate = new Date((r.DATA_REGISTRO - 25569) * 86400 * 1000);
                } else {
                    const parts = String(r.DATA_REGISTRO).split("-");
                    if (parts.length === 3) {
                        regDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                    } else {
                        regDate = new Date(r.DATA_REGISTRO);
                    }
                }
                const regDay = regDate.getDay();

                if (auditorConfig.tipoEscala === "ALTERNADA" && auditorConfig.escalaAlternada) {
                    const alt = auditorConfig.escalaAlternada;
                    const refParts = alt.dataReferenciaSabadoTrabalhado.split("-");
                    const refDate = new Date(parseInt(refParts[0]), parseInt(refParts[1]) - 1, parseInt(refParts[2]));

                    const refWeekStart = new Date(refDate);
                    refWeekStart.setDate(refDate.getDate() - refDate.getDay());

                    const regWeekStart = new Date(regDate);
                    regWeekStart.setDate(regDate.getDate() - regDate.getDay());

                    const diffTime = regWeekStart.getTime() - refWeekStart.getTime();
                    const diffWeeks = Math.floor(Math.abs(diffTime) / (1000 * 60 * 60 * 24 * 7));

                    const isWeekWithSabado = diffWeeks % 2 === 0;

                    escalaDia = null;

                    if (isWeekWithSabado) {
                        if (regDay === 6) escalaDia = alt.semanaComSabado.sabado;
                        else if (regDay >= 1 && regDay <= 5) escalaDia = alt.semanaComSabado.segSex;
                    } else {
                        if (regDay >= 1 && regDay <= 5) escalaDia = alt.semanaSemSabado.segSex;
                    }
                }

                if (escalaDia) {
                    const parseTime = (timeStr?: string) => {
                        if (!timeStr) return null;
                        const p = timeStr.split(":");
                        return parseInt(p[0]) * 60 + parseInt(p[1]);
                    };

                    const escE = parseTime(escalaDia.entrada);
                    const recE = parseTime(r.ENTRADA);
                    if (recE && escE && recE > escE) recordDelay += (recE - escE);

                    const escVA = parseTime(escalaDia.saidaAlmoco);
                    const recVA = parseTime(r.SAIDA_ALMOÇO);
                    if (recVA && escVA && recVA > escVA) recordDelay += (recVA - escVA);
                }
            }

            stat.totalDelay += recordDelay;

            if (recordDelay > 0 || isFalta) {
                let dataStr = String(r.DATA_REGISTRO);
                if (typeof r.DATA_REGISTRO === 'number') {
                    const d = new Date((r.DATA_REGISTRO - 25569) * 86400 * 1000);
                    dataStr = d.toLocaleDateString('pt-BR');
                } else if (dataStr.length >= 10) {
                    const parts = dataStr.substring(0, 10).split("-");
                    if (parts.length === 3) dataStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
                }

                stat.records.push({
                    date: dataStr,
                    delay: recordDelay,
                    isFalta
                });
            }
        });

        // 2. O.S
        const osMap = new Map<string, number>();
        filteredMonitoring.forEach(r => {
            const aud = (r.AUDITOR || "").toUpperCase();
            osMap.set(aud, (osMap.get(aud) || 0) + 1);
        });

        // 3. Divergências
        const discMap = new Map<string, number>();
        filteredDiscrepancies.forEach(r => {
            const aud = (r.AUDITOR || "").toUpperCase();
            discMap.set(aud, (discMap.get(aud) || 0) + 1);
        });

        // 4. Pontuação Final — todos os auditores ATIVOS
        const leadersList = auditors.filter(a => a.status === "Ativo").map((a) => {
            const nameUpper = a.name.toUpperCase();
            const delayData = delayMap.get(nameUpper) || { totalDelay: 0, faltas: 0 };
            const osCount = osMap.get(nameUpper) || 0;
            const discCount = discMap.get(nameUpper) || 0;

            const baseScore = 1000;
            const osPoints = osCount * 2;
            const discPoints = discCount * 5;
            const delayPenalties = delayData.totalDelay * 2;
            const faltaPenalties = delayData.faltas * 50;

            let finalScore = baseScore + osPoints + discPoints - delayPenalties - faltaPenalties;
            if (finalScore < 0) finalScore = 0;

            return {
                id: a.id,
                name: a.name,
                score: finalScore,
                trend: (osPoints + discPoints) > (delayPenalties + faltaPenalties) ? "up" : "down",
                level: finalScore > 1500 ? "Senior Lead" : finalScore > 1100 ? "Especialista" : finalScore > 900 ? "Pleno" : "Júnior",
                avatar: `https://picsum.photos/seed/${a.name.replace(/\s/g, '')}/100/100`,
                metrics: { osCount, discCount, delayData, osPoints, discPoints, delayPenalties, faltaPenalties }
            };
        });

        leadersList.sort((a, b) => b.score - a.score);
        return leadersList.map((L, i) => ({ ...L, rank: i + 1 }));
    }, [monitoringData, discrepanciesData, attendanceData, auditors, filterMonth]);

    // Auditor selecionado para o painel de detalhes
    const selectedAuditor = useMemo(() => {
        if (!ranking || ranking.length === 0) return null;
        if (selectedAuditorId) {
            return ranking.find(l => l.id === selectedAuditorId) || ranking[0];
        }
        return ranking[0];
    }, [ranking, selectedAuditorId]);

    // Separação pódio / restante
    const podium = ranking.slice(0, 3);

    // Pontuação máxima para barra de progresso relativa
    const maxScore = ranking.length > 0 ? ranking[0].score : 1;

    // ═══════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════
    return (
        <motion.div
            className="space-y-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
        >
            {/* ═══ HEADER ═══════════════════════════════════════════════════ */}
            <motion.div
                className="flex flex-col md:flex-row md:items-end justify-between gap-6"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
            >
                <div className="max-w-2xl">
                    <div className="flex items-center gap-3 mb-3">
                        <motion.div
                            className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.2 }}
                            whileHover={{ scale: 1.1, rotate: 5 }}
                        >
                            <Trophy className="w-5 h-5 text-white" />
                        </motion.div>
                        <motion.h2
                            className="text-3xl font-extrabold text-slate-900 font-headline tracking-tight"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3, duration: 0.4 }}
                        >
                            Ranking Geral
                        </motion.h2>
                    </div>
                    <motion.p
                        className="text-slate-500 text-sm leading-relaxed ml-[52px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.4 }}
                    >
                        Pontuação consolidada por produtividade, assertividade e compliance de jornada.
                    </motion.p>
                </div>

                {/* Filtro de Competência */}
                <motion.div
                    className="bg-white p-3 pr-5 rounded-2xl shadow-sm border border-slate-200/60 flex items-center gap-3 hover:shadow-md hover:border-slate-300/60 transition-all duration-300 group"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.4 }}
                    whileHover={{ y: -2 }}
                >
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300">
                        <CalendarDays className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-0.5">Competência</span>
                        <div className="flex items-center gap-2">
                            <input
                                type="month"
                                value={filterMonth}
                                onChange={(e) => setFilterMonth(e.target.value)}
                                className="bg-transparent border-none p-0 text-sm font-bold text-slate-800 outline-none cursor-pointer focus:ring-0 uppercase font-headline"
                            />
                            {filterMonth && (
                                <motion.button
                                    onClick={() => setFilterMonth("")}
                                    className="text-slate-300 hover:text-rose-500 transition-colors bg-slate-50 hover:bg-rose-50 rounded-full p-1"
                                    title="Limpar filtro"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0 }}
                                    whileHover={{ scale: 1.2 }}
                                    whileTap={{ scale: 0.8 }}
                                >
                                    <XCircle className="w-4 h-4" />
                                </motion.button>
                            )}
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            {/* ═══ ESTADO VAZIO ═══════════════════════════════════════════ */}
            {!ranking || ranking.length === 0 ? (
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
                        <Users className="w-9 h-9 text-slate-300" />
                    </motion.div>
                    <div className="max-w-sm">
                        <h3 className="text-xl font-bold text-slate-700 font-headline mb-1.5">Sem Auditores Ativos</h3>
                        <p className="text-slate-500 text-sm">Configure a Escala de Auditores no painel de Configurações Globais para visualizar o ranking.</p>
                    </div>
                </motion.div>
            ) : (
                <>
                    {/* ═══ PÓDIO — TOP 3 ═════════════════════════════════════ */}
                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-3 gap-5"
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                    >
                        {[1, 0, 2].map((podiumIndex) => {
                            const person = podium[podiumIndex];
                            if (!person) return null;

                            const isFirst = person.rank === 1;
                            const isSecond = person.rank === 2;

                            const medalColors = isFirst
                                ? "from-amber-400 via-yellow-300 to-amber-500"
                                : isSecond
                                    ? "from-slate-300 via-slate-200 to-slate-400"
                                    : "from-amber-700 via-amber-600 to-amber-800";

                            const medalIcon = isFirst
                                ? <Crown className="w-5 h-5" />
                                : isSecond
                                    ? <Medal className="w-4 h-4" />
                                    : <Award className="w-4 h-4" />;

                            const cardBg = isFirst
                                ? "bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] text-white border-indigo-500/30 shadow-2xl shadow-indigo-900/30"
                                : "bg-white text-slate-900 border-slate-200/60 shadow-lg shadow-slate-200/40 hover:shadow-xl";

                            return (
                                <motion.div
                                    key={person.id}
                                    variants={staggerItem}
                                    onClick={() => setSelectedAuditorId(person.id)}
                                    className={cn(
                                        "relative rounded-2xl border p-6 cursor-pointer transition-shadow duration-300 group overflow-hidden",
                                        cardBg,
                                        isFirst ? "md:row-span-1 md:-mt-4 md:mb-0" : "",
                                        selectedAuditorId === person.id && !isFirst ? "ring-2 ring-indigo-400 border-indigo-300" : ""
                                    )}
                                    whileHover={{
                                        y: -6,
                                        transition: { type: "spring", stiffness: 400, damping: 20 }
                                    }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {/* Animated decorative glow */}
                                    {isFirst && (
                                        <>
                                            <motion.div
                                                className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"
                                                animate={{
                                                    scale: [1, 1.2, 1],
                                                    opacity: [0.3, 0.6, 0.3],
                                                }}
                                                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                                            />
                                            <motion.div
                                                className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"
                                                animate={{
                                                    scale: [1, 1.3, 1],
                                                    opacity: [0.2, 0.5, 0.2],
                                                }}
                                                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                                            />
                                        </>
                                    )}

                                    <div className="relative z-10">
                                        {/* Medal badge */}
                                        <div className="flex items-center justify-between mb-5">
                                            <motion.div
                                                className={cn(
                                                    "w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md text-white",
                                                    medalColors
                                                )}
                                                whileHover={{ rotate: [0, -10, 10, 0], scale: 1.15 }}
                                                transition={{ duration: 0.5 }}
                                            >
                                                {medalIcon}
                                            </motion.div>
                                            <span className={cn(
                                                "text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full",
                                                isFirst
                                                    ? "bg-amber-400/20 text-amber-300"
                                                    : person.trend === "up"
                                                        ? "bg-emerald-50 text-emerald-600"
                                                        : "bg-rose-50 text-rose-500"
                                            )}>
                                                {person.trend === "up" ? (
                                                    <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Alta Perf.</span>
                                                ) : (
                                                    <span className="flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Atenção</span>
                                                )}
                                            </span>
                                        </div>

                                        {/* Avatar + Name */}
                                        <div className="flex items-center gap-4 mb-5">
                                            <motion.div
                                                className={cn(
                                                    "w-14 h-14 rounded-2xl overflow-hidden shrink-0 shadow-md",
                                                    isFirst ? "ring-2 ring-white/20" : "ring-1 ring-slate-200"
                                                )}
                                                whileHover={{ scale: 1.08 }}
                                            >
                                                <img src={person.avatar} alt={person.name} className="w-full h-full object-cover" />
                                            </motion.div>
                                            <div className="min-w-0">
                                                <p className={cn(
                                                    "font-bold font-headline text-base uppercase truncate",
                                                    isFirst ? "text-white" : "text-slate-900"
                                                )}>
                                                    {person.name}
                                                </p>
                                                <p className={cn(
                                                    "text-[11px] uppercase tracking-widest font-semibold mt-0.5",
                                                    isFirst ? "text-indigo-300" : "text-slate-400"
                                                )}>
                                                    {person.level}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Score */}
                                        <div className={cn(
                                            "rounded-xl p-4",
                                            isFirst ? "bg-white/[0.06] backdrop-blur-sm border border-white/10" : "bg-slate-50 border border-slate-100"
                                        )}>
                                            <div className="flex items-end justify-between mb-2">
                                                <span className={cn(
                                                    "text-[10px] uppercase tracking-widest font-bold",
                                                    isFirst ? "text-white/50" : "text-slate-400"
                                                )}>
                                                    Pontuação
                                                </span>
                                                <span className={cn(
                                                    "text-2xl font-black font-headline leading-none",
                                                    isFirst ? "text-white" : "text-primary"
                                                )}>
                                                    <AnimatedScore value={person.score} />
                                                    <span className={cn(
                                                        "text-[10px] font-bold ml-1",
                                                        isFirst ? "text-white/40" : "text-slate-400"
                                                    )}>pts</span>
                                                </span>
                                            </div>
                                            {/* Animated Progress bar */}
                                            <div className={cn(
                                                "w-full h-1.5 rounded-full overflow-hidden",
                                                isFirst ? "bg-white/10" : "bg-slate-200"
                                            )}>
                                                <motion.div
                                                    className={cn(
                                                        "h-full rounded-full",
                                                        isFirst ? "bg-gradient-to-r from-amber-400 to-yellow-300" : "bg-gradient-to-r from-indigo-400 to-indigo-600"
                                                    )}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min((person.score / maxScore) * 100, 100)}%` }}
                                                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.6 }}
                                                />
                                            </div>
                                        </div>

                                        {/* Micro-stats */}
                                        <div className="grid grid-cols-3 gap-2 mt-4">
                                            {[
                                                { val: person.metrics.osCount, label: "O.S" },
                                                { val: person.metrics.discCount, label: "Erros" },
                                                { val: formatMinutes(person.metrics.delayData?.totalDelay || 0), label: "Atraso" },
                                            ].map((stat, si) => (
                                                <motion.div
                                                    key={stat.label}
                                                    className={cn(
                                                        "text-center rounded-lg py-2",
                                                        isFirst ? "bg-white/[0.04]" : "bg-slate-50"
                                                    )}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.8 + si * 0.1 }}
                                                >
                                                    <p className={cn(
                                                        "text-sm font-black font-headline",
                                                        isFirst ? "text-white" : "text-slate-800"
                                                    )}>{stat.val}</p>
                                                    <p className={cn(
                                                        "text-[9px] uppercase tracking-widest font-bold mt-0.5",
                                                        isFirst ? "text-white/40" : "text-slate-400"
                                                    )}>{stat.label}</p>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </motion.div>

                    {/* ═══ CORPO PRINCIPAL — LISTA + DETALHE ════════════════ */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* ─── LEADERBOARD (2/3) ──────────────────────────── */}
                        <motion.div
                            className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
                        >
                            {/* Table Header */}
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <motion.div
                                        initial={{ rotate: -90, opacity: 0 }}
                                        animate={{ rotate: 0, opacity: 1 }}
                                        transition={{ delay: 0.7, type: "spring" }}
                                    >
                                        <BarChart3 className="w-5 h-5 text-indigo-500" />
                                    </motion.div>
                                    <h3 className="text-base font-bold text-slate-800 font-headline">Classificação Completa</h3>
                                    <motion.span
                                        className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.9, type: "spring", stiffness: 500 }}
                                    >
                                        {ranking.length} auditores
                                    </motion.span>
                                </div>
                            </div>

                            {/* Column Header */}
                            <div className="grid grid-cols-12 px-6 py-2.5 border-b border-slate-100 text-[10px] uppercase tracking-widest font-bold text-slate-400">
                                <div className="col-span-1">#</div>
                                <div className="col-span-4">Auditor</div>
                                <div className="col-span-2 text-center">O.S</div>
                                <div className="col-span-2 text-center">Erros</div>
                                <div className="col-span-2 text-center">Pontos</div>
                                <div className="col-span-1"></div>
                            </div>

                            {/* Rows */}
                            <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
                                {ranking.map((person, idx) => {
                                    const isSelected = selectedAuditorId === person.id || (!selectedAuditorId && idx === 0);

                                    return (
                                        <motion.div
                                            key={person.id}
                                            custom={idx}
                                            variants={listRowVariants}
                                            initial="hidden"
                                            animate="visible"
                                            onClick={() => setSelectedAuditorId(person.id)}
                                            className={cn(
                                                "grid grid-cols-12 px-6 py-3.5 items-center cursor-pointer transition-all duration-200 border-b border-slate-50 group",
                                                isSelected
                                                    ? "bg-indigo-50/50 border-l-[3px] border-l-indigo-500"
                                                    : "hover:bg-slate-50/80 border-l-[3px] border-l-transparent"
                                            )}
                                            whileHover={{ x: 4, backgroundColor: "rgba(238, 242, 255, 0.5)" }}
                                            whileTap={{ scale: 0.995 }}
                                        >
                                            {/* Rank */}
                                            <div className="col-span-1">
                                                <motion.div
                                                    className={cn(
                                                        "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black",
                                                        person.rank === 1 ? "bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-sm shadow-amber-500/20" :
                                                            person.rank === 2 ? "bg-slate-300 text-white" :
                                                                person.rank === 3 ? "bg-amber-700/60 text-white" :
                                                                    "bg-slate-100 text-slate-500"
                                                    )}
                                                    whileHover={person.rank <= 3 ? { scale: 1.2, rotate: 5 } : {}}
                                                >
                                                    {person.rank}
                                                </motion.div>
                                            </div>

                                            {/* Avatar + Name */}
                                            <div className="col-span-4 flex items-center gap-3 min-w-0">
                                                <img
                                                    src={person.avatar}
                                                    alt={person.name}
                                                    className="w-9 h-9 rounded-xl object-cover shrink-0 bg-slate-100 shadow-sm"
                                                />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-slate-900 truncate uppercase">{person.name}</p>
                                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{person.level}</p>
                                                </div>
                                            </div>

                                            {/* O.S */}
                                            <div className="col-span-2 text-center">
                                                <span className="text-sm font-bold text-slate-700">{person.metrics.osCount}</span>
                                            </div>

                                            {/* Erros */}
                                            <div className="col-span-2 text-center">
                                                <span className="text-sm font-bold text-slate-700">{person.metrics.discCount}</span>
                                            </div>

                                            {/* Score */}
                                            <div className="col-span-2 text-center">
                                                <span className={cn(
                                                    "text-sm font-black font-headline",
                                                    person.rank <= 3 ? "text-primary" : "text-slate-800"
                                                )}>
                                                    {person.score}
                                                </span>
                                                <span className="text-[9px] font-bold text-slate-400 ml-0.5">pts</span>
                                            </div>

                                            {/* Arrow */}
                                            <div className="col-span-1 flex justify-end">
                                                <ChevronRight className={cn(
                                                    "w-4 h-4 transition-all duration-200",
                                                    isSelected ? "text-indigo-500 translate-x-0" : "text-slate-300 -translate-x-1 group-hover:translate-x-0 group-hover:text-slate-500"
                                                )} />
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </motion.div>

                        {/* ─── PAINEL DE DETALHE (1/3) ─────────────────────── */}
                        <AnimatePresence mode="wait">
                            {selectedAuditor && (
                                <motion.div
                                    key={selectedAuditor.id}
                                    className="lg:col-span-1 space-y-5"
                                    variants={detailPanelVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                >
                                    {/* Card do auditor */}
                                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
                                        <motion.div
                                            className="flex items-center gap-4 mb-5"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.15 }}
                                        >
                                            <motion.div
                                                className="w-14 h-14 rounded-2xl overflow-hidden shadow-md ring-1 ring-slate-200 shrink-0"
                                                initial={{ scale: 0.5 }}
                                                animate={{ scale: 1 }}
                                                transition={{ type: "spring", stiffness: 300 }}
                                            >
                                                <img src={selectedAuditor.avatar} alt={selectedAuditor.name} className="w-full h-full object-cover" />
                                            </motion.div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-black text-slate-900 uppercase truncate font-headline">{selectedAuditor.name}</p>
                                                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mt-0.5">{selectedAuditor.level} — #{selectedAuditor.rank}</p>
                                            </div>
                                        </motion.div>

                                        {/* Score grande com animação */}
                                        <motion.div
                                            className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-5 text-white mb-5 relative overflow-hidden"
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.2, type: "spring" }}
                                        >
                                            {/* Shimmer effect */}
                                            <motion.div
                                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent pointer-events-none"
                                                animate={{ x: ["-100%", "200%"] }}
                                                transition={{ repeat: Infinity, duration: 3, ease: "linear", repeatDelay: 2 }}
                                            />
                                            <p className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-1 relative z-10">Pontuação Final</p>
                                            <p className="text-4xl font-black font-headline leading-none relative z-10">
                                                <AnimatedScore value={selectedAuditor.score} />
                                                <span className="text-base font-bold text-white/30 ml-1">pts</span>
                                            </p>
                                            <div className="w-full h-1 rounded-full bg-white/10 mt-3 overflow-hidden relative z-10">
                                                <motion.div
                                                    className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-purple-400"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min((selectedAuditor.score / maxScore) * 100, 100)}%` }}
                                                    transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                                                />
                                            </div>
                                        </motion.div>

                                        {/* Breakdown com stagger */}
                                        <div className="space-y-2.5">
                                            <motion.p
                                                className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.25 }}
                                            >
                                                Composição da Pontuação
                                            </motion.p>

                                            {[
                                                { label: "Base Inicial", value: "1000", barColor: "bg-slate-300", bgColor: "bg-slate-50 border-slate-100", textColor: "text-slate-600", valueColor: "text-slate-500" },
                                                { label: "O.S Auditadas", value: `+${selectedAuditor.metrics.osPoints}`, barColor: "bg-indigo-400", bgColor: "bg-indigo-50/60 border-indigo-100/60", textColor: "text-indigo-700", valueColor: "text-indigo-600" },
                                                { label: "Erros Capturados", value: `+${selectedAuditor.metrics.discPoints}`, barColor: "bg-emerald-400", bgColor: "bg-emerald-50/60 border-emerald-100/60", textColor: "text-emerald-700", valueColor: "text-emerald-600" },
                                                { label: "Atrasos", value: `−${selectedAuditor.metrics.delayPenalties}`, barColor: "bg-amber-400", bgColor: "bg-amber-50/60 border-amber-100/60", textColor: "text-amber-700", valueColor: "text-amber-600" },
                                                { label: "Faltas", value: `−${selectedAuditor.metrics.faltaPenalties}`, barColor: "bg-rose-400", bgColor: "bg-rose-50/60 border-rose-100/60", textColor: "text-rose-700", valueColor: "text-rose-600" },
                                            ].map((item, i) => (
                                                <motion.div
                                                    key={item.label}
                                                    custom={i}
                                                    variants={breakdownRowVariants}
                                                    initial="hidden"
                                                    animate="visible"
                                                    className={cn("flex items-center justify-between py-2 px-3 rounded-lg border", item.bgColor)}
                                                    whileHover={{ x: 4, transition: { duration: 0.15 } }}
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <motion.div
                                                            className={cn("w-1.5 h-6 rounded-full", item.barColor)}
                                                            initial={{ scaleY: 0 }}
                                                            animate={{ scaleY: 1 }}
                                                            transition={{ delay: 0.4 + i * 0.08, duration: 0.3 }}
                                                        />
                                                        <span className={cn("text-xs font-bold", item.textColor)}>{item.label}</span>
                                                    </div>
                                                    <span className={cn("text-xs font-black font-headline", item.valueColor)}>{item.value}</span>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Card Regras */}
                                    <motion.div
                                        className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.6, duration: 0.4 }}
                                    >
                                        <div className="flex items-center gap-2 mb-4">
                                            <motion.div
                                                animate={{ rotate: [0, 10, -10, 0] }}
                                                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", repeatDelay: 3 }}
                                            >
                                                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                                            </motion.div>
                                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 font-headline">Regras de Pontuação</h4>
                                        </div>

                                        <div className="space-y-2">
                                            {[
                                                { label: "Base", value: "1000 pts", color: "bg-slate-400" },
                                                { label: "O.S", value: "+2 pts/un", color: "bg-indigo-400" },
                                                { label: "Erros", value: "+5 pts/un", color: "bg-emerald-400" },
                                                { label: "Atraso", value: "−2 pts/min", color: "bg-amber-400" },
                                                { label: "Falta", value: "−50 pts/dia", color: "bg-rose-400" },
                                            ].map((rule, ri) => (
                                                <motion.div
                                                    key={rule.label}
                                                    className="flex items-center justify-between py-1.5"
                                                    initial={{ opacity: 0, x: -8 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.7 + ri * 0.06 }}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn("w-2 h-2 rounded-full", rule.color)} />
                                                        <span className="text-xs font-semibold text-slate-600">{rule.label}</span>
                                                    </div>
                                                    <span className="text-[11px] font-bold text-slate-500 font-headline">{rule.value}</span>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </>
            )}
        </motion.div>
    );
}
