import React, { useMemo, useState } from "react";
import {
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  TrendingDown,
  Timer,
  AlertTriangle,
  FileX2,
  Plus,
  X,
  Edit2,
  Trash2,
  Filter,
  Coffee,
  LogIn,
  UserX,
  ShieldCheck,
  Flame,
  ChevronRight,
  XCircle
} from "lucide-react";
import { cn } from "../lib/utils";
import { useData } from "../context/DataContext";
import { AttendanceRecord } from "../types";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "motion/react";

/* ──────────────────────────────────────────────────────────────────────
   ATRASOS DE PONTO — REDESIGN COMPLETO COM ANIMAÇÕES
   Design: cards KPI com ícones expressivos, filtros em pill bar, 
   tabela com hover states, infratores em sidebar, modal premium.
   Motion: staggered cards, cascading rows, animated counters, 
   spring-based modal, shimmer effects.
   ────────────────────────────────────────────────────────────────────── */

// ─── Animated number counter ──────────────────────────────────────────
function AnimatedNumber({ value, className }: { value: number; className?: string }) {
    const [displayValue, setDisplayValue] = React.useState(0);
    React.useEffect(() => {
        const duration = 1000;
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
    visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
};

const cardVariant = {
    hidden: { opacity: 0, y: 24, scale: 0.96 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 280, damping: 24 } },
};

const rowVariant = {
    hidden: { opacity: 0, x: -16 },
    visible: (i: number) => ({
        opacity: 1, x: 0,
        transition: { delay: i * 0.04, type: "spring", stiffness: 300, damping: 28 },
    }),
};

const modalOverlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
};

const modalContentVariants = {
    hidden: { opacity: 0, scale: 0.92, y: 30 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 340, damping: 28, delay: 0.05 } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.15 } },
};

