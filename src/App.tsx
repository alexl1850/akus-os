import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { SubAccountProvider } from "@/context/SubAccountContext";
import { HomeRedirect, RequireAdmin, RequireAuth, RequireSubAccount } from "@/components/auth/Guards";
import { AppShell } from "@/components/shell/AppShell";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Inbox from "./pages/app/Inbox";
import Contacts from "./pages/app/Contacts";
import Pipeline from "./pages/app/Pipeline";
import Quotes from "./pages/app/Quotes";
import More from "./pages/app/More";
import Settings from "./pages/app/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner position="top-center" richColors />
      <BrowserRouter>
        <AuthProvider>
          <SubAccountProvider>
            <Routes>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/login" element={<Login />} />
              <Route path="/auth/callback" element={<AuthCallback />} />

              <Route element={<RequireAuth />}>
                <Route element={<RequireAdmin />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                </Route>

                <Route element={<RequireSubAccount />}>
                  <Route path="/app" element={<AppShell />}>
                    <Route index element={<Navigate to="inbox" replace />} />
                    <Route path="inbox" element={<Inbox />} />
                    <Route path="contacts" element={<Contacts />} />
                    <Route path="pipeline" element={<Pipeline />} />
                    <Route path="quotes" element={<Quotes />} />
                    <Route path="more" element={<More />} />
                    <Route path="settings" element={<Settings />} />
                  </Route>
                </Route>
              </Route>

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SubAccountProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
