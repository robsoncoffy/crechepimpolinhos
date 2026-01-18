import { StaffChatWindow } from "@/components/staff/StaffChatWindow";

export default function AdminStaffChat() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-fredoka text-3xl lg:text-4xl font-bold text-foreground">
          Chat da Equipe
        </h1>
        <p className="text-muted-foreground mt-1">
          Comunicação interna entre funcionários
        </p>
      </div>
      
      <StaffChatWindow />
    </div>
  );
}
