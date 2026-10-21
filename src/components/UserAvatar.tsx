"use client";

import { useSession } from "next-auth/react";

export default function UserAvatar() {
  const { data: session } = useSession();
  const user = session?.user as { name?: string; avatarUrl?: string | null } | undefined;
  const name = user?.name ?? "?";

  return (
    <div className="w-10 h-10 rounded-full glass-strong flex items-center justify-center text-sm font-medium shrink-0 overflow-hidden">
      {user?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        name[0]
      )}
    </div>
  );
}
