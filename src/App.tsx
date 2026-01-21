import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Home from "./pages/Home";

// Lazy load all pages except Home for better initial load performance
const Auth = lazy(() => import("./pages/Auth"));
const About = lazy(() => import("./pages/About"));
const Classes = lazy(() => import("./pages/Classes"));
const Structure = lazy(() => import("./pages/Structure"));
const Contact = lazy(() => import("./pages/Contact"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PreEnrollment = lazy(() => import("./pages/PreEnrollment"));
const ChildRegistration = lazy(() => import("./pages/ChildRegistration"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const EmployeeRegistration = lazy(() => import("./pages/EmployeeRegistration"));
const Install = lazy(() => import("./pages/Install"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const LGPD = lazy(() => import("./pages/LGPD"));
const TermsOfUse = lazy(() => import("./pages/TermsOfUse"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

const queryClient = new QueryClient();

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

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
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/redefinir-senha" element={<ResetPassword />} />
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
            <Route path="/politica-privacidade" element={<PrivacyPolicy />} />
            <Route path="/lgpd" element={<LGPD />} />
            <Route path="/termos-uso" element={<TermsOfUse />} />
            <Route path="/painel/*" element={<Dashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
