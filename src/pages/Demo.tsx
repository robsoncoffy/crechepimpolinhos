import { useState } from "react";
import { DemoModeToggle, DemoRole } from "@/components/demo/DemoModeToggle";
import { DemoParentDashboard } from "@/components/demo/DemoParentDashboard";
import { DemoTeacherDashboard } from "@/components/demo/DemoTeacherDashboard";
import { DemoAdminDashboard } from "@/components/demo/DemoAdminDashboard";

export default function Demo() {
  const [currentRole, setCurrentRole] = useState<DemoRole>("parent");

  return (
    <div className="relative">
      {currentRole === "parent" && <DemoParentDashboard />}
      {currentRole === "teacher" && <DemoTeacherDashboard />}
      {currentRole === "admin" && <DemoAdminDashboard />}
      
      <DemoModeToggle 
        currentRole={currentRole} 
        onRoleChange={setCurrentRole} 
      />
    </div>
  );
}
