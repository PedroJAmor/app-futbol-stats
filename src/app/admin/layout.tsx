import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/session";
import { hasRole } from "@/features/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || !hasRole(user.role, "ADMIN")) redirect("/perfil");
  return children;
}
