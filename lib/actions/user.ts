"use server";

import { requireUser } from "@/lib/session";
import type { PublicUser } from "@/types/user";

export async function getProfileAction(): Promise<PublicUser> {
  return requireUser();
}
