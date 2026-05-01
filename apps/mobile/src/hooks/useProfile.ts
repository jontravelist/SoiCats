import { useQuery } from "@tanstack/react-query";
import { fetchCurrentUserProfile } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

export function useProfile() {
  const session = useAuthStore((s) => s.session);
  return useQuery({
    queryKey: ["profile", session?.user.id ?? "anon"],
    queryFn: fetchCurrentUserProfile,
    enabled: !!session,
  });
}
