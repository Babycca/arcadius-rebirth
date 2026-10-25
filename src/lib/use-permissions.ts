"use client";

import { useSession } from "next-auth/react";
import { isAdminRole, parsePermissions, type PermissionKey } from "@/lib/permissions";

export function usePermissions() {
  const { data: session } = useSession();
  const user = session?.user as { role?: string; permissionsJson?: string } | undefined;
  const isAdmin = isAdminRole(user?.role);
  const perms = parsePermissions(user?.permissionsJson);

  function has(key: PermissionKey) {
    return isAdmin || !!perms[key];
  }

  return { isAdmin, has };
}
