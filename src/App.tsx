import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import About from "./pages/About";
import Classes from "./pages/Classes";
import Structure from "./pages/Structure";
import Contact from "./pages/Contact";
import Pricing from "./pages/Pricing";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import PreEnrollment from "./pages/PreEnrollment";
import ChildRegistration from "./pages/ChildRegistration";
import AcceptInvite from "./pages/AcceptInvite";
import EmployeeRegistration from "./pages/EmployeeRegistration";
import Install from "./pages/Install";

const queryClient = new QueryClient();

// Wrapper to provide auth context for pages that need it
const ChildRegistrationWithAuth = () => (
  <AuthProvider>
    <ChildRegistration />
  </AuthProvider>
);

const AcceptInviteWithAuth = () => (
  <AuthProvider>
    <AcceptInvite />
  </AuthProvider>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/sobre" element={<About />} />
          <Route path="/turmas" element={<Classes />} />
          <Route path="/estrutura" element={<Structure />} />
          <Route path="/contato" element={<Contact />} />
          <Route path="/planos" element={<Pricing />} />
          <Route path="/pre-matricula" element={<PreEnrollment />} />
          <Route path="/cadastro-pimpolho" element={<ChildRegistrationWithAuth />} />
          <Route path="/aceitar-convite" element={<AcceptInviteWithAuth />} />
          <Route path="/cadastro-funcionario" element={<EmployeeRegistration />} />
          <Route path="/instalar" element={<Install />} />
          <Route path="/painel/*" element={<Dashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
