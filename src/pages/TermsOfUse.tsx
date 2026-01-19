import { PublicLayout } from "@/components/layout/PublicLayout";
import { FileText, CheckCircle, AlertTriangle, Ban, Gavel } from "lucide-react";

export default function TermsOfUse() {
  return (
    <PublicLayout>
      <div className="bg-gradient-to-b from-primary/10 to-background py-16">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <FileText className="w-16 h-16 text-primary mx-auto mb-4" />
              <h1 className="font-fredoka text-4xl font-bold text-primary mb-4">
                Termos e Condições de Uso
              </h1>
              <p className="text-muted-foreground">
                Última atualização: {new Date().toLocaleDateString('pt-BR')}
              </p>
            </div>

            <div className="bg-card rounded-2xl shadow-lg p-8 space-y-8">
              {/* Aceitação */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-primary" />
                  <h2 className="font-fredoka text-2xl font-bold text-foreground">
                    1. Aceitação dos Termos
                  </h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Ao acessar e utilizar o site da Creche Infantil Pimpolinhos, você concorda com estes 
                  Termos e Condições de Uso, bem como com nossa Política de Privacidade. Se você não 
                  concordar com algum dos termos, por favor, não utilize nosso site.
                </p>
              </section>

              {/* Sobre o Site */}
              <section>
                <h2 className="font-fredoka text-2xl font-bold text-foreground mb-4">
                  2. Sobre o Site
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  O site da Creche Infantil Pimpolinhos é uma plataforma destinada a:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Fornecer informações sobre nossos serviços educacionais</li>
                  <li>Permitir o cadastro de pré-matrículas</li>
                  <li>Facilitar a comunicação entre pais/responsáveis e a instituição</li>
                  <li>Disponibilizar acesso ao portal do responsável para acompanhamento escolar</li>
                  <li>Divulgar atividades, eventos e comunicados da creche</li>
                </ul>
              </section>

              {/* Cadastro */}
              <section>
                <h2 className="font-fredoka text-2xl font-bold text-foreground mb-4">
                  3. Cadastro e Conta de Usuário
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Para acessar determinadas funcionalidades do site, você precisará criar uma conta. Ao se cadastrar, você declara que:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>As informações fornecidas são verdadeiras, precisas e completas</li>
                  <li>Você é maior de 18 anos ou responsável legal autorizado</li>
                  <li>Manterá suas credenciais de acesso em sigilo</li>
                  <li>É responsável por todas as atividades realizadas em sua conta</li>
                  <li>Notificará imediatamente a creche em caso de uso não autorizado</li>
                </ul>
              </section>

              {/* Uso Aceitável */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <h2 className="font-fredoka text-2xl font-bold text-foreground">
                    4. Uso Aceitável
                  </h2>
                </div>
                <p className="text-muted-foreground mb-4">Você concorda em utilizar o site apenas para fins legítimos, incluindo:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Consultar informações sobre a creche e seus serviços</li>
                  <li>Realizar pré-matrículas e cadastros autorizados</li>
                  <li>Acompanhar o desenvolvimento escolar de seus filhos</li>
                  <li>Comunicar-se com a equipe pedagógica através dos canais oficiais</li>
                  <li>Acessar materiais e comunicados disponibilizados</li>
                </ul>
              </section>

              {/* Uso Proibido */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Ban className="w-6 h-6 text-destructive" />
                  <h2 className="font-fredoka text-2xl font-bold text-foreground">
                    5. Condutas Proibidas
                  </h2>
                </div>
                <p className="text-muted-foreground mb-4">É expressamente proibido:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Fornecer informações falsas ou enganosas</li>
                  <li>Acessar contas de outros usuários sem autorização</li>
                  <li>Tentar violar a segurança do site ou de seus sistemas</li>
                  <li>Utilizar o site para fins comerciais não autorizados</li>
                  <li>Copiar, modificar ou distribuir conteúdo sem autorização</li>
                  <li>Transmitir vírus, malware ou qualquer código malicioso</li>
                  <li>Assediar, difamar ou prejudicar outros usuários</li>
                  <li>Violar direitos de propriedade intelectual</li>
                </ul>
              </section>

              {/* Propriedade Intelectual */}
              <section>
                <h2 className="font-fredoka text-2xl font-bold text-foreground mb-4">
                  6. Propriedade Intelectual
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Todo o conteúdo do site, incluindo textos, imagens, logotipos, design, layout e 
                  funcionalidades, é de propriedade exclusiva da Creche Infantil Pimpolinhos ou de 
                  seus licenciadores, sendo protegido pelas leis de direitos autorais e propriedade 
                  intelectual. É proibida a reprodução, modificação ou distribuição sem autorização 
                  prévia por escrito.
                </p>
              </section>

              {/* Responsabilidades */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                  <h2 className="font-fredoka text-2xl font-bold text-foreground">
                    7. Limitação de Responsabilidade
                  </h2>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  A Creche Infantil Pimpolinhos se esforça para manter o site funcionando corretamente, mas não garante:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Disponibilidade ininterrupta do site</li>
                  <li>Ausência total de erros ou falhas técnicas</li>
                  <li>Compatibilidade com todos os dispositivos e navegadores</li>
                  <li>Segurança absoluta contra ataques cibernéticos</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  Não nos responsabilizamos por danos indiretos, incidentais ou consequenciais 
                  decorrentes do uso ou impossibilidade de uso do site.
                </p>
              </section>

              {/* Privacidade */}
              <section>
                <h2 className="font-fredoka text-2xl font-bold text-foreground mb-4">
                  8. Privacidade e Proteção de Dados
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  O tratamento de seus dados pessoais é regido por nossa{" "}
                  <a href="/politica-privacidade" className="text-primary hover:underline">
                    Política de Privacidade
                  </a>{" "}
                  e em conformidade com a{" "}
                  <a href="/lgpd" className="text-primary hover:underline">
                    Lei Geral de Proteção de Dados (LGPD)
                  </a>
                  . Ao utilizar o site, você consente com a coleta e uso de dados conforme 
                  descrito nesses documentos.
                </p>
              </section>

              {/* Alterações */}
              <section>
                <h2 className="font-fredoka text-2xl font-bold text-foreground mb-4">
                  9. Alterações nos Termos
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Reservamo-nos o direito de modificar estes Termos e Condições a qualquer momento. 
                  As alterações entrarão em vigor imediatamente após sua publicação no site. 
                  Recomendamos que você revise periodicamente esta página para se manter informado 
                  sobre eventuais mudanças.
                </p>
              </section>

              {/* Rescisão */}
              <section>
                <h2 className="font-fredoka text-2xl font-bold text-foreground mb-4">
                  10. Rescisão de Acesso
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  A Creche Infantil Pimpolinhos pode suspender ou encerrar seu acesso ao site a 
                  qualquer momento, sem aviso prévio, caso você viole estes Termos e Condições ou 
                  por qualquer outro motivo que julgarmos necessário para proteger a segurança e 
                  integridade do site e de seus usuários.
                </p>
              </section>

              {/* Lei Aplicável */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Gavel className="w-6 h-6 text-primary" />
                  <h2 className="font-fredoka text-2xl font-bold text-foreground">
                    11. Lei Aplicável e Foro
                  </h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Estes Termos e Condições são regidos pelas leis da República Federativa do Brasil. 
                  Fica eleito o foro da Comarca de Canoas/RS para dirimir quaisquer controvérsias 
                  decorrentes destes termos, com renúncia expressa a qualquer outro, por mais 
                  privilegiado que seja.
                </p>
              </section>

              {/* Contato */}
              <section>
                <h2 className="font-fredoka text-2xl font-bold text-foreground mb-4">
                  12. Contato
                </h2>
                <div className="bg-primary/10 rounded-lg p-6">
                  <p className="text-muted-foreground mb-4">
                    Em caso de dúvidas sobre estes Termos e Condições, entre em contato:
                  </p>
                  <div className="space-y-2 text-foreground">
                    <p><strong>Creche Infantil Pimpolinhos</strong></p>
                    <p>Rua Coronel Camisão, 495 - Harmonia, Canoas/RS - CEP 92310-020</p>
                    <p>Telefone: (51) 98996-5423</p>
                    <p>
                      E-mail:{" "}
                      <a href="mailto:contato@crechepimpolinhos.com.br" className="text-primary hover:underline">
                        contato@crechepimpolinhos.com.br
                      </a>
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
