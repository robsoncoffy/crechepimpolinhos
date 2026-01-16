import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Phone, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-pimpolinhos.png";

const navigation = [
  { name: "Início", href: "/" },
  { name: "Sobre Nós", href: "/sobre" },
  { name: "Turmas", href: "/turmas" },
  { name: "Estrutura", href: "/estrutura" },
  { name: "Contato", href: "/contato" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="bg-card shadow-md sticky top-0 z-50">
      {/* Top bar */}
      <div className="bg-primary text-primary-foreground py-2">
        <div className="container flex justify-between items-center text-sm">
          <div className="flex items-center gap-4">
            <a href="tel:5198996-5423" className="flex items-center gap-1 hover:underline">
              <Phone className="w-4 h-4" />
              (51) 98996-5423
            </a>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://instagram.com/crechepimpolinhos"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:underline"
            >
              <Instagram className="w-4 h-4" />
              @crechepimpolinhos
            </a>
          </div>
        </div>
      </div>

      {/* Main navigation */}
      <nav className="container py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Creche Pimpolinhos" className="h-14 w-auto" />
          </Link>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`text-foreground font-semibold hover:text-primary transition-colors ${
                  location.pathname === item.href ? "text-primary" : ""
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Auth buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="outline" asChild>
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button asChild>
              <Link to="/auth?mode=signup">Cadastrar</Link>
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-border">
            <div className="flex flex-col gap-2 pt-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`px-4 py-2 rounded-lg font-semibold ${
                    location.pathname === item.href
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <div className="flex flex-col gap-2 mt-4 px-4">
                <Button variant="outline" asChild className="w-full">
                  <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                    Entrar
                  </Link>
                </Button>
                <Button asChild className="w-full">
                  <Link to="/auth?mode=signup" onClick={() => setMobileMenuOpen(false)}>
                    Cadastrar
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
