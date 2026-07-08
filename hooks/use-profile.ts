import { useQuery } from "@tanstack/react-query";
import { getProfileAction } from "@/lib/actions/user";

export const profileQueryKey = ["profile"] as const;

export function useProfile() {
  return useQuery({
    queryKey: profileQueryKey,
    queryFn: () => getProfileAction(),
  });
}
