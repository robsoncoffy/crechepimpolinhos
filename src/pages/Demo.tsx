import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DemoModeToggle, DemoRole } from "@/components/demo/DemoModeToggle";
import { DemoParentDashboard } from "@/components/demo/DemoParentDashboard";
import { DemoTeacherDashboard } from "@/components/demo/DemoTeacherDashboard";
import { DemoAdminDashboard } from "@/components/demo/DemoAdminDashboard";
import { DemoCookDashboard } from "@/components/demo/DemoCookDashboard";
import { DemoNutritionistDashboard } from "@/components/demo/DemoNutritionistDashboard";
import { DemoPedagogueDashboard } from "@/components/demo/DemoPedagogueDashboard";
import { DemoShoppingListProvider } from "@/components/demo/DemoShoppingListContext";

export default function Demo() {
  const [searchParams] = useSearchParams();
  const roleFromUrl = searchParams.get("role") as DemoRole | null;
  
  // Initialize with URL param or default to "parent"
  const [currentRole, setCurrentRole] = useState<DemoRole>(
    roleFromUrl && ["admin", "teacher", "parent", "cook", "nutritionist", "pedagogue"].includes(roleFromUrl)
      ? roleFromUrl
      : "admin"
  );

  // Sync state when URL changes
  useEffect(() => {
    if (roleFromUrl && ["admin", "teacher", "parent", "cook", "nutritionist", "pedagogue"].includes(roleFromUrl)) {
      setCurrentRole(roleFromUrl);
    } else if (!roleFromUrl) {
      setCurrentRole("admin");
    }
  }, [roleFromUrl]);

  return (
    <DemoShoppingListProvider>
      {currentRole === "parent" && <DemoParentDashboard />}
      {currentRole === "teacher" && <DemoTeacherDashboard />}
      {currentRole === "admin" && <DemoAdminDashboard />}
      {currentRole === "cook" && <DemoCookDashboard />}
      {currentRole === "nutritionist" && <DemoNutritionistDashboard />}
      {currentRole === "pedagogue" && <DemoPedagogueDashboard />}
      
      <DemoModeToggle 
        currentRole={currentRole} 
        onRoleChange={setCurrentRole} 
      />
    </DemoShoppingListProvider>
  );
}
