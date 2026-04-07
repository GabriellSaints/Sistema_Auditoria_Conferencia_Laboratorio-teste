import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { AttendanceRecord, AuditorConfig, TechnicianConfig, UserConfig } from "../types";

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
  
  // Auth mock
  currentUser: UserConfig | null;
  setCurrentUser: (user: UserConfig | null) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Hook para persistir estados no LocalStorage
function usePersistedState<T>(key: string, defaultValue: T): [T, (val: T) => void] {
    const [state, setState] = useState<T>(() => {
        try {
            const item = localStorage.getItem(key);
            if (item) return JSON.parse(item);
        } catch (e) {
            console.error("Erro lendo localStorage", e);
        }
        return defaultValue;
    });

    const setPersistedState = (val: T) => {
        setState(val);
        try {
            localStorage.setItem(key, JSON.stringify(val));
        } catch (e) {
            console.error("Erro salvando localStorage", e);
        }
    };

    return [state, setPersistedState];
}

const DEFAULT_USERS: UserConfig[] = [
    { id: "1", name: "Administrador Master", email: "admin@empresa.com", password: "admin", role: "admin", active: true },
    { id: "2", name: "Gabriel Santos", email: "gabriel@empresa.com", password: "123", role: "admin", active: true },
    { id: "3", name: "Visualizador Padrão", email: "viewer@empresa.com", password: "123", role: "viewer", active: true }
];

export function DataProvider({ children }: { children: ReactNode }) {
  const [monitoringData, setMonitoringData] = useState<MonitoringRecord[]>([]);
  const [discrepanciesData, setDiscrepanciesData] = useState<MonitoringRecord[]>([]);
  const [attendanceData, setAttendanceData] = usePersistedState<AttendanceRecord[]>("sys_attendance", []);

  // Local storage synced states for Registries
  const [users, setUsers] = usePersistedState<UserConfig[]>("sys_users", DEFAULT_USERS);
  const [technicians, setTechnicians] = usePersistedState<TechnicianConfig[]>("sys_techs", []);
  const [auditors, setAuditors] = usePersistedState<AuditorConfig[]>("sys_auditors", []);
  const [currentUser, setCurrentUser] = usePersistedState<UserConfig | null>("sys_current_user", null);

  return (
    <DataContext.Provider value={{ 
      monitoringData, setMonitoringData,
      discrepanciesData, setDiscrepanciesData,
      attendanceData, setAttendanceData,
      users, setUsers,
      technicians, setTechnicians,
      auditors, setAuditors,
      currentUser, setCurrentUser
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
