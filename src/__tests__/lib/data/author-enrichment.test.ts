import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockProfiles = new Map<string, any>();
let mockError: any = null;

mock.module("@/lib/supabase/server", () => ({
  createCachedClient: () => ({
    from: (table: string) => {
      if (table !== "profiles_public") {
        throw new Error(`Unexpected table query: ${table}`);
      }
      return {
        select: () => ({
          in: async (_column: string, ids: string[]) => {
            if (mockError) {
              return { data: null, error: mockError };
            }
            const data = ids.map((id) => mockProfiles.get(id)).filter(Boolean);
            return { data, error: null };
          },
        }),
      };
    },
  }),
}));

import { enrichPostsWithAuthors, enrichSinglePostWithAuthor } from "@/lib/data/author-enrichment";

describe("author-enrichment (Author Attribution Architecture)", () => {
  beforeEach(() => {
    mockProfiles.clear();
    mockError = null;
  });

  it("enriches posts with author first name from profiles_public", async () => {
    mockProfiles.set("user-tarlan", {
      id: "user-tarlan",
      first_name: "Tarlan",
      second_name: "Isaev",
      nickname: "organicnz",
      avatar_url: "https://example.com/avatar.jpg",
    });

    const posts = [
      {
        id: 2733,
        profile_id: "user-tarlan",
        post_name: "Banana",
      },
    ];

    const result = await enrichPostsWithAuthors(posts);

    expect(result[0].author_name).toBe("Tarlan");
    expect(result[0].author_avatar_url).toBe("https://example.com/avatar.jpg");
  });

  it("strips surnames to preserve individual user privacy (e.g. 'Tarlan Isaev' -> 'Tarlan')", async () => {
    mockProfiles.set("user-tarlan", {
      id: "user-tarlan",
      first_name: "Tarlan Isaev",
      nickname: "organicnz",
    });

    const posts = [
      {
        id: 2732,
        profile_id: "user-tarlan",
        post_name: "Apple",
      },
    ];

    const result = await enrichPostsWithAuthors(posts);

    expect(result[0].author_name).toBe("Tarlan");
  });

  it("falls back to nickname if first_name is empty", async () => {
    mockProfiles.set("user-nick", {
      id: "user-nick",
      first_name: "",
      nickname: "organicnz",
    });

    const posts = [
      {
        id: 2511,
        profile_id: "user-nick",
        post_name: "Organic apples",
      },
    ];

    const result = await enrichPostsWithAuthors(posts);

    expect(result[0].author_name).toBe("organicnz");
  });

  it("replaces fallback 'Community Member' with author name when profile is resolved", async () => {
    mockProfiles.set("user-tarlan", {
      id: "user-tarlan",
      first_name: "Tarlan",
    });

    const posts = [
      {
        id: 2487,
        profile_id: "user-tarlan",
        post_name: "Rice",
        author_name: "Community Member",
      },
    ];

    const result = await enrichPostsWithAuthors(posts);

    expect(result[0].author_name).toBe("Tarlan");
  });

  it("preserves explicitly set custom author name", async () => {
    mockProfiles.set("user-tarlan", {
      id: "user-tarlan",
      first_name: "Tarlan",
    });

    const posts = [
      {
        id: 2406,
        profile_id: "user-tarlan",
        post_name: "Lentils",
        author_name: "Special Guest",
      },
    ];

    const result = await enrichPostsWithAuthors(posts);

    expect(result[0].author_name).toBe("Special Guest");
  });

  it("enriches single post via enrichSinglePostWithAuthor", async () => {
    mockProfiles.set("user-tarlan", {
      id: "user-tarlan",
      first_name: "Tarlan",
      avatar_url: "https://example.com/tarlan.png",
    });

    const post = {
      id: 2733,
      profile_id: "user-tarlan",
      post_name: "Banana",
    };

    const result = await enrichSinglePostWithAuthor(post);

    expect(result).not.toBeNull();
    expect(result?.author_name).toBe("Tarlan");
    expect(result?.author_avatar_url).toBe("https://example.com/tarlan.png");
  });

  it("handles database errors gracefully without throwing", async () => {
    mockError = { message: "Database connection failed" };

    const posts = [
      {
        id: 2733,
        profile_id: "user-tarlan",
        post_name: "Banana",
      },
    ];

    const result = await enrichPostsWithAuthors(posts);

    // Returns unmodified posts without throwing
    expect(result[0].id).toBe(2733);
    expect(result[0].author_name).toBeUndefined();
  });
});
