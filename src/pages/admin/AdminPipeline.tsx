import { AdminLayout } from "@/components/admin/AdminLayout";
import { GhlPipelineTab } from "@/components/admin/GhlPipelineTab";

export default function AdminPipeline() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pipeline de Vendas</h1>
          <p className="text-muted-foreground">
            Gerencie oportunidades e acompanhe o funil de vendas
          </p>
        </div>
        
        <GhlPipelineTab />
      </div>
    </AdminLayout>
  );
}
