import { createContext, useContext, useState, ReactNode, useCallback } from "react";

export interface DemoAbsence {
  childId: string;
  childName: string;
  reason: string;
  notes: string;
  timestamp: Date;
}

interface DemoAbsenceContextType {
  absences: DemoAbsence[];
  addAbsence: (absence: DemoAbsence) => void;
  getAbsenceForChild: (childId: string) => DemoAbsence | undefined;
  hasAbsence: (childId: string) => boolean;
}

const DemoAbsenceContext = createContext<DemoAbsenceContextType | null>(null);

export function DemoAbsenceProvider({ children }: { children: ReactNode }) {
  const [absences, setAbsences] = useState<DemoAbsence[]>([]);

  const addAbsence = useCallback((absence: DemoAbsence) => {
    setAbsences((prev) => {
      // Replace existing absence for same child
      const filtered = prev.filter((a) => a.childId !== absence.childId);
      return [...filtered, absence];
    });
  }, []);

  const getAbsenceForChild = useCallback(
    (childId: string) => absences.find((a) => a.childId === childId),
    [absences]
  );

  const hasAbsence = useCallback(
    (childId: string) => absences.some((a) => a.childId === childId),
    [absences]
  );

  return (
    <DemoAbsenceContext.Provider value={{ absences, addAbsence, getAbsenceForChild, hasAbsence }}>
      {children}
    </DemoAbsenceContext.Provider>
  );
}

export function useDemoAbsence() {
  const context = useContext(DemoAbsenceContext);
  if (!context) {
    throw new Error("useDemoAbsence must be used within DemoAbsenceProvider");
  }
  return context;
}
