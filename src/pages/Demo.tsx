import { useState } from "react";
import { DemoModeToggle, DemoRole } from "@/components/demo/DemoModeToggle";
import { DemoParentDashboard } from "@/components/demo/DemoParentDashboard";
import { DemoTeacherDashboard } from "@/components/demo/DemoTeacherDashboard";
import { DemoAdminDashboard } from "@/components/demo/DemoAdminDashboard";
import { DemoCookDashboard } from "@/components/demo/DemoCookDashboard";
import { DemoNutritionistDashboard } from "@/components/demo/DemoNutritionistDashboard";
import { DemoPedagogueDashboard } from "@/components/demo/DemoPedagogueDashboard";

export default function Demo() {
  const [currentRole, setCurrentRole] = useState<DemoRole>("parent");

  return (
    <>
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
    </>
  );
}
