import { AdminUsersClient } from "@/app/admin/users/AdminUsersClient";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminUsers, getUserStats } from "@/lib/data/admin-users";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    role?: string;
    isActive?: string;
    page?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

async function UsersContent({ searchParams }: PageProps) {
  const params = await searchParams;

  const filters = {
    search: params.search || "",
    role: params.role || "all",
    isActive: params.isActive === "true" ? true : params.isActive === "false" ? false : undefined,
    page: Number.parseInt(params.page || "1", 10),
    limit: 20,
    sortBy: (params.sortBy as "created_time" | "last_seen_at" | "first_name" | "email") || "created_time",
    sortOrder: (params.sortOrder as "asc" | "desc") || "desc",
  };

  const [usersResult, stats] = await Promise.all([getAdminUsers(filters), getUserStats()]);

  return (
    <AdminUsersClient
      initialUsers={usersResult.users}
      initialTotal={usersResult.total}
      initialPage={usersResult.page}
      totalPages={usersResult.totalPages}
      stats={stats}
      filters={filters}
    />
  );
}

const USER_STAT_SKELETON_KEYS = ["a", "b", "c", "d", "e"] as const;
const USER_ROW_SKELETON_KEYS = ["a", "b", "c", "d", "e"] as const;

function UsersSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-5 gap-4">
        {USER_STAT_SKELETON_KEYS.map((k) => (
          <Skeleton key={k} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-12 w-full" />
      <div className="space-y-3">
        {USER_ROW_SKELETON_KEYS.map((k) => (
          <Skeleton key={k} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("user_management")}</h1>
        <p className="text-muted-foreground mt-1">Manage users, roles, and permissions</p>
      </div>

      <Suspense fallback={<UsersSkeleton />}>
        <UsersContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
