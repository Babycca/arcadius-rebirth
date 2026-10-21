"use client";

import { useSession } from "next-auth/react";

export function useCanEdit() {
  const { data: session } = useSession();
  const user = session?.user as { role?: string; editorMode?: boolean } | undefined;
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  return { isAdmin, canEdit: isAdmin && !!user?.editorMode };
}
