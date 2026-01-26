import { AdminLayout } from "@/components/admin/AdminLayout";
import { GhlEmailsTab } from "@/components/admin/GhlEmailsTab";

export default function AdminGhlEmails() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Central de E-mails</h1>
          <p className="text-muted-foreground">
            Gerencie e-mails recebidos de leads e contatos via GoHighLevel
          </p>
        </div>
        
        <GhlEmailsTab />
      </div>
    </AdminLayout>
  );
}
