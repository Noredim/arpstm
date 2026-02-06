import { useArpStore } from "@/store/arp-store";

export function useCurrentRole() {
  const { getCurrentUser } = useArpStore();
  const user = getCurrentUser();
  return user.role;
}
