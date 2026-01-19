import { Link } from "react-router-dom";
import { Phone, MapPin, Instagram, Clock, Shield, Scale, FileText } from "lucide-react";

export function Footer() {
  return <footer className="bg-primary text-primary-foreground">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Logo e descrição */}
          <div className="space-y-4">
            <img alt="Creche Pimpolinhos" className="h-32 w-auto" src="/lovable-uploads/fae47659-1869-4fc2-b5ac-1573ffbc1bae.png" width="153" height="128" />
            <p className="text-primary-foreground/90">
              Colorindo a infância com cuidado e alegria! Educação infantil de qualidade em Canoas/RS.
            </p>
          </div>

          {/* Links rápidos */}
          <div>
            <h3 className="font-fredoka text-xl font-bold mb-4">Links Rápidos</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="hover:underline">Início</Link>
              </li>
              <li>
                <Link to="/sobre" className="hover:underline">Sobre Nós</Link>
              </li>
              <li>
                <Link to="/turmas" className="hover:underline">Turmas</Link>
              </li>
              <li>
                <Link to="/estrutura" className="hover:underline">Estrutura</Link>
              </li>
              <li>
                <Link to="/planos" className="hover:underline">Planos</Link>
              </li>
              <li>
                <Link to="/pre-matricula" className="hover:underline">Pré-Matrícula</Link>
              </li>
              <li>
                <Link to="/contato" className="hover:underline">Contato</Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-fredoka text-xl font-bold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/politica-privacidade" className="hover:underline flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link to="/lgpd" className="hover:underline flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  LGPD
                </Link>
              </li>
              <li>
                <Link to="/termos-uso" className="hover:underline flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Termos de Uso
                </Link>
              </li>
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h3 className="font-fredoka text-xl font-bold mb-4">Contato</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>Rua Coronel Camisão, 495 - Harmonia, Canoas/RS - CEP 92310-020</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-5 h-5 flex-shrink-0" />
                <a href="tel:5198996-5423" className="hover:underline">(51) 98996-5423</a>
              </li>
              <li className="flex items-center gap-2">
                <Instagram className="w-5 h-5 flex-shrink-0" />
                <a href="https://instagram.com/crechepimpolinhos" target="_blank" rel="noopener noreferrer" className="hover:underline">
                  @crechepimpolinhos
                </a>
              </li>
            </ul>
          </div>

          {/* Horários */}
          <div>
            <h3 className="font-fredoka text-xl font-bold mb-4">Horário de Funcionamento</h3>
            <div className="flex items-start gap-2">
              <Clock className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p>Segunda a Sexta</p>
                <p className="font-bold">7h às 19h</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-primary-foreground/20 py-4">
        <div className="container text-center text-sm text-primary-foreground/80">
          <p>© {new Date().getFullYear()} Creche Infantil Pimpolinhos. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>;
}