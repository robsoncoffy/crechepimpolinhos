import { PublicLayout } from "@/components/layout/PublicLayout";
import { Scale, Shield, UserCheck, AlertCircle, BookOpen } from "lucide-react";

export default function LGPD() {
  return (
    <PublicLayout>
      <div className="bg-gradient-to-b from-primary/10 to-background py-16">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Scale className="w-16 h-16 text-primary mx-auto mb-4" />
              <h1 className="font-fredoka text-4xl font-bold text-primary mb-4">
                LGPD - Lei Geral de Proteção de Dados
              </h1>
              <p className="text-muted-foreground">
                Nosso compromisso com a Lei nº 13.709/2018
              </p>
            </div>

            <div className="bg-card rounded-2xl shadow-lg p-8 space-y-8">
              {/* Introdução */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <BookOpen className="w-6 h-6 text-primary" />
                  <h2 className="font-fredoka text-2xl font-bold text-foreground">
                    O que é a LGPD?
                  </h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  A Lei Geral de Proteção de Dados (LGPD) é a legislação brasileira que regula o 
                  tratamento de dados pessoais por pessoas físicas e jurídicas, com o objetivo de 
                  proteger os direitos fundamentais de liberdade e privacidade dos cidadãos.
                </p>
              </section>

              {/* Nosso Compromisso */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-6 h-6 text-primary" />
                  <h2 className="font-fredoka text-2xl font-bold text-foreground">
                    Nosso Compromisso
                  </h2>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  A Creche Infantil Pimpolinhos está comprometida com a conformidade total à LGPD, 
                  garantindo que todos os dados pessoais coletados sejam tratados com:
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-primary/5 rounded-lg">
                    <h3 className="font-semibold text-foreground mb-2">Transparência</h3>
                    <p className="text-sm text-muted-foreground">
                      Informamos claramente quais dados coletamos e como são utilizados.
                    </p>
                  </div>
                  <div className="p-4 bg-primary/5 rounded-lg">
                    <h3 className="font-semibold text-foreground mb-2">Finalidade</h3>
                    <p className="text-sm text-muted-foreground">
                      Utilizamos os dados apenas para os fins específicos informados.
                    </p>
                  </div>
                  <div className="p-4 bg-primary/5 rounded-lg">
                    <h3 className="font-semibold text-foreground mb-2">Necessidade</h3>
                    <p className="text-sm text-muted-foreground">
                      Coletamos apenas os dados estritamente necessários.
                    </p>
                  </div>
                  <div className="p-4 bg-primary/5 rounded-lg">
                    <h3 className="font-semibold text-foreground mb-2">Segurança</h3>
                    <p className="text-sm text-muted-foreground">
                      Adotamos medidas técnicas para proteger os dados.
                    </p>
                  </div>
                </div>
              </section>

              {/* Bases Legais */}
              <section>
                <h2 className="font-fredoka text-2xl font-bold text-foreground mb-4">
                  Bases Legais para Tratamento
                </h2>
                <p className="text-muted-foreground mb-4">
                  Tratamos seus dados pessoais com base nas seguintes hipóteses legais previstas na LGPD:
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded">Art. 7º, I</span>
                    <span className="text-muted-foreground">Consentimento do titular ou responsável legal</span>
                  </li>
                  <li className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded">Art. 7º, II</span>
                    <span className="text-muted-foreground">Cumprimento de obrigação legal ou regulatória</span>
                  </li>
                  <li className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded">Art. 7º, V</span>
                    <span className="text-muted-foreground">Execução de contrato de prestação de serviços educacionais</span>
                  </li>
                  <li className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded">Art. 7º, VII</span>
                    <span className="text-muted-foreground">Proteção da vida e incolumidade física do titular</span>
                  </li>
                </ul>
              </section>

              {/* Dados de Menores */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <UserCheck className="w-6 h-6 text-primary" />
                  <h2 className="font-fredoka text-2xl font-bold text-foreground">
                    Tratamento de Dados de Crianças
                  </h2>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <p className="text-amber-800 dark:text-amber-200 text-sm">
                      <strong>Atenção especial:</strong> Conforme o Art. 14 da LGPD, o tratamento de dados 
                      pessoais de crianças deve ser realizado no melhor interesse da criança.
                    </p>
                  </div>
                </div>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Coletamos dados de crianças apenas com consentimento específico de pelo menos um dos pais ou responsável legal</li>
                  <li>Os dados são utilizados exclusivamente para fins educacionais e de cuidado</li>
                  <li>Não compartilhamos dados de crianças com terceiros sem autorização expressa</li>
                  <li>Os responsáveis podem solicitar acesso, correção ou exclusão dos dados a qualquer momento</li>
                </ul>
              </section>

              {/* Direitos */}
              <section>
                <h2 className="font-fredoka text-2xl font-bold text-foreground mb-4">
                  Seus Direitos (Art. 18 da LGPD)
                </h2>
                <div className="grid gap-3">
                  {[
                    "Confirmação da existência de tratamento",
                    "Acesso aos dados",
                    "Correção de dados incompletos, inexatos ou desatualizados",
                    "Anonimização, bloqueio ou eliminação de dados desnecessários",
                    "Portabilidade dos dados",
                    "Eliminação dos dados tratados com consentimento",
                    "Informação sobre compartilhamento de dados",
                    "Informação sobre a possibilidade de não fornecer consentimento",
                    "Revogação do consentimento"
                  ].map((direito, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                      <span className="bg-primary/10 text-primary font-bold text-sm w-8 h-8 rounded-full flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="text-muted-foreground">{direito}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Encarregado */}
              <section>
                <h2 className="font-fredoka text-2xl font-bold text-foreground mb-4">
                  Encarregado de Proteção de Dados (DPO)
                </h2>
                <div className="bg-primary/10 rounded-lg p-6">
                  <p className="text-muted-foreground mb-4">
                    Para questões relacionadas à proteção de dados pessoais, entre em contato com nosso 
                    Encarregado de Proteção de Dados:
                  </p>
                  <div className="space-y-2">
                    <p className="text-foreground">
                      <strong>E-mail:</strong>{" "}
                      <a href="mailto:privacidade@crechepimpolinhos.com.br" className="text-primary hover:underline">
                        privacidade@crechepimpolinhos.com.br
                      </a>
                    </p>
                    <p className="text-foreground">
                      <strong>Endereço:</strong> Rua Coronel Camisão, 495 - Harmonia, Canoas/RS - CEP 92310-020
                    </p>
                  </div>
                </div>
              </section>

              {/* ANPD */}
              <section>
                <h2 className="font-fredoka text-2xl font-bold text-foreground mb-4">
                  Autoridade Nacional de Proteção de Dados
                </h2>
                <p className="text-muted-foreground">
                  Caso você tenha alguma reclamação ou denúncia sobre o tratamento de seus dados pessoais, 
                  você pode entrar em contato com a{" "}
                  <a 
                    href="https://www.gov.br/anpd" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Autoridade Nacional de Proteção de Dados (ANPD)
                  </a>.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
