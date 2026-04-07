import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { AttendanceRecord, AuditorConfig, TechnicianConfig, UserConfig } from "../types";
import { supabase } from "../lib/supabase";

export interface MonitoringRecord {
  "DATA/HORA_ABERTURA": string | number;
  STATUS_MENSAGEM_OS: string;
  ID_CLIENTE: string | number;
  CLIENTE: string;
  ASSUNTO_SERVIÇO_REALIZADO?: string;
  AUDITOR: string;
  TECNICO?: string;
  ASSUNTO_OS: string;
  DIAGNOSTICO_MENSAGEM_OS: string;
  MENSAGEM_OS?: string;
  PROXIMA_TAREFA?: string;
  "DATA/HORA_FECHAMENTO": string | number;
}

interface DataContextType {
  monitoringData: MonitoringRecord[];
  setMonitoringData: (data: MonitoringRecord[]) => void;
  discrepanciesData: MonitoringRecord[];
  setDiscrepanciesData: (data: MonitoringRecord[]) => void;
  attendanceData: AttendanceRecord[];
  setAttendanceData: (data: AttendanceRecord[]) => void;
  
  // Registries
  users: UserConfig[];
  setUsers: (users: UserConfig[]) => void;
  technicians: TechnicianConfig[];
  setTechnicians: (techs: TechnicianConfig[]) => void;
  auditors: AuditorConfig[];
  setAuditors: (auds: AuditorConfig[]) => void;
  
  // Auth state
  currentUser: UserConfig | null;
  setCurrentUser: (user: UserConfig | null) => void;
  authLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);



const DEFAULT_USERS: UserConfig[] = [
    { id: "1", name: "Administrador Master", email: "admin@empresa.com", password: "admin", role: "admin", active: true },
    { id: "2", name: "Gabriel Santos", email: "gabriel@empresa.com", password: "123", role: "admin", active: true },
    { id: "3", name: "Visualizador Padrão", email: "viewer@empresa.com", password: "123", role: "viewer", active: true }
];

export function DataProvider({ children }: { children: ReactNode }) {
  const [monitoringData, setMonitoringData] = useState<MonitoringRecord[]>([]);
  const [discrepanciesData, setDiscrepanciesData] = useState<MonitoringRecord[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);

  // Supabase fetched states
  const [users, setUsers] = useState<UserConfig[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianConfig[]>([]);
  const [auditors, setAuditors] = useState<AuditorConfig[]>([]);
  
  // Supabase Auth State
  const [currentUser, setCurrentUser] = useState<UserConfig | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const loadSupabaseData = async () => {
    const [{ data: usersData }, { data: techsData }, { data: audsData }] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('technicians').select('*'),
      supabase.from('auditors').select('*')
    ]);

    if (usersData) {
      setUsers(usersData.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        active: u.active,
        permissions: u.permissions || [],
        photoUrl: u.photo_url
      })));
    }

    if (techsData) {
      setTechnicians(techsData.map(t => ({
        id: t.id,
        name: t.name,
        status: t.status
      })));
    }

    if (audsData) {
      setAuditors(audsData.map(a => ({
        id: a.id,
        name: a.name,
        status: a.status,
        tipoEscala: a.tipo_escala,
        escala: a.escala,
        escalaSexta: a.escala_sexta,
        escalaAlternada: a.escala_alternada
      })));
    }
  };

  useEffect(() => {
    // Busca a sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser({
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email?.split("@")[0] || "Usuário",
          email: session.user.email || "",
          password: "",
          role: "admin",
          active: true,
          permissions: []
        });
        loadSupabaseData(); // Carrega o banco real quando loga
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });

    // Escuta mudanças (login, logout, etc)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser({
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email?.split("@")[0] || "Usuário",
          email: session.user.email || "",
          password: "",
          role: "admin",
          active: true,
          permissions: []
        });
        loadSupabaseData(); // Recarrega se a sessao mudar
      } else {
        setCurrentUser(null);
        // Clear data on logout
        setUsers([]);
        setTechnicians([]);
        setAuditors([]);
      }
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sync currentUser with local updates (like photoUrl, roles, etc)
  useEffect(() => {
    if (currentUser) {
      const localProfile = users.find(u => u.email === currentUser.email);
      if (localProfile) {
        if (JSON.stringify(currentUser) !== JSON.stringify(localProfile)) {
          setCurrentUser(localProfile);
        }
      }
    }
  }, [users, currentUser]);

  return (
    <DataContext.Provider value={{ 
      monitoringData, setMonitoringData,
      discrepanciesData, setDiscrepanciesData,
      attendanceData, setAttendanceData,
      users, setUsers,
      technicians, setTechnicians,
      auditors, setAuditors,
      currentUser, setCurrentUser,
      authLoading
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
