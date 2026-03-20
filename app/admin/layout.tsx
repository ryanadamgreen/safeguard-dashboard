import { RouteGuard } from "../components/RouteGuard";
import AdminSidebar from "../components/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard allow={["ADMIN"]} redirectTo="/login">
      <div className="flex min-h-screen bg-slate-50">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen">
          {children}
        </div>
      </div>
    </RouteGuard>
  );
}
