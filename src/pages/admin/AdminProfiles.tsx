import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Users, 
  User, 
  Search, 
  Phone, 
  Mail, 
  Calendar, 
  Baby,
  Briefcase,
  MapPin,
  FileText,
  Loader2,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Database
} from "lucide-react";
import { roleLabels, roleBadgeColors, classTypeLabels } from "@/lib/constants";
import { Database as SupabaseDB } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { EmailDiagnosticModal } from "@/components/admin/EmailDiagnosticModal";
import { UserDeletionDialog } from "@/components/admin/UserDeletionDialog";

type AppRole = SupabaseDB["public"]["Enums"]["app_role"];

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  status: string;
}

interface UserRole {
  user_id: string;
  role: string;
}

interface ParentChild {
  child_id: string;
  children: {
    full_name: string;
    class_type: string;
    photo_url: string | null;
  };
}

interface EmployeeProfile {
  id: string;
  user_id: string;
  full_name: string;
  cpf: string;
  birth_date: string;
  phone: string | null;
  photo_url: string | null;
  job_title: string | null;
  hire_date: string | null;
  city: string | null;
  state: string | null;
  education_level: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
}

export default function AdminProfiles() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [employeeProfiles, setEmployeeProfiles] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeProfile | null>(null);
  const [selectedProfileEmail, setSelectedProfileEmail] = useState<string | null>(null);
  const [loadingSelectedEmail, setLoadingSelectedEmail] = useState(false);
  const [parentChildren, setParentChildren] = useState<ParentChild[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [togglingAdmin, setTogglingAdmin] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  const [liberateEmailDialogOpen, setLiberateEmailDialogOpen] = useState(false);
  const [emailToLiberate, setEmailToLiberate] = useState("");
  const [liberatingEmail, setLiberatingEmail] = useState(false);
  const [userToDeleteEmail, setUserToDeleteEmail] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const uid = selectedProfile?.user_id;

    if (!uid) {
      setSelectedProfileEmail(null);
      setLoadingSelectedEmail(false);
      return;
    }

    (async () => {
      setLoadingSelectedEmail(true);
      setSelectedProfileEmail(null);
      try {
        const { data, error } = await supabase.functions.invoke("delete-user", {
          body: { userId: uid, checkOnly: true },
        });
        if (cancelled) return;
        if (error) throw error;
        setSelectedProfileEmail(data?.email ?? null);
      } catch (err) {
        if (cancelled) return;
        console.error("Error fetching selected profile email:", err);
        setSelectedProfileEmail(null);
      } finally {
        if (!cancelled) setLoadingSelectedEmail(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedProfile?.user_id]);

  const fetchData = async () => {
    try {
      const [profilesRes, rolesRes, employeesRes] = await Promise.all([
        supabase.from("profiles").select("*").order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("employee_profiles").select("*").order("full_name")
      ]);

      if (profilesRes.data) setProfiles(profilesRes.data);
      if (rolesRes.data) setUserRoles(rolesRes.data);
      if (employeesRes.data) setEmployeeProfiles(employeesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRolesForUser = (userId: string) => {
    return userRoles.filter(r => r.user_id === userId).map(r => r.role);
  };

  const isUserAdmin = (userId: string) => {
    return getRolesForUser(userId).includes("admin");
  };

  const toggleAdminRole = async (userId: string, currentlyAdmin: boolean) => {
    setTogglingAdmin(true);
    try {
      if (currentlyAdmin) {
        // Remove admin role
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "admin");

        if (error) throw error;
        toast.success("Acesso de administrador removido");
      } else {
        // Add admin role
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "admin" });

        if (error) throw error;
        toast.success("Acesso de administrador concedido");
      }

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error("Error toggling admin role:", error);
      toast.error("Erro ao alterar permissão de administrador");
    } finally {
      setTogglingAdmin(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    // Prevent self-deletion
    if (userToDelete.user_id === user?.id) {
      toast.error("Você não pode deletar sua própria conta");
      return;
    }

    setDeletingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { userId: userToDelete.user_id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Usuário ${userToDelete.full_name} removido do sistema`);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      setSelectedProfile(null);
      await fetchData();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Erro ao deletar usuário: " + (error as Error).message);
    } finally {
      setDeletingUser(false);
    }
  };

  const handleLiberateEmail = async () => {
    if (!emailToLiberate.trim()) {
      toast.error("Digite um e-mail válido");
      return;
    }

    setLiberatingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { email: emailToLiberate.trim().toLowerCase() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(
        data?.authUserDeleted
          ? `E-mail ${emailToLiberate} liberado com sucesso!`
          : `Dados do e-mail ${emailToLiberate} removidos do banco.`
      );
      console.log("Liberate email result:", data);
      setLiberateEmailDialogOpen(false);
      setEmailToLiberate("");
      await fetchData();
    } catch (error) {
      console.error("Error liberating email:", error);
      toast.error("Erro ao liberar e-mail: " + (error as Error).message);
    } finally {
      setLiberatingEmail(false);
    }
  };

  const openDeleteDialog = async (profile: Profile) => {
    // Prevent opening delete dialog for self
    if (profile.user_id === user?.id) {
      toast.error("Você não pode deletar sua própria conta");
      return;
    }
    setUserToDelete(profile);
    const cachedEmail =
      profile.user_id === selectedProfile?.user_id ? selectedProfileEmail : null;
    setUserToDeleteEmail(cachedEmail);
    setDeleteDialogOpen(true);

    // Fetch email from profiles or edge function
    try {
      if (cachedEmail) return;
      const { data } = await supabase.functions.invoke("delete-user", {
        body: { userId: profile.user_id, checkOnly: true },
      });
      if (data?.email) {
        setUserToDeleteEmail(data.email);
      }
    } catch (error) {
      console.error("Error fetching user email:", error);
    }
  };

  const getParentProfiles = () => {
    return profiles.filter(p => getRolesForUser(p.user_id).includes("parent"));
  };

  const getStaffProfiles = () => {
    const staffRoles = ["admin", "teacher", "cook", "nutritionist", "pedagogue", "auxiliar"];
    return profiles.filter(p => {
      const roles = getRolesForUser(p.user_id);
      return roles.some(r => staffRoles.includes(r));
    });
  };

  const filteredParents = getParentProfiles().filter(p =>
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStaff = getStaffProfiles().filter(p =>
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewParent = async (profile: Profile) => {
    setSelectedProfile(profile);
    setSelectedEmployee(null);
    setLoadingDetails(true);

    try {
      const { data } = await supabase
        .from("parent_children")
        .select(`
          child_id,
          children:child_id (
            full_name,
            class_type,
            photo_url
          )
        `)
        .eq("parent_id", profile.user_id);

      if (data) {
        setParentChildren(data as any);
      }
    } catch (error) {
      console.error("Error fetching parent children:", error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewEmployee = (profile: Profile) => {
    setSelectedProfile(profile);
    const employeeData = employeeProfiles.find(e => e.user_id === profile.user_id);
    setSelectedEmployee(employeeData || null);
    setParentChildren([]);
    setLoadingDetails(false);
  };

  // Role helper functions now use centralized constants
  const getRoleLabel = (role: string) => {
    return roleLabels[role as AppRole] || role;
  };

  const getRoleBadgeColor = (role: string) => {
    return roleBadgeColors[role as AppRole] || "bg-gray-100 text-gray-800";
  };

  // classTypeLabels is now imported from @/lib/constants

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-fredoka font-bold">Perfis de Usuários</h1>
          <p className="text-muted-foreground">
            Visualize os perfis de pais/responsáveis e funcionários
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setLiberateEmailDialogOpen(true)}
          className="gap-2"
        >
          <Database className="w-4 h-4" />
          Diagnóstico de E-mail
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="parents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="parents" className="gap-2">
            <Users className="w-4 h-4" />
            Pais/Responsáveis ({filteredParents.length})
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-2">
            <Briefcase className="w-4 h-4" />
            Funcionários ({filteredStaff.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="parents">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredParents.map((profile) => {
              const roles = getRolesForUser(profile.user_id);
              return (
                <Card 
                  key={profile.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleViewParent(profile)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {profile.full_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate flex items-center gap-1.5">
                          {profile.full_name}
                          {isUserAdmin(profile.user_id) && (
                            <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" />
                          )}
                        </h3>
                        {profile.phone && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {profile.phone}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {roles.map((role) => (
                            <Badge 
                              key={role} 
                              variant="secondary"
                              className={`text-xs ${getRoleBadgeColor(role)}`}
                            >
                              {getRoleLabel(role)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filteredParents.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                Nenhum responsável encontrado
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="staff">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredStaff.map((profile) => {
              const roles = getRolesForUser(profile.user_id);
              const employeeData = employeeProfiles.find(e => e.user_id === profile.user_id);
              return (
                <Card 
                  key={profile.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleViewEmployee(profile)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={profile.avatar_url || employeeData?.photo_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {profile.full_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate flex items-center gap-1.5">
                          {profile.full_name}
                          {isUserAdmin(profile.user_id) && (
                            <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" />
                          )}
                        </h3>
                        {employeeData?.job_title && (
                          <p className="text-sm text-muted-foreground">{employeeData.job_title}</p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {roles.filter(r => r !== "parent").map((role) => (
                            <Badge 
                              key={role} 
                              variant="secondary"
                              className={`text-xs ${getRoleBadgeColor(role)}`}
                            >
                              {getRoleLabel(role)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filteredStaff.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                Nenhum funcionário encontrado
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Profile Detail Dialog */}
      <Dialog open={!!selectedProfile} onOpenChange={() => setSelectedProfile(null)}>
        <DialogContent className="max-w-lg max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedProfile?.avatar_url || selectedEmployee?.photo_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {selectedProfile?.full_name?.charAt(0).toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              {selectedProfile?.full_name}
            </DialogTitle>
            <DialogDescription className="flex flex-wrap gap-1">
              {selectedProfile && getRolesForUser(selectedProfile.user_id).map((role) => (
                <Badge 
                  key={role} 
                  variant="secondary"
                  className={`text-xs ${getRoleBadgeColor(role)}`}
                >
                  {getRoleLabel(role)}
                </Badge>
              ))}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            {loadingDetails ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Admin Toggle */}
                {selectedProfile && (
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                    <div className="flex items-center gap-3">
                      {isUserAdmin(selectedProfile.user_id) ? (
                        <ShieldCheck className="w-5 h-5 text-blue-600" />
                      ) : (
                        <ShieldOff className="w-5 h-5 text-muted-foreground" />
                      )}
                      <div>
                        <Label htmlFor="admin-toggle" className="font-medium cursor-pointer">
                          Acesso de Administrador
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {isUserAdmin(selectedProfile.user_id) 
                            ? "Este usuário tem acesso total ao sistema" 
                            : "Conceder acesso administrativo completo"
                          }
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="admin-toggle"
                      checked={isUserAdmin(selectedProfile.user_id)}
                      onCheckedChange={() => toggleAdminRole(
                        selectedProfile.user_id, 
                        isUserAdmin(selectedProfile.user_id)
                      )}
                      disabled={togglingAdmin}
                    />
                  </div>
                )}

                {/* Contact Info */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground">Contato</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    {loadingSelectedEmail ? (
                      <span className="text-muted-foreground">Carregando e-mail...</span>
                    ) : selectedProfileEmail ? (
                      <span className="break-all">{selectedProfileEmail}</span>
                    ) : (
                      <span className="text-muted-foreground">E-mail não encontrado</span>
                    )}
                  </div>
                  {selectedProfile?.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedProfile.phone}</span>
                    </div>
                  )}
                </div>

                {/* Children (for parents) */}
                {parentChildren.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <Baby className="w-4 h-4" />
                        Filhos Vinculados ({parentChildren.length})
                      </h4>
                      {parentChildren.map((pc) => (
                        <div key={pc.child_id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={pc.children?.photo_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {pc.children?.full_name?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{pc.children?.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {classTypeLabels[pc.children?.class_type] || pc.children?.class_type}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Employee Details */}
                {selectedEmployee && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Dados Profissionais
                      </h4>
                      <div className="grid gap-2 text-sm">
                        {selectedEmployee.job_title && (
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-muted-foreground" />
                            <span><strong>Cargo:</strong> {selectedEmployee.job_title}</span>
                          </div>
                        )}
                        {selectedEmployee.hire_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>
                              <strong>Admissão:</strong> {new Date(selectedEmployee.hire_date).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                        )}
                        {selectedEmployee.birth_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>
                              <strong>Nascimento:</strong> {new Date(selectedEmployee.birth_date).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                        )}
                        {(selectedEmployee.city || selectedEmployee.state) && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span>
                              <strong>Localidade:</strong> {[selectedEmployee.city, selectedEmployee.state].filter(Boolean).join(", ")}
                            </span>
                          </div>
                        )}
                        {selectedEmployee.education_level && (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span><strong>Escolaridade:</strong> {selectedEmployee.education_level}</span>
                          </div>
                        )}
                        {selectedEmployee.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span><strong>Telefone:</strong> {selectedEmployee.phone}</span>
                          </div>
                        )}
                      </div>

                      {(selectedEmployee.emergency_contact_name || selectedEmployee.emergency_contact_phone) && (
                        <>
                          <h5 className="text-sm font-medium mt-4">Contato de Emergência</h5>
                          <div className="p-2 bg-muted/50 rounded-lg text-sm">
                            {selectedEmployee.emergency_contact_name && (
                              <p><strong>Nome:</strong> {selectedEmployee.emergency_contact_name}</p>
                            )}
                            {selectedEmployee.emergency_contact_phone && (
                              <p><strong>Telefone:</strong> {selectedEmployee.emergency_contact_phone}</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}

                {/* Delete User Button */}
                {selectedProfile && selectedProfile.user_id !== user?.id && (
                  <>
                    <Separator className="my-4" />
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => openDeleteDialog(selectedProfile)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir Usuário
                    </Button>
                  </>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog - Using new component */}
      <UserDeletionDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        userId={userToDelete?.user_id || ""}
        userName={userToDelete?.full_name || ""}
        onDeleteComplete={() => {
          setSelectedProfile(null);
          fetchData();
        }}
      />

      {/* Email Diagnostic Modal */}
      <EmailDiagnosticModal
        open={liberateEmailDialogOpen}
        onOpenChange={setLiberateEmailDialogOpen}
        onCleanupComplete={fetchData}
      />
    </div>
  );
}
