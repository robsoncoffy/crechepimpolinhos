import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./useAuth";

type DashboardViewType = "admin" | "specialized";

interface DashboardViewContextType {
  currentView: DashboardViewType;
  toggleView: () => void;
  canToggle: boolean;
  specializedRole: string | null;
}

const DashboardViewContext = createContext<DashboardViewContextType | undefined>(undefined);

export function DashboardViewProvider({ children }: { children: ReactNode }) {
  const { isAdmin, isNutritionist, isPedagogue, isCook, isTeacher, roles } = useAuth();
  
  // Determine if user has admin + another specialized role
  const hasMultipleRoles = isAdmin && (isNutritionist || isPedagogue || isCook || isTeacher);
  
  // Determine the specialized role (priority: nutritionist > pedagogue > cook > teacher)
  const getSpecializedRole = (): string | null => {
    if (isNutritionist) return "nutritionist";
    if (isPedagogue) return "pedagogue";
    if (isCook) return "cook";
    if (isTeacher) return "teacher";
    return null;
  };
  
  const specializedRole = getSpecializedRole();
  
  // Get stored preference from localStorage
  const getStoredView = (): DashboardViewType => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("dashboard_view_preference");
      if (stored === "specialized" && hasMultipleRoles) {
        return "specialized";
      }
    }
    return "admin";
  };
  
  const [currentView, setCurrentView] = useState<DashboardViewType>(getStoredView);
  
  // Update view when roles change
  useEffect(() => {
    if (!hasMultipleRoles) {
      setCurrentView("admin");
    }
  }, [hasMultipleRoles]);
  
  const toggleView = () => {
    if (!hasMultipleRoles) return;
    
    const newView = currentView === "admin" ? "specialized" : "admin";
    setCurrentView(newView);
    localStorage.setItem("dashboard_view_preference", newView);
  };
  
  return (
    <DashboardViewContext.Provider value={{
      currentView,
      toggleView,
      canToggle: hasMultipleRoles,
      specializedRole,
    }}>
      {children}
    </DashboardViewContext.Provider>
  );
}

export function useDashboardView() {
  const context = useContext(DashboardViewContext);
  if (!context) {
    throw new Error("useDashboardView must be used within DashboardViewProvider");
  }
  return context;
}
