import * as React from "react";
import { useSession } from "@/components/auth/SessionProvider";

export function useCurrentUserEmail() {
  const { user } = useSession();
  const [email, setEmail] = React.useState<string>("");

  React.useEffect(() => {
    const next = (user?.email ?? "").trim().toLowerCase();
    setEmail(next);
  }, [user?.email]);

  return email;
}