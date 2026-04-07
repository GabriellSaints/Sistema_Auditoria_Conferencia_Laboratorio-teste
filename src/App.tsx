import React, { useState } from "react";
import { Module } from "./types";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import ImportView from "./components/ImportView";
import MonitoringView from "./components/MonitoringView";
import DiscrepanciesView from "./components/DiscrepanciesView";
import AttendanceView from "./components/AttendanceView";
import RankingView from "./components/RankingView";
import AdminPanel from "./components/AdminPanel";
import LoginView from "./components/LoginView";
import { motion, AnimatePresence } from "motion/react";
import { DataProvider, useData } from "./context/DataContext";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("React ErrorBoundary Caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "20px",
            background: "#ffe6e6",
            color: "#8b0000",
            fontFamily: "monospace",
          }}
        >
          <h2>Algo quebrou a interface (Erro do React)</h2>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {this.state.error?.toString()}
          </pre>
          <pre style={{ marginTop: "10px", fontSize: "11px" }}>
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: "10px", background: "black", color: "white" }}
          >
            Recarregar Pagina
          </button>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

function AppContent() {
  const { currentUser } = useData();
  const defaultModule = currentUser?.role === 'viewer' ? 'monitoring' : 'import';
  const [activeModule, setActiveModule] = useState<Module>(defaultModule);

  React.useEffect(() => {
    const handleNav = (e: any) => {
      setActiveModule("admin");
    };
    window.addEventListener("navigateAdmin", handleNav);
    
    // Iniciar dark mode a partir do localStorage
    if (localStorage.getItem("theme") === "dark") {
      document.documentElement.classList.add("dark");
    }
    
    return () => window.removeEventListener("navigateAdmin", handleNav);
  }, []);

  if (!currentUser) {
      return <LoginView />;
  }

  const renderModule = () => {
    switch (activeModule) {
      case "import":
        return <ImportView onNavigate={setActiveModule} />;
      case "monitoring":
        return <MonitoringView />;
      case "discrepancies":
        return <DiscrepanciesView />;
      case "attendance":
        return <AttendanceView />;
      case "ranking":
        return <RankingView />;
      case "admin":
        return <AdminPanel />;
      default:
        return <MonitoringView />;
    }
  };

  const getModuleTitle = () => {
    switch (activeModule) {
      case "import":
        return "Importação de Dados";
      case "monitoring":
        return "Monitoramento da Equipe";
      case "discrepancies":
        return "Divergências Técnicas";
      case "attendance":
        return "Atrasos de Ponto";
      case "ranking":
        return "Ranking Geral";
      case "admin":
        return "Configurações Globais";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-surface flex">
      <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} />

      <main className="flex-1 ml-72 min-h-screen flex flex-col">
        <TopBar title={getModuleTitle()} />

        <div className="flex-1 mt-16 p-10 overflow-y-auto">
          <ErrorBoundary>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeModule}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {renderModule()}
              </motion.div>
            </AnimatePresence>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </ErrorBoundary>
  );
}
