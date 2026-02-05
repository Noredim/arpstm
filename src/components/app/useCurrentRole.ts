import { useProfileRole } from "@/components/auth/useProfileRole";
import type { UserRole } from "@/lib/arp-types";

export function useCurrentRole(): UserRole | null {
  const { role } = useProfileRole();
  return role;
}