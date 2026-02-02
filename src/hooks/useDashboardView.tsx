import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./useAuth";

type DashboardViewType = "admin" | "nutritionist" | "pedagogue" | "cook" | "teacher" | "auxiliar" | "contador" | "parent";

interface DashboardViewContextType {
  currentView: DashboardViewType;
  setView: (view: DashboardViewType) => void;
  availableViews: DashboardViewType[];
}

const DashboardViewContext = createContext<DashboardViewContextType | undefined>(undefined);

export function DashboardViewProvider({ children }: { children: ReactNode }) {
  const { isAdmin, isNutritionist, isPedagogue, isCook, isTeacher, isAuxiliar, isContador, isParent } = useAuth();
  
  // Build list of available views based on roles
  const getAvailableViews = (): DashboardViewType[] => {
    const views: DashboardViewType[] = [];
    if (isAdmin) views.push("admin");
    if (isTeacher) views.push("teacher");
    if (isNutritionist) views.push("nutritionist");
    if (isPedagogue) views.push("pedagogue");
    if (isCook) views.push("cook");
    if (isAuxiliar) views.push("auxiliar");
    if (isContador) views.push("contador");
    if (isParent) views.push("parent");
    return views;
  };
  
  const availableViews = getAvailableViews();
  
  // Get stored preference from localStorage
  const getStoredView = (): DashboardViewType => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("dashboard_view_preference") as DashboardViewType;
      if (stored && availableViews.includes(stored)) {
        return stored;
      }
    }
    return availableViews[0] || "admin";
  };
  
  const [currentView, setCurrentView] = useState<DashboardViewType>(getStoredView);
  
  // Update view when roles change
  useEffect(() => {
    if (!availableViews.includes(currentView) && availableViews.length > 0) {
      setCurrentView(availableViews[0]);
    }
  }, [availableViews, currentView]);
  
  const setView = (view: DashboardViewType) => {
    if (!availableViews.includes(view)) return;
    setCurrentView(view);
    localStorage.setItem("dashboard_view_preference", view);
  };
  
  return (
    <DashboardViewContext.Provider value={{
      currentView,
      setView,
      availableViews,
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
