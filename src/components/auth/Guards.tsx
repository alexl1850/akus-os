import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useSubAccount } from "@/context/SubAccountContext";
import { FullPageSpinner } from "@/components/FullPageSpinner";
import { NoAccess } from "@/components/NoAccess";

export function RequireAuth() {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageSpinner />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function RequireAdmin() {
  const { isPlatformAdmin, profile } = useAuth();
  if (!profile) return <FullPageSpinner />;
  if (!isPlatformAdmin) return <Navigate to="/app" replace />;
  return <Outlet />;
}

/** The tradie app needs a sub-account: your own, or the one an admin entered. */
export function RequireSubAccount() {
  const { isPlatformAdmin, profile } = useAuth();
  const { subAccountId } = useSubAccount();
  if (!profile) return <FullPageSpinner />;
  if (!subAccountId) {
    if (isPlatformAdmin) return <Navigate to="/admin" replace />;
    return <NoAccess />;
  }
  return <Outlet />;
}

/** "/" sends people where they belong. */
export function HomeRedirect() {
  const { session, loading, profile, isPlatformAdmin } = useAuth();
  const { subAccountId } = useSubAccount();
  if (loading || (session && !profile)) return <FullPageSpinner />;
  if (!session) return <Navigate to="/login" replace />;
  if (isPlatformAdmin && !subAccountId) return <Navigate to="/admin" replace />;
  return <Navigate to="/app/inbox" replace />;
}
