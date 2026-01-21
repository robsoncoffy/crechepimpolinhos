import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { classTypeLabels, shiftTypeLabels, planTypeLabels, calculateAge } from "@/lib/constants";
import { Database } from "@/integrations/supabase/types";

type Child = Database["public"]["Tables"]["children"]["Row"];
type ClassType = Database["public"]["Enums"]["class_type"];
type ShiftType = Database["public"]["Enums"]["shift_type"];
type PlanType = Database["public"]["Enums"]["plan_type"];

interface ChildPdfExportProps {
  child: Child;
  parentNames?: string[];
}

export function ChildPdfExport({ child, parentNames = [] }: ChildPdfExportProps) {
  const [loading, setLoading] = useState(false);

  const generatePdf = async () => {
    setLoading(true);
    
    try {
      // Fetch additional data: child registration, authorized pickups
      const { data: registrationData } = await supabase
        .from('child_registrations')
        .select('*')
        .ilike('first_name', child.full_name.split(' ')[0])
        .limit(1)
        .maybeSingle();

      // Fetch parent profiles with more details
      const { data: parentLinks } = await supabase
        .from('parent_children')
        .select('parent_id, relationship')
        .eq('child_id', child.id);

      let parentsDetails: Array<{ name: string; phone?: string; email?: string; cpf?: string; relationship: string }> = [];
      
      if (parentLinks && parentLinks.length > 0) {
        const parentIds = parentLinks.map(p => p.parent_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone, email, cpf')
          .in('user_id', parentIds);
        
        if (profiles) {
          parentsDetails = profiles.map(p => {
            const link = parentLinks.find(l => l.parent_id === p.user_id);
            return {
              name: p.full_name,
              phone: p.phone || undefined,
              email: p.email || undefined,
              cpf: p.cpf || undefined,
              relationship: link?.relationship || 'Responsável'
            };
          });
        }
      }

      const content = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Ficha Cadastral - ${child.full_name}</title>
          <style>
            @media print {
              @page {
                size: A4;
                margin: 15mm;
              }
            }
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 20px;
              background: white;
              color: #333;
              font-size: 12px;
              line-height: 1.5;
            }
            
            .header {
              text-align: center;
              margin-bottom: 25px;
              padding-bottom: 15px;
              border-bottom: 3px solid #3b82f6;
            }
            
            .header h1 {
              font-size: 22px;
              color: #3b82f6;
              margin-bottom: 5px;
            }
            
            .header .school-name {
              font-size: 18px;
              font-weight: bold;
              color: #333;
              margin-bottom: 5px;
            }
            
            .header .subtitle {
              font-size: 11px;
              color: #666;
            }
            
            .section {
              margin-bottom: 20px;
            }
            
            .section-title {
              font-size: 14px;
              font-weight: 600;
              color: #3b82f6;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 5px;
              margin-bottom: 10px;
            }
            
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
            }
            
            .grid-3 {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 10px;
            }
            
            .field {
              margin-bottom: 8px;
            }
            
            .field-label {
              font-weight: 600;
              color: #555;
              font-size: 10px;
              text-transform: uppercase;
              margin-bottom: 2px;
            }
            
            .field-value {
              padding: 6px 10px;
              background: #f8fafc;
              border: 1px solid #e5e7eb;
              border-radius: 4px;
              min-height: 28px;
            }
            
            .field-value.empty {
              color: #9ca3af;
              font-style: italic;
            }
            
            .alert-box {
              background: #fef2f2;
              border: 1px solid #fecaca;
              border-radius: 6px;
              padding: 10px;
              margin-bottom: 10px;
            }
            
            .alert-box.warning {
              background: #fffbeb;
              border-color: #fde68a;
            }
            
            .alert-title {
              font-weight: 600;
              color: #dc2626;
              margin-bottom: 4px;
            }
            
            .alert-box.warning .alert-title {
              color: #d97706;
            }
            
            .parent-card {
              background: #f0f9ff;
              border: 1px solid #bae6fd;
              border-radius: 6px;
              padding: 12px;
              margin-bottom: 10px;
            }
            
            .parent-card h4 {
              font-size: 13px;
              color: #0369a1;
              margin-bottom: 8px;
            }
            
            .footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 1px solid #e5e7eb;
            }
            
            .signature-line {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              margin-top: 40px;
            }
            
            .signature-box {
              text-align: center;
            }
            
            .signature-box .line {
              border-top: 1px solid #333;
              margin-bottom: 5px;
              padding-top: 5px;
            }
            
            .timestamp {
              text-align: right;
              font-size: 10px;
              color: #9ca3af;
              margin-top: 20px;
            }
            
            .no-print {
              margin-bottom: 20px;
              text-align: center;
            }
            
            @media print {
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="no-print">
            <button onclick="window.print()" style="padding: 10px 20px; font-size: 14px; cursor: pointer; background: #3b82f6; color: white; border: none; border-radius: 5px; margin-right: 10px;">
              🖨️ Imprimir / Salvar PDF
            </button>
            <button onclick="window.close()" style="padding: 10px 20px; font-size: 14px; cursor: pointer; background: #6b7280; color: white; border: none; border-radius: 5px;">
              ✕ Fechar
            </button>
          </div>
          
          <div class="header">
            <div class="school-name">Creche Pimpolinhos</div>
            <h1>Ficha Cadastral do Aluno</h1>
            <div class="subtitle">Documento para arquivamento conforme legislação vigente</div>
          </div>
          
          <!-- Dados da Criança -->
          <div class="section">
            <div class="section-title">📋 Dados da Criança</div>
            <div class="grid">
              <div class="field">
                <div class="field-label">Nome Completo</div>
                <div class="field-value">${child.full_name}</div>
              </div>
              <div class="field">
                <div class="field-label">Data de Nascimento</div>
                <div class="field-value">${format(new Date(child.birth_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} (${calculateAge(child.birth_date)})</div>
              </div>
            </div>
            <div class="grid-3">
              <div class="field">
                <div class="field-label">Turma</div>
                <div class="field-value">${classTypeLabels[child.class_type as ClassType]}</div>
              </div>
              <div class="field">
                <div class="field-label">Turno</div>
                <div class="field-value">${shiftTypeLabels[child.shift_type as ShiftType]}</div>
              </div>
              <div class="field">
                <div class="field-label">Plano</div>
                <div class="field-value ${!child.plan_type ? 'empty' : ''}">${child.plan_type ? planTypeLabels[child.plan_type as PlanType] : 'Não definido'}</div>
              </div>
            </div>
          </div>
          
          <!-- Informações de Saúde -->
          <div class="section">
            <div class="section-title">🏥 Informações de Saúde</div>
            
            ${child.allergies ? `
            <div class="alert-box">
              <div class="alert-title">⚠️ Alergias</div>
              <div>${child.allergies}</div>
            </div>
            ` : ''}
            
            ${child.dietary_restrictions ? `
            <div class="alert-box warning">
              <div class="alert-title">🍽️ Restrições Alimentares</div>
              <div>${child.dietary_restrictions}</div>
            </div>
            ` : ''}
            
            ${child.special_milk ? `
            <div class="alert-box warning">
              <div class="alert-title">🍼 Leite Especial</div>
              <div>${child.special_milk}</div>
            </div>
            ` : ''}
            
            <div class="grid">
              <div class="field">
                <div class="field-label">Informações Médicas</div>
                <div class="field-value ${!child.medical_info ? 'empty' : ''}">${child.medical_info || 'Nenhuma informação registrada'}</div>
              </div>
              <div class="field">
                <div class="field-label">Preferências Alimentares</div>
                <div class="field-value ${!child.food_preferences ? 'empty' : ''}">${child.food_preferences || 'Nenhuma preferência registrada'}</div>
              </div>
            </div>
            
            <div class="grid">
              <div class="field">
                <div class="field-label">Pediatra</div>
                <div class="field-value ${!child.pediatrician_name ? 'empty' : ''}">${child.pediatrician_name || 'Não informado'}</div>
              </div>
              <div class="field">
                <div class="field-label">Telefone do Pediatra</div>
                <div class="field-value ${!child.pediatrician_phone ? 'empty' : ''}">${child.pediatrician_phone || 'Não informado'}</div>
              </div>
            </div>
          </div>
          
          <!-- Responsáveis -->
          <div class="section">
            <div class="section-title">👥 Responsáveis</div>
            ${parentsDetails.length > 0 ? parentsDetails.map(p => `
              <div class="parent-card">
                <h4>${p.relationship}: ${p.name}</h4>
                <div class="grid-3">
                  <div class="field">
                    <div class="field-label">Telefone</div>
                    <div class="field-value ${!p.phone ? 'empty' : ''}">${p.phone || 'Não informado'}</div>
                  </div>
                  <div class="field">
                    <div class="field-label">E-mail</div>
                    <div class="field-value ${!p.email ? 'empty' : ''}">${p.email || 'Não informado'}</div>
                  </div>
                  <div class="field">
                    <div class="field-label">CPF</div>
                    <div class="field-value ${!p.cpf ? 'empty' : ''}">${p.cpf || 'Não informado'}</div>
                  </div>
                </div>
              </div>
            `).join('') : `
              <div class="field-value empty">Nenhum responsável vinculado</div>
            `}
          </div>
          
          <!-- Autorizados para Busca -->
          <div class="section">
            <div class="section-title">🚗 Pessoas Autorizadas para Busca</div>
            ${child.authorized_pickups && child.authorized_pickups.length > 0 ? `
              <div class="field-value">${child.authorized_pickups.join(', ')}</div>
            ` : `
              <div class="field-value empty">Nenhuma pessoa adicional autorizada</div>
            `}
          </div>
          
          ${registrationData ? `
          <!-- Dados do Cadastro Original -->
          <div class="section">
            <div class="section-title">📝 Dados Documentais (do cadastro)</div>
            <div class="grid-3">
              <div class="field">
                <div class="field-label">CPF da Criança</div>
                <div class="field-value ${!registrationData.cpf ? 'empty' : ''}">${registrationData.cpf || 'Não informado'}</div>
              </div>
              <div class="field">
                <div class="field-label">RG da Criança</div>
                <div class="field-value ${!registrationData.rg ? 'empty' : ''}">${registrationData.rg || 'Não informado'}</div>
              </div>
              <div class="field">
                <div class="field-label">Cartão SUS</div>
                <div class="field-value ${!registrationData.sus_card ? 'empty' : ''}">${registrationData.sus_card || 'Não informado'}</div>
              </div>
            </div>
            <div class="grid">
              <div class="field">
                <div class="field-label">Endereço</div>
                <div class="field-value ${!registrationData.address ? 'empty' : ''}">${registrationData.address || 'Não informado'}</div>
              </div>
              <div class="field">
                <div class="field-label">Cidade</div>
                <div class="field-value ${!registrationData.city ? 'empty' : ''}">${registrationData.city || 'Não informado'}</div>
              </div>
            </div>
          </div>
          ` : ''}
          
          <!-- Assinaturas -->
          <div class="footer">
            <div class="signature-line">
              <div class="signature-box">
                <div class="line">Assinatura do Responsável</div>
              </div>
              <div class="signature-box">
                <div class="line">Assinatura da Direção</div>
              </div>
            </div>
          </div>
          
          <div class="timestamp">
            Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} - Creche Pimpolinhos
          </div>
        </body>
        </html>
      `;
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(content);
        printWindow.document.close();
      } else {
        toast.error('Popup bloqueado. Permita popups para baixar o PDF.');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={generatePdf}
      disabled={loading}
      title="Baixar Ficha Cadastral (PDF)"
      className="text-pimpo-blue hover:text-pimpo-blue hover:bg-pimpo-blue/10"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <FileDown className="w-4 h-4" />
      )}
    </Button>
  );
}