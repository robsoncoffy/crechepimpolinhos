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
// Dashboard is heavy and loaded via dynamic import. In some environments a transient
// Vite/PWA cache mismatch can cause: "Failed to fetch dynamically imported module".
// This wrapper retries once, then forces a single reload (guarded) to recover.
const Dashboard = lazy(async () => {
  const isRecoverable = (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    return (
      msg.includes("Failed to fetch dynamically imported module") ||
      msg.includes("Importing a module script failed") ||
      msg.includes("ChunkLoadError")
    );
  };

  try {
    // normal path
    return await import("./pages/Dashboard");
  } catch (err) {
    if (!isRecoverable(err)) throw err;

    // 1) quick retry (HMR rebuild race / temporary network hiccup)
    const retriedKey = "dashboard_import_retried";
    if (!sessionStorage.getItem(retriedKey)) {
      sessionStorage.setItem(retriedKey, "1");
      await new Promise((r) => setTimeout(r, 300));
      return await import("./pages/Dashboard");
    }

    // 2) last resort: hard reload once
    const reloadedKey = "dashboard_import_reloaded";
    if (!sessionStorage.getItem(reloadedKey)) {
      sessionStorage.setItem(reloadedKey, "1");
      window.location.reload();
      // Keep React.lazy pending while the browser reloads.
      return await new Promise<never>(() => {});
    }

    throw err;
  }
});
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
