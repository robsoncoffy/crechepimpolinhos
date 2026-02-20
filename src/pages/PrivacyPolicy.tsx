import { PublicLayout } from "@/components/layout/PublicLayout";
import { Shield, Lock, Eye, FileText, Mail, Cookie } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <PublicLayout>
      <div className="bg-gradient-to-b from-primary/10 to-background py-16">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
              <h1 className="font-fredoka text-4xl font-bold text-primary mb-4">
                Política de Privacidade
              </h1>
              <p className="text-muted-foreground">
                Última atualização: {new Date().toLocaleDateString('pt-BR')}
              </p>
            </div>

            <div className="bg-card rounded-2xl shadow-lg p-8 space-y-8">
              {/* Compromisso */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Lock className="w-6 h-6 text-primary" />
                  <h2 className="font-fredoka text-2xl font-bold text-foreground">
                    Compromisso com a Privacidade
                  </h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  A Creche Infantil Pimpolinhos respeita e protege a privacidade de seus visitantes, 
                  pais e responsáveis. Esta Política de Privacidade descreve como coletamos, utilizamos, 
                  armazenamos e protegemos os dados pessoais fornecidos através do nosso site.
                </p>
              </section>

              {/* Dados coletados */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Eye className="w-6 h-6 text-primary" />
                  <h2 className="font-fredoka text-2xl font-bold text-foreground">
                    Quais Dados Coletamos
                  </h2>
                </div>
                <p className="text-muted-foreground mb-4">
                  Coletamos apenas os dados necessários para prestar nossos serviços e melhorar sua experiência, incluindo:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Nome completo do responsável e da criança</li>
                  <li>E-mail e telefone de contato</li>
                  <li>Endereço residencial</li>
                  <li>Dados de saúde da criança (quando fornecidos voluntariamente)</li>
                  <li>Preferências de horário e informações escolares</li>
                  <li>Informações de navegação (cookies, IP, tipo de dispositivo e navegador)</li>
                </ul>
              </section>

              {/* Finalidade */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="w-6 h-6 text-primary" />
                  <h2 className="font-fredoka text-2xl font-bold text-foreground">
                    Finalidade do Uso dos Dados
                  </h2>
                </div>
                <p className="text-muted-foreground mb-4">Os dados são utilizados para:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Agendamento de visitas e atendimento personalizado</li>
                  <li>Processos de matrícula e comunicação com responsáveis</li>
                  <li>Envio de materiais informativos e pedagógicos</li>
                  <li>Atualizações sobre atividades da creche</li>
                  <li>Cumprimento de obrigações legais e regulatórias</li>
                  <li>Garantia da segurança física e digital das crianças e usuários</li>
                </ul>
              </section>

              {/* Compartilhamento */}
              <section>
                <h2 className="font-fredoka text-2xl font-bold text-foreground mb-4">
                  Compartilhamento de Dados
                </h2>
                <p className="text-muted-foreground mb-4">
                  A Creche Pimpolinhos <strong>não vende, aluga ou compartilha</strong> dados pessoais com terceiros, exceto:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Quando exigido por lei ou autoridade pública competente</li>
                  <li>Com empresas contratadas para serviços como hospedagem do site e e-mail, sob cláusula de confidencialidade</li>
                  <li>Com profissionais de saúde ou parceiros pedagógicos, apenas quando necessário ao cuidado da criança, com consentimento prévio</li>
                </ul>
              </section>

              {/* Segurança */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-6 h-6 text-primary" />
                  <h2 className="font-fredoka text-2xl font-bold text-foreground">
                    Segurança dos Dados
                  </h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Adotamos medidas técnicas e administrativas adequadas para proteger os dados contra 
                  acessos não autorizados, vazamentos, alterações ou destruição. O acesso às informações 
                  é restrito apenas a colaboradores autorizados e capacitados.
                </p>
              </section>

              {/* Armazenamento */}
              <section>
                <h2 className="font-fredoka text-2xl font-bold text-foreground mb-4">
                  Armazenamento e Tempo de Retenção
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Os dados serão armazenados pelo tempo necessário para cumprir as finalidades mencionadas, 
                  respeitando os prazos legais e regulatórios, podendo ser excluídos mediante solicitação 
                  expressa do titular (exceto nos casos em que a retenção for obrigatória por lei).
                </p>
              </section>

              {/* Direitos */}
              <section>
                <h2 className="font-fredoka text-2xl font-bold text-foreground mb-4">
                  Direitos dos Titulares
                </h2>
                <p className="text-muted-foreground mb-4">Você tem o direito de:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Confirmar a existência de tratamento de seus dados</li>
                  <li>Acessar, corrigir, atualizar ou excluir seus dados pessoais</li>
                  <li>Revogar o consentimento a qualquer momento</li>
                  <li>Solicitar a portabilidade dos dados, se aplicável</li>
                  <li>Registrar reclamação junto à ANPD (Autoridade Nacional de Proteção de Dados)</li>
                </ul>
                <div className="mt-4 p-4 bg-primary/10 rounded-lg">
                  <p className="text-foreground flex items-center gap-2">
                    <Mail className="w-5 h-5 text-primary" />
                    Para exercer esses direitos, entre em contato pelo e-mail:{" "}
                    <a href="mailto:privacidade@crechepimpolinhos.com.br" className="text-primary font-semibold hover:underline">
                      privacidade@crechepimpolinhos.com.br
                    </a>
                  </p>
                </div>
              </section>

              {/* Cookies */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Cookie className="w-6 h-6 text-primary" />
                  <h2 className="font-fredoka text-2xl font-bold text-foreground">
                    Uso de Cookies
                  </h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Utilizamos cookies apenas para melhorar a navegação e entender como os usuários 
                  interagem com o site. Você pode desativá-los nas configurações do seu navegador.
                </p>
              </section>

              {/* Alterações */}
              <section>
                <h2 className="font-fredoka text-2xl font-bold text-foreground mb-4">
                  Alterações nesta Política
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Esta Política de Privacidade pode ser atualizada a qualquer momento, visando atender 
                  requisitos legais ou melhorias nos serviços. A versão vigente estará sempre disponível 
                  nesta página.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
