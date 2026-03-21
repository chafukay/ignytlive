import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AdminAuthProvider, useAdminAuth } from "@/lib/admin-auth-context";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin";

const adminQueryClient = new QueryClient();

function AdminContent() {
  const { isAuthenticated } = useAdminAuth();

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  return <AdminDashboard />;
}

export default function AdminApp() {
  return (
    <QueryClientProvider client={adminQueryClient}>
      <AdminAuthProvider>
        <Toaster />
        <AdminContent />
      </AdminAuthProvider>
    </QueryClientProvider>
  );
}
