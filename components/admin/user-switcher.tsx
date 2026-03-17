"use client";

import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string;
  email: string;
}

export function UserSwitcher({ users, currentUserId }: { users: User[]; currentUserId: string }) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-500">Voir les données de :</label>
      <select
        value={currentUserId}
        onChange={(e) => router.push(`/dashboard?userId=${e.target.value}`)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-pink bg-white"
      >
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} ({u.email})
          </option>
        ))}
      </select>
    </div>
  );
}
