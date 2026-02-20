import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileText, Trash2, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";

interface PayslipUploadDialogProps {
  employee: {
    id: string;
    user_id: string;
    full_name: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const months = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function PayslipUploadDialog({ employee, open, onOpenChange }: PayslipUploadDialogProps) {
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing payslips for this employee
  const { data: payslips, refetch: refetchPayslips } = useQuery({
    queryKey: ["employee-payslips", employee?.user_id],
    queryFn: async () => {
      if (!employee) return [];
      
      const { data, error } = await supabase
        .from("employee_documents")
        .select("*")
        .eq("employee_user_id", employee.user_id)
        .eq("doc_type", "holerite")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!employee && open,
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !employee) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${employee.user_id}/holerite_${selectedYear}_${selectedMonth.padStart(2, "0")}.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("employee-documents")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Check if record exists
      const { data: existing } = await supabase
        .from("employee_documents")
        .select("id")
        .eq("employee_user_id", employee.user_id)
        .eq("doc_type", "holerite")
        .eq("title", `Holerite ${months[parseInt(selectedMonth) - 1]}/${selectedYear}`)
        .maybeSingle();

      if (existing) {
        // Update existing record
        await supabase
          .from("employee_documents")
          .update({ file_path: fileName, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        // Insert new record
        const { error: dbError } = await supabase
          .from("employee_documents")
          .insert({
            employee_user_id: employee.user_id,
            doc_type: "holerite",
            title: `Holerite ${months[parseInt(selectedMonth) - 1]}/${selectedYear}`,
            file_path: fileName,
          });

        if (dbError) throw dbError;
      }

      toast.success("Holerite anexado com sucesso!");
      refetchPayslips();
    } catch (error: any) {
      console.error("Error uploading payslip:", error);
      toast.error("Erro ao anexar holerite: " + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDownload = async (filePath: string, title: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("employee-documents")
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = title + "." + filePath.split(".").pop();
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Error downloading:", error);
      toast.error("Erro ao baixar arquivo");
    }
  };

  const handleDelete = async (id: string, filePath: string) => {
    try {
      // Delete from storage
      await supabase.storage.from("employee-documents").remove([filePath]);
      
      // Delete from database
      const { error } = await supabase
        .from("employee_documents")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Holerite removido");
      refetchPayslips();
    } catch (error: any) {
      console.error("Error deleting:", error);
      toast.error("Erro ao remover holerite");
    }
  };

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Holerites - {employee?.full_name}</DialogTitle>
          <DialogDescription>
            Anexe os holerites mensais do funcionário
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Upload Section */}
          <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
            <p className="font-medium text-sm">Anexar Novo Holerite</p>
            <div className="flex gap-2">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month, index) => (
                    <SelectItem key={index + 1} value={(index + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex-1">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                  id="payslip-upload"
                />
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? "Enviando..." : "Enviar PDF"}
                </Button>
              </div>
            </div>
          </div>

          {/* Existing Payslips */}
          <div className="space-y-2">
            <p className="font-medium text-sm">Holerites Anexados</p>
            {payslips && payslips.length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-auto">
                {payslips.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{doc.title}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(doc.file_path, doc.title)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(doc.id, doc.file_path)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum holerite anexado ainda
              </p>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
