import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { useAuth } from "./useAuth";

type DashboardViewType = "admin" | "nutritionist" | "pedagogue" | "cook" | "teacher" | "auxiliar" | "contador" | "parent";

interface DashboardViewContextType {
  currentView: DashboardViewType;
  setView: (view: DashboardViewType) => void;
  availableViews: DashboardViewType[];
}

const DashboardViewContext = createContext<DashboardViewContextType | undefined>(undefined);

export function DashboardViewProvider({ children }: { children: ReactNode }) {
  const { isAdmin, isNutritionist, isPedagogue, isCook, isTeacher, isAuxiliar, isContador, isParent, loading } = useAuth();
  
  // Build list of available views based on roles - memoized to prevent unnecessary recalculations
  const availableViews = useMemo((): DashboardViewType[] => {
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
  }, [isAdmin, isTeacher, isNutritionist, isPedagogue, isCook, isAuxiliar, isContador, isParent]);
  
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
  
  const [currentView, setCurrentView] = useState<DashboardViewType>("admin");
  
  // Initialize view once auth is loaded
  useEffect(() => {
    if (!loading && availableViews.length > 0) {
      const stored = localStorage.getItem("dashboard_view_preference") as DashboardViewType;
      if (stored && availableViews.includes(stored)) {
        setCurrentView(stored);
      } else {
        setCurrentView(availableViews[0]);
      }
    }
  }, [loading, availableViews]);
  
  // Update view when roles change and current view becomes invalid
  useEffect(() => {
    if (!loading && !availableViews.includes(currentView) && availableViews.length > 0) {
      setCurrentView(availableViews[0]);
    }
  }, [availableViews, currentView, loading]);
  
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