export default function AttendanceView() {
  const { attendanceData, setAttendanceData, auditors } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter State
  const [filterDate, setFilterDate] = useState("");
  const [filterCollab, setFilterCollab] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterObs, setFilterObs] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Form State
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    DATA_REGISTRO: "",
    COLABORADOR: "",
    STATUS: "ATRASO",
    MINUTOS_ATRASO: "",
    DIAS_ATESTADO: 1,
    ENTRADA: "",
    ENTRADA_ALMOÇO: "",
    SAIDA_ALMOÇO: "",
    SAIDA: "",
    OBERVAÇÃO: ""
  });

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const clearForm = () => {
    setFormData({
      DATA_REGISTRO: "",
      COLABORADOR: "",
      STATUS: "ATRASO",
      MINUTOS_ATRASO: "",
      DIAS_ATESTADO: 1,
      ENTRADA: "",
      ENTRADA_ALMOÇO: "",
      SAIDA_ALMOÇO: "",
      SAIDA: "",
      OBERVAÇÃO: ""
    });
    setEditingIndex(null);
  };

  const handleEdit = (item: any, originalIndex: number) => {
      let dataRegistroStr = String(item.DATA_REGISTRO);
      if (typeof item.DATA_REGISTRO === 'number') {
          const d = new Date((item.DATA_REGISTRO - 25569) * 86400 * 1000);
          dataRegistroStr = d.toISOString().split('T')[0];
      } else if (dataRegistroStr.length > 10) {
          dataRegistroStr = dataRegistroStr.substring(0, 10);
      }

      setFormData({
          DATA_REGISTRO: dataRegistroStr,
          COLABORADOR: item.COLABORADOR,
          STATUS: item.STATUS,
          MINUTOS_ATRASO: item.MINUTOS_ATRASO?.toString() || "",
          DIAS_ATESTADO: item.DIAS_ATESTADO || 1,
          ENTRADA: item.ENTRADA || "",
          ENTRADA_ALMOÇO: item.ENTRADA_ALMOÇO || "",
          SAIDA_ALMOÇO: item.SAIDA_ALMOÇO || "",
          SAIDA: item.SAIDA || "",
          OBERVAÇÃO: item.OBERVAÇÃO || ""
      });
      setEditingIndex(originalIndex);
      setIsModalOpen(true);
  };

  const handleDelete = async (originalIndex: number) => {
      if (window.confirm("Tem certeza que deseja apagar este registro de ponto?")) {
          const recordToDelete = attendanceData[originalIndex];
          if (recordToDelete._id) {
              const { error } = await supabase.from('attendance_records').delete().eq('_id', recordToDelete._id);
              if (error) {
                  alert("Erro ao excluir registro no Supabase.");
                  console.error(error);
                  return;
              }
          }
          const newData = [...attendanceData];
          newData.splice(originalIndex, 1);
          setAttendanceData(newData);
      }
  };

  const handleSave = async () => {
    if (!formData.DATA_REGISTRO || !formData.COLABORADOR || !formData.STATUS) {
        alert("Preencha ao menos Data, Colaborador e Status.");
        return;
    }

    if (formData.STATUS === "ATRASO" && !formData.MINUTOS_ATRASO && !formData.ENTRADA) {
        alert("Preencha os minutos de atraso ou os horários de entrada e saída.");
        return;
    }

    const payload = {
        data_registro: formData.DATA_REGISTRO,
        colaborador: formData.COLABORADOR,
        status: formData.STATUS,
        minutos_atraso: formData.STATUS === "ATRASO" && formData.MINUTOS_ATRASO ? Number(formData.MINUTOS_ATRASO) : null,
        dias_atestado: formData.STATUS === "ATESTADO" && formData.DIAS_ATESTADO ? Number(formData.DIAS_ATESTADO) : null,
        entrada: formData.ENTRADA || null,
        entrada_almoco: formData.ENTRADA_ALMOÇO || null,
        saida_almoco: formData.SAIDA_ALMOÇO || null,
        saida: formData.SAIDA || null,
        observacao: formData.OBERVAÇÃO || null
    };

    if (editingIndex !== null) {
        const recordToEdit = attendanceData[editingIndex];
        if (recordToEdit._id) {
            const { error } = await supabase.from('attendance_records').update(payload).eq('_id', recordToEdit._id);
            if (error) {
                alert("Erro ao atualizar registro no Supabase.");
                console.error(error);
                return;
            }
        }
        
        const newRecord: AttendanceRecord = {
            ...recordToEdit,
            DATA_REGISTRO: payload.data_registro,
            COLABORADOR: payload.colaborador,
            STATUS: payload.status,
            MINUTOS_ATRASO: payload.minutos_atraso !== null ? payload.minutos_atraso : undefined,
            DIAS_ATESTADO: payload.dias_atestado !== null ? payload.dias_atestado : undefined,
            ENTRADA: payload.entrada || undefined,
            ENTRADA_ALMOÇO: payload.entrada_almoco || undefined,
            SAIDA_ALMOÇO: payload.saida_almoco || undefined,
            SAIDA: payload.saida || undefined,
            OBERVAÇÃO: payload.observacao || undefined
        };
        
        const newData = [...attendanceData];
        newData[editingIndex] = newRecord;
        setAttendanceData(newData);
    } else {
        let generatedId = null;
        const { data, error } = await supabase.from('attendance_records').insert([payload]).select().single();
        if (error) {
            alert("Erro ao salvar registro no Supabase.");
            console.error(error);
            return;
        }
        if (data) {
            generatedId = data._id;
        }

        const newRecord: AttendanceRecord = {
            _id: generatedId,
            DATA_REGISTRO: payload.data_registro,
            COLABORADOR: payload.colaborador,
            STATUS: payload.status,
            MINUTOS_ATRASO: payload.minutos_atraso !== null ? payload.minutos_atraso : undefined,
            DIAS_ATESTADO: payload.dias_atestado !== null ? payload.dias_atestado : undefined,
            ENTRADA: payload.entrada || undefined,
            ENTRADA_ALMOÇO: payload.entrada_almoco || undefined,
            SAIDA_ALMOÇO: payload.saida_almoco || undefined,
            SAIDA: payload.saida || undefined,
            OBERVAÇÃO: payload.observacao || undefined
        };
        setAttendanceData([...attendanceData, newRecord]);
    }
    clearForm();
    setIsModalOpen(false);
  };

  const filteredAttendanceData = useMemo(() => {
    return attendanceData.filter(item => {
        if (filterDate) {
            let dataStr = String(item.DATA_REGISTRO);
            if (typeof item.DATA_REGISTRO === 'number') {
                const d = new Date((item.DATA_REGISTRO - 25569) * 86400 * 1000);
                dataStr = d.toISOString().split('T')[0];
            } else if (dataStr.length > 10) {
                dataStr = dataStr.substring(0, 10);
            }
            if (!dataStr.includes(filterDate)) return false;
        }
        if (filterCollab && (item.COLABORADOR || "").toUpperCase() !== filterCollab) return false;
        if (filterStatus && (item.STATUS || "").toUpperCase() !== filterStatus) return false;
        if (filterObs) {
            const obsStr = (item.OBERVAÇÃO || "S/ Info").toLowerCase();
            if (!obsStr.includes(filterObs.toLowerCase())) return false;
        }
        return true;
    });
  }, [attendanceData, filterDate, filterCollab, filterStatus, filterObs]);

  const stats = useMemo(() => {
    if (!filteredAttendanceData || filteredAttendanceData.length === 0) return null;

    let totalDelayMinutes = 0;
    let totalDelayEntrada = 0;
    let totalDelayAlmoco = 0;
    let totalDelayManual = 0;
    let totalFaltas = 0;
    let totalJustificados = 0;

    const collabStats = new Map<string, { name: string, totalDelay: number, faltas: number, records: any[] }>();
    const enhancedRecords: any[] = [];

    filteredAttendanceData.forEach((r) => {
        const originalIndex = attendanceData.indexOf(r);
        const collabName = (r.COLABORADOR || "Desconhecido").toUpperCase();
        if (!collabStats.has(collabName)) {
            collabStats.set(collabName, { name: collabName, totalDelay: 0, faltas: 0, records: [] });
        }
        const collabStat = collabStats.get(collabName)!;

        const status = (r.STATUS || "").toUpperCase();
        if (status === "FALTA") {
            collabStat.faltas += 1;
            totalFaltas += 1;
        }
        const isAtestadoOrDecl = status === "ATESTADO" || status === "DECLARAÇÃO";
        
        if (isAtestadoOrDecl) {
            totalJustificados += 1;
        }

        let recordDelay = 0;
        let tmpEntrada = 0;
        let tmpAlmoco = 0;
        const auditorConfig = auditors.find(a => a.name.toUpperCase() === collabName);
        
        if (status === "ATRASO" && r.MINUTOS_ATRASO) {
            recordDelay = r.MINUTOS_ATRASO;
            const obsStr = (r.OBERVAÇÃO || "").toLowerCase();
            if (obsStr.includes("entrada")) {
                tmpEntrada = recordDelay;
            } else if (obsStr.includes("almoço") || obsStr.includes("almoco") || obsStr.includes("pausa")) {
                tmpAlmoco = recordDelay;
            } else {
                totalDelayManual += recordDelay;
            }
        } else if (auditorConfig && !isAtestadoOrDecl && status !== "FALTA") {
            let escalaDia: any = auditorConfig.escala;

            let regDate: Date;
            if (typeof r.DATA_REGISTRO === 'number') {
                regDate = new Date((r.DATA_REGISTRO - 25569) * 86400 * 1000);
            } else {
                const parts = String(r.DATA_REGISTRO).split("-");
                if (parts.length === 3) {
                    regDate = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
                } else {
                    regDate = new Date(r.DATA_REGISTRO);
                }
            }
            const regDay = regDate.getDay();

            if (auditorConfig.tipoEscala === "ALTERNADA" && auditorConfig.escalaAlternada) {
                const alt = auditorConfig.escalaAlternada;
                const refParts = alt.dataReferenciaSabadoTrabalhado.split("-");
                const refDate = new Date(parseInt(refParts[0]), parseInt(refParts[1])-1, parseInt(refParts[2]));
                
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
                    const parts = timeStr.split(":");
                    if (parts.length < 2) return null;
                    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
                };

                const escEntrada = parseTime(escalaDia.entrada);
                const recEntrada = parseTime(r.ENTRADA);
                if (recEntrada && escEntrada && recEntrada > escEntrada) {
                    tmpEntrada = (recEntrada - escEntrada);
                    recordDelay += tmpEntrada;
                }

                const escVoltaAlmoco = parseTime(escalaDia.saidaAlmoco);
                const recVoltaAlmoco = parseTime(r.SAIDA_ALMOÇO);
                if (recVoltaAlmoco && escVoltaAlmoco && recVoltaAlmoco > escVoltaAlmoco) {
                    tmpAlmoco = (recVoltaAlmoco - escVoltaAlmoco);
                    recordDelay += tmpAlmoco;
                }
            }
        }

        totalDelayEntrada += tmpEntrada;
        totalDelayAlmoco += tmpAlmoco;
        collabStat.totalDelay += recordDelay;
        totalDelayMinutes += recordDelay;

        collabStat.records.push({
            date: r.DATA_REGISTRO,
            status: status,
            delay: recordDelay,
            obs: r.OBERVAÇÃO || "S/ Info"
        });
        
        enhancedRecords.push({ ...r, originalIndex, computedDelay: recordDelay });
    });

    const rankingDecrescente = Array.from(collabStats.values())
        .sort((a, b) => {
            if (b.totalDelay !== a.totalDelay) return b.totalDelay - a.totalDelay;
            return b.faltas - a.faltas;
        });

    return { 
        totalDelayMinutes, 
        totalDelayEntrada,
        totalDelayAlmoco,
        totalDelayManual,
        totalFaltas, 
        totalJustificados, 
        ranking: rankingDecrescente, 
        tableData: enhancedRecords.reverse().slice(0, 100) 
    };
  }, [filteredAttendanceData, attendanceData, auditors]);

  const formatMinutes = (m: number) => {
      if (m < 60) return `${m}m`;
      const h = Math.floor(m / 60);
      const min = m % 60;
      return `${h}h ${min}m`;
  };

  const hasActiveFilters = filterDate || filterCollab || filterStatus || filterObs;

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════
  return (
    <motion.div
        className="space-y-7"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
    >
      {/* ═══ HEADER ═══════════════════════════════════════════════════ */}
      <motion.div
          className="flex flex-col xl:flex-row xl:items-end justify-between gap-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-3">
                <motion.div
                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-lg shadow-rose-500/25"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.2 }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                >
                    <Clock className="w-5 h-5 text-white" />
                </motion.div>
                <motion.h2
                    className="text-3xl font-extrabold text-slate-900 font-headline tracking-tight"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                >
                    Atrasos de Ponto
                </motion.h2>
            </div>
            <motion.p
                className="text-slate-500 text-sm leading-relaxed ml-[52px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45, duration: 0.4 }}
            >
                Controle de pontualidade, faltas e justificativas da equipe.
            </motion.p>
        </div>

        <div className="flex items-center gap-3">
            {/* Filter toggle */}
            <motion.button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all duration-300 border",
                    showFilters || hasActiveFilters
                        ? "bg-indigo-50 text-indigo-600 border-indigo-200 shadow-sm"
                        : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:shadow-sm"
                )}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
            >
                <Filter className="w-4 h-4" />
                Filtros
                {hasActiveFilters && (
                    <motion.span
                        className="w-2 h-2 rounded-full bg-indigo-500"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        layoutId="filter-dot"
                    />
                )}
            </motion.button>

            {/* New record button */}
            <motion.button
                onClick={() => { clearForm(); setIsModalOpen(true); }}
                className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-orange-500 text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-rose-500/20 hover:shadow-xl hover:shadow-rose-500/30 transition-all uppercase tracking-widest text-sm"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
            >
                <Plus className="w-5 h-5" /> Novo Registro
            </motion.button>
        </div>
      </motion.div>

      {/* ═══ FILTROS EXPANSÍVEIS ═══════════════════════════════════════ */}
      <AnimatePresence>
          {showFilters && (
              <motion.div
                  className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm"
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                  <div className="flex flex-wrap gap-4 items-end">
                      <div className="flex-1 min-w-[150px]">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Data</label>
                          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 font-bold text-slate-700 transition-all" />
                      </div>
                      <div className="flex-1 min-w-[200px]">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Colaborador</label>
                          <select value={filterCollab} onChange={e => setFilterCollab(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 font-bold text-slate-700 uppercase transition-all">
                              <option value="">Todos</option>
                              {auditors.map(a => <option key={a.id} value={a.name.toUpperCase()}>{a.name}</option>)}
                          </select>
                      </div>
                      <div className="flex-1 min-w-[150px]">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Status</label>
                          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 font-bold text-slate-700 uppercase transition-all">
                              <option value="">Todos</option>
                              <option value="ATRASO">Atraso</option>
                              <option value="FALTA">Falta</option>
                              <option value="ATESTADO">Atestado</option>
                              <option value="DECLARAÇÃO">Declaração</option>
                          </select>
                      </div>
                      <div className="flex-[2] min-w-[200px]">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Observação</label>
                          <input type="text" placeholder="Buscar obs..." value={filterObs} onChange={e => setFilterObs(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 font-bold text-slate-700 transition-all" />
                      </div>
                      {hasActiveFilters && (
                          <motion.button
                              onClick={() => { setFilterDate(''); setFilterCollab(''); setFilterStatus(''); setFilterObs(''); }}
                              className="px-4 py-2.5 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-500 rounded-lg text-xs font-bold transition-all uppercase tracking-widest flex items-center gap-1.5"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                          >
                              <XCircle className="w-3.5 h-3.5"/> Limpar
                          </motion.button>
                      )}
                  </div>
              </motion.div>
          )}
      </AnimatePresence>

      {/* ═══ ESTADO VAZIO ═══════════════════════════════════════════ */}
      {!stats ? (
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
              <h3 className="text-xl font-bold text-slate-700 font-headline mb-1.5">Base de Ponto Vazia</h3>
              <p className="text-slate-500 text-sm">Nenhum registro de ponto encontrado. Adicione um novo registro ou ajuste os filtros.</p>
            </div>
          </motion.div>
      ) : (
          <>
            {/* ═══ KPI CARDS ═══════════════════════════════════════════ */}
            <motion.div
                className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
            >
                {/* Card 1: Total Atrasos */}
                <motion.div
                    variants={cardVariant}
                    className="bg-white rounded-2xl border border-slate-200/60 p-5 relative overflow-hidden group hover:shadow-lg hover:border-slate-300/60 transition-all duration-300 cursor-default"
                    whileHover={{ y: -4 }}
                >
                    <motion.div
                        className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-rose-500/[0.06] group-hover:bg-rose-500/10 transition-colors duration-300"
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    />
                    <div className="relative z-10">
                        <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center mb-3 group-hover:bg-rose-500 group-hover:text-white transition-colors duration-300">
                            <TrendingDown className="w-4.5 h-4.5" />
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Atrasos</p>
                        <p className="text-2xl font-black text-slate-900 font-headline leading-none">
                            <AnimatedNumber value={stats.totalDelayMinutes} />
                            <span className="text-xs font-bold text-slate-400 ml-1">min</span>
                        </p>
                    </div>
                </motion.div>

                {/* Card 2: Atraso Entrada */}
                <motion.div
                    variants={cardVariant}
                    className="bg-white rounded-2xl border border-slate-200/60 p-5 relative overflow-hidden group hover:shadow-lg hover:border-slate-300/60 transition-all duration-300 cursor-default"
                    whileHover={{ y: -4 }}
                >
                    <div className="relative z-10">
                        <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center mb-3 group-hover:bg-orange-500 group-hover:text-white transition-colors duration-300">
                            <LogIn className="w-4.5 h-4.5" />
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Na Entrada</p>
                        <p className="text-2xl font-black text-slate-900 font-headline leading-none">
                            <AnimatedNumber value={stats.totalDelayEntrada} />
                            <span className="text-xs font-bold text-slate-400 ml-1">min</span>
                        </p>
                    </div>
                </motion.div>

                {/* Card 3: Atraso Almoço */}
                <motion.div
                    variants={cardVariant}
                    className="bg-white rounded-2xl border border-slate-200/60 p-5 relative overflow-hidden group hover:shadow-lg hover:border-slate-300/60 transition-all duration-300 cursor-default"
                    whileHover={{ y: -4 }}
                >
                    <div className="relative z-10">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center mb-3 group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
                            <Coffee className="w-4.5 h-4.5" />
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">No Almoço</p>
                        <p className="text-2xl font-black text-slate-900 font-headline leading-none">
                            <AnimatedNumber value={stats.totalDelayAlmoco} />
                            <span className="text-xs font-bold text-slate-400 ml-1">min</span>
                        </p>
                        {stats.totalDelayManual > 0 && (
                            <p className="text-[10px] font-bold text-slate-400 mt-1">+{formatMinutes(stats.totalDelayManual)} manual</p>
                        )}
                    </div>
                </motion.div>

                {/* Card 4: Faltas */}
                <motion.div
                    variants={cardVariant}
                    className="bg-white rounded-2xl border border-slate-200/60 p-5 relative overflow-hidden group hover:shadow-lg hover:border-slate-300/60 transition-all duration-300 cursor-default"
                    whileHover={{ y: -4 }}
                >
                    <div className="relative z-10">
                        <div className="w-9 h-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center mb-3 group-hover:bg-red-500 group-hover:text-white transition-colors duration-300">
                            <UserX className="w-4.5 h-4.5" />
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Faltas</p>
                        <p className="text-2xl font-black text-slate-900 font-headline leading-none">
                            <AnimatedNumber value={stats.totalFaltas} />
                        </p>
                    </div>
                </motion.div>

                {/* Card 5: Justificados */}
                <motion.div
                    variants={cardVariant}
                    className="bg-white rounded-2xl border border-slate-200/60 p-5 relative overflow-hidden group hover:shadow-lg hover:border-slate-300/60 transition-all duration-300 cursor-default"
                    whileHover={{ y: -4 }}
                >
                    <div className="relative z-10">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-3 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                            <ShieldCheck className="w-4.5 h-4.5" />
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Justificados</p>
                        <p className="text-2xl font-black text-slate-900 font-headline leading-none">
                            <AnimatedNumber value={stats.totalJustificados} />
                        </p>
                    </div>
                </motion.div>

                {/* Card 6: Maior Infrator */}
                <motion.div
                    variants={cardVariant}
                    className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 relative overflow-hidden group cursor-default text-white"
                    whileHover={{ y: -4 }}
                >
                    <motion.div
                        className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
                        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    />
                    <div className="relative z-10">
                        <div className="w-9 h-9 rounded-xl bg-white/10 text-rose-400 flex items-center justify-center mb-3 backdrop-blur-sm">
                            <Flame className="w-4.5 h-4.5" />
                        </div>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Top Infrator</p>
                        {stats.ranking[0] ? (
                            <>
                                <p className="text-sm font-black font-headline uppercase truncate leading-tight">{stats.ranking[0].name}</p>
                                <p className="text-[10px] font-bold text-rose-400 mt-1">{formatMinutes(stats.ranking[0].totalDelay)} · {stats.ranking[0].faltas} faltas</p>
                            </>
                        ) : (
                            <p className="text-sm font-bold text-white/60">Nenhum dado</p>
                        )}
                    </div>
                </motion.div>
            </motion.div>

            {/* ═══ CORPO PRINCIPAL — INFRATORES + TABELA ══════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* ─── SIDEBAR: TOP INFRATORES ───────────────────────── */}
                <motion.div
                    className="lg:col-span-4 xl:col-span-3"
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
                >
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden sticky top-24">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
                            <motion.div
                                initial={{ rotate: -90, opacity: 0 }}
                                animate={{ rotate: 0, opacity: 1 }}
                                transition={{ delay: 0.7, type: "spring" }}
                            >
                                <AlertCircle className="w-4.5 h-4.5 text-rose-500" />
                            </motion.div>
                            <h3 className="text-sm font-bold text-slate-800 font-headline">Top Infratores</h3>
                            <motion.span
                                className="text-[10px] bg-rose-50 text-rose-500 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ml-auto"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.9, type: "spring", stiffness: 500 }}
                            >
                                {stats.ranking.length}
                            </motion.span>
                        </div>

                        <div className="max-h-[480px] overflow-y-auto custom-scrollbar">
                            {stats.ranking.slice(0, 10).map((collab, i) => {
                                const isWorst = i === 0;
                                const maxDelay = stats.ranking[0]?.totalDelay || 1;
                                const barWidth = Math.min((collab.totalDelay / maxDelay) * 100, 100);

                                return (
                                    <motion.div
                                        key={i}
                                        custom={i}
                                        variants={rowVariant}
                                        initial="hidden"
                                        animate="visible"
                                        className={cn(
                                            "px-5 py-3.5 border-b border-slate-50 group hover:bg-slate-50/80 transition-all duration-200 cursor-default",
                                            isWorst ? "bg-rose-50/30" : ""
                                        )}
                                        whileHover={{ x: 4 }}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <motion.div
                                                className={cn(
                                                    "w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0",
                                                    isWorst
                                                        ? "bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-sm shadow-rose-500/20"
                                                        : i === 1 ? "bg-orange-100 text-orange-600"
                                                        : i === 2 ? "bg-amber-100 text-amber-600"
                                                        : "bg-slate-100 text-slate-500"
                                                )}
                                                whileHover={isWorst ? { scale: 1.15, rotate: 5 } : {}}
                                            >
                                                {i + 1}
                                            </motion.div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-bold uppercase text-slate-700 truncate">{collab.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400">
                                                    {formatMinutes(collab.totalDelay)} atraso · {collab.faltas} falta{collab.faltas !== 1 ? "s" : ""}
                                                </p>
                                            </div>
                                        </div>
                                        {/* Mini progress bar */}
                                        <div className="w-full h-1 rounded-full bg-slate-100 overflow-hidden">
                                            <motion.div
                                                className={cn(
                                                    "h-full rounded-full",
                                                    isWorst ? "bg-gradient-to-r from-rose-400 to-red-500" : "bg-slate-300"
                                                )}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${barWidth}%` }}
                                                transition={{ duration: 1, ease: "easeOut", delay: 0.6 + i * 0.05 }}
                                            />
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </motion.div>

                {/* ─── TABELA DE REGISTROS ────────────────────────────── */}
                <motion.div
                    className="lg:col-span-8 xl:col-span-9"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55, duration: 0.5, ease: "easeOut" }}
                >
                    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-2.5">
                                <Timer className="w-5 h-5 text-indigo-500" />
                                <h3 className="text-sm font-bold text-slate-800 font-headline">Registros de Ponto</h3>
                                <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    {stats.tableData.length} registros
                                </span>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="flex-1 overflow-x-auto text-sm">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/60">
                                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">Data</th>
                                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">Colaborador</th>
                                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">Status</th>
                                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">Detalhes</th>
                                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">Observação</th>
                                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {stats.tableData.map((item, i) => {
                                        const isFalta = item.STATUS?.toUpperCase() === 'FALTA';
                                        const isAtraso = item.STATUS?.toUpperCase() === 'ATRASO';
                                        const isJustified = item.STATUS?.toUpperCase() === 'ATESTADO' || item.STATUS?.toUpperCase() === 'DECLARAÇÃO';
                                        let dataStr = String(item.DATA_REGISTRO);
                                        if (typeof item.DATA_REGISTRO === 'number') {
                                            const d = new Date((item.DATA_REGISTRO - 25569) * 86400 * 1000);
                                            dataStr = d.toLocaleDateString('pt-BR');
                                        } else if (dataStr.length > 10) dataStr = dataStr.substring(0, 10);

                                        return (
                                            <motion.tr
                                                key={i}
                                                custom={i}
                                                variants={rowVariant}
                                                initial="hidden"
                                                animate="visible"
                                                className="group hover:bg-slate-50/60 transition-colors duration-150"
                                            >
                                                <td className="px-5 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">{dataStr}</td>
                                                <td className="px-5 py-3 text-xs font-bold uppercase text-slate-700 whitespace-nowrap">{item.COLABORADOR}</td>
                                                <td className="px-5 py-3 whitespace-nowrap">
                                                    <span className={cn(
                                                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight",
                                                        isFalta ? "bg-rose-50 text-rose-600 border border-rose-100" :
                                                        isAtraso ? "bg-amber-50 text-amber-700 border border-amber-100" :
                                                        isJustified ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                                                        "bg-slate-50 text-slate-600 border border-slate-100"
                                                    )}>
                                                        {isFalta ? <UserX className="w-3 h-3" /> :
                                                         isAtraso ? <AlertTriangle className="w-3 h-3" /> :
                                                         <CheckCircle2 className="w-3 h-3" />}
                                                        {item.STATUS}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-xs font-bold text-slate-600 whitespace-nowrap">
                                                    {isAtraso ? formatMinutes(item.computedDelay || 0) : 
                                                     item.STATUS?.toUpperCase() === 'ATESTADO' && item.DIAS_ATESTADO ? `${item.DIAS_ATESTADO} dia(s)` :
                                                     (item.ENTRADA || item.SAIDA) ? `${item.ENTRADA || "--"} às ${item.SAIDA || "--"}` : "—"}
                                                </td>
                                                <td className="px-5 py-3 text-[11px] font-semibold text-slate-400 italic max-w-[180px] truncate">
                                                    {item.OBERVAÇÃO || "S/ Info"}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                        <motion.button 
                                                            onClick={() => handleEdit(item, item.originalIndex)}
                                                            className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:bg-indigo-500 hover:text-white flex items-center justify-center transition-colors"
                                                            title="Editar"
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </motion.button>
                                                        <motion.button 
                                                            onClick={() => handleDelete(item.originalIndex)}
                                                            className="w-7 h-7 rounded-lg bg-rose-50 text-rose-400 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-colors"
                                                            title="Excluir"
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </motion.button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </motion.div>
            </div>
          </>
      )}

      {/* ═══ MODAL / FORMULÁRIO ═══════════════════════════════════════ */}
      <AnimatePresence>
          {isModalOpen && (
              <motion.div
                  className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                  variants={modalOverlayVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
              >
                  {/* Backdrop */}
                  <motion.div
                      className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                      onClick={() => setIsModalOpen(false)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                  />

                  {/* Modal Content */}
                  <motion.div
                      className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col relative z-10 border border-slate-200/60"
                      variants={modalContentVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                  >
                      {/* Header */}
                      <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                          <div className="flex items-center gap-3">
                              <motion.div
                                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-md shadow-rose-500/20"
                                  initial={{ scale: 0, rotate: -90 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                              >
                                  <Calendar className="w-5 h-5 text-white" />
                              </motion.div>
                              <div>
                                  <h3 className="text-lg font-black font-headline text-slate-800">
                                      {editingIndex !== null ? "Editar Registro" : "Novo Registro"}
                                  </h3>
                                  <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Registro de ponto manual</p>
                              </div>
                          </div>
                          <motion.button 
                              onClick={() => setIsModalOpen(false)} 
                              className="w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-xl transition-colors"
                              whileHover={{ scale: 1.1, rotate: 90 }}
                              whileTap={{ scale: 0.9 }}
                          >
                              <X className="w-5 h-5" />
                          </motion.button>
                      </div>
                      
                      {/* Body */}
                      <div className="p-6 overflow-y-auto flex-1 space-y-5">
                          <div className="grid grid-cols-2 gap-5">
                              <motion.div
                                  className="space-y-1.5"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.1 }}
                              >
                                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Data do Registro *</label>
                                  <input 
                                      type="date" 
                                      value={formData.DATA_REGISTRO} 
                                      onChange={(e) => handleInputChange("DATA_REGISTRO", e.target.value)}
                                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 shadow-sm transition-all font-semibold"
                                  />
                              </motion.div>
                              <motion.div
                                  className="space-y-1.5"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.15 }}
                              >
                                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Colaborador *</label>
                                  <select 
                                      value={formData.COLABORADOR}
                                      onChange={(e) => handleInputChange("COLABORADOR", e.target.value)}
                                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 shadow-sm uppercase font-semibold transition-all"
                                  >
                                      <option value="">Selecione...</option>
                                      {auditors.map(a => (
                                          <option key={a.id} value={a.name.toUpperCase()}>{a.name}</option>
                                      ))}
                                  </select>
                              </motion.div>
                          </div>

                          <motion.div
                              className="space-y-1.5"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 }}
                          >
                              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Status *</label>
                              <div className="grid grid-cols-4 gap-2">
                                  {[
                                      { value: "ATRASO", label: "Atraso", icon: <AlertTriangle className="w-3.5 h-3.5" />, color: "amber" },
                                      { value: "FALTA", label: "Falta", icon: <UserX className="w-3.5 h-3.5" />, color: "rose" },
                                      { value: "ATESTADO", label: "Atestado", icon: <ShieldCheck className="w-3.5 h-3.5" />, color: "emerald" },
                                      { value: "DECLARAÇÃO", label: "Declaração", icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "indigo" },
                                  ].map((opt) => (
                                      <motion.button
                                          key={opt.value}
                                          type="button"
                                          onClick={() => handleInputChange("STATUS", opt.value)}
                                          className={cn(
                                              "flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-[10px] font-bold uppercase tracking-wider transition-all duration-200",
                                              formData.STATUS === opt.value
                                                  ? opt.color === "amber" ? "border-amber-400 bg-amber-50 text-amber-700"
                                                  : opt.color === "rose" ? "border-rose-400 bg-rose-50 text-rose-700"
                                                  : opt.color === "emerald" ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                                                  : "border-indigo-400 bg-indigo-50 text-indigo-700"
                                                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                                          )}
                                          whileHover={{ y: -2 }}
                                          whileTap={{ scale: 0.95 }}
                                      >
                                          {opt.icon}
                                          {opt.label}
                                      </motion.button>
                                  ))}
                              </div>
                          </motion.div>

                          <AnimatePresence mode="wait">
                              {formData.STATUS === "ATRASO" && (
                                  <motion.div
                                      key="atraso-fields"
                                      className="space-y-4"
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      exit={{ opacity: 0, height: 0 }}
                                      transition={{ duration: 0.25 }}
                                  >
                                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                          {[
                                              { label: "Entrada", field: "ENTRADA", value: formData.ENTRADA },
                                              { label: "Almoço (Ida)", field: "ENTRADA_ALMOÇO", value: formData.ENTRADA_ALMOÇO },
                                              { label: "Almoço (Volta)", field: "SAIDA_ALMOÇO", value: formData.SAIDA_ALMOÇO },
                                              { label: "Saída", field: "SAIDA", value: formData.SAIDA },
                                          ].map((tf) => (
                                              <div key={tf.field} className="space-y-1.5">
                                                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{tf.label}</label>
                                                  <input 
                                                      type="time" 
                                                      value={tf.value} 
                                                      onChange={(e) => handleInputChange(tf.field, e.target.value)}
                                                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 shadow-sm transition-all"
                                                  />
                                              </div>
                                          ))}
                                      </div>

                                      <div className="flex items-center gap-4">
                                          <div className="h-[1px] flex-1 bg-slate-200" />
                                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">ou minutos manuais</span>
                                          <div className="h-[1px] flex-1 bg-slate-200" />
                                      </div>

                                      <div className="space-y-1.5">
                                          <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Minutos de Atraso</label>
                                          <input 
                                              type="number" 
                                              min="1"
                                              value={formData.MINUTOS_ATRASO} 
                                              onChange={(e) => handleInputChange("MINUTOS_ATRASO", e.target.value)}
                                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 shadow-sm transition-all font-semibold"
                                              placeholder="Ex: 15"
                                          />
                                      </div>
                                  </motion.div>
                              )}

                              {formData.STATUS === "ATESTADO" && (
                                  <motion.div
                                      key="atestado-fields"
                                      className="space-y-1.5"
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      exit={{ opacity: 0, height: 0 }}
                                      transition={{ duration: 0.25 }}
                                  >
                                      <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Dias de Atestado *</label>
                                      <input 
                                          type="number" 
                                          min="1"
                                          value={formData.DIAS_ATESTADO} 
                                          onChange={(e) => handleInputChange("DIAS_ATESTADO", e.target.value)}
                                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 shadow-sm transition-all font-semibold"
                                      />
                                  </motion.div>
                              )}
                          </AnimatePresence>

                          <motion.div
                              className="space-y-1.5"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 }}
                          >
                              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Observação / Período</label>
                              <select
                                  value={formData.OBERVAÇÃO}
                                  onChange={(e) => handleInputChange("OBERVAÇÃO", e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 shadow-sm font-semibold text-slate-700 transition-all"
                              >
                                  <option value="">Selecione a justificativa ou período...</option>
                                  <optgroup label="Período de Atraso (Manuais)">
                                      <option value="Atraso na Entrada">Atraso na Entrada</option>
                                      <option value="Atraso na Volta do Almoço">Atraso na Volta do Almoço</option>
                                  </optgroup>
                                  <optgroup label="Faltas / Ocorrências">
                                      <option value="Sem Justificativa">Sem Justificativa</option>
                                      <option value="Doente / Problemas de Saúde">Doente / Problemas de Saúde</option>
                                      <option value="Problemas de Transporte">Problemas de Transporte</option>
                                      <option value="Outros">Outros</option>
                                  </optgroup>
                              </select>
                          </motion.div>
                      </div>
                      
                      {/* Footer */}
                      <div className="p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0 rounded-b-2xl">
                          <button 
                              onClick={clearForm}
                              className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors uppercase tracking-widest"
                          >
                              Limpar
                          </button>
                          <div className="flex items-center gap-3">
                              <motion.button 
                                  onClick={() => setIsModalOpen(false)}
                                  className="px-5 py-2.5 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors uppercase tracking-widest"
                                  whileHover={{ y: -1 }}
                                  whileTap={{ scale: 0.97 }}
                              >
                                  Cancelar
                              </motion.button>
                              <motion.button 
                                  onClick={handleSave}
                                  className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-orange-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-500/20 hover:shadow-lg hover:shadow-rose-500/30 transition-all uppercase tracking-widest"
                                  whileHover={{ y: -1, scale: 1.02 }}
                                  whileTap={{ scale: 0.97 }}
                              >
                                  Salvar Registro
                              </motion.button>
                          </div>
                      </div>
                  </motion.div>
              </motion.div>
          )}
      </AnimatePresence>
    </motion.div>
  );
}
