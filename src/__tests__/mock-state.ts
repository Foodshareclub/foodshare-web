export const mockState = {
  user: null as { id: string; email: string } | null,
  session: null as { access_token: string; user: { id: string } } | null,
  profile: null as {
    id: string;
    first_name: string;
    second_name: string;
    avatar_url?: string | null;
    email: string;
    is_active?: boolean;
  } | null,
  userRoles: null as Array<{ roles: { name: string } }> | null,
  listing: null as { id: number; post_name: string; profile_id: string } | null,
  roleData: null as { id: string } | null,
  usersData: [] as Array<{
    id: string;
    first_name: string;
    second_name: string;
    email: string;
    created_time?: string;
    is_active: boolean;
  }>,
  usersCount: 0,
  authError: null as { message: string } | null,
  dbError: null as { message: string; code?: string } | null,
};
