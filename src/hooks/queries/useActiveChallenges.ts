/**
 * Active Challenges Query Hook
 *
 * Fetches the current user's active (uncompleted) challenges
 */

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface ActiveChallenge {
  id: number;
  challengeId: number;
  title: string;
  description: string;
  difficulty: string;
  score: number;
  image: string;
  acceptedAt: string;
}

export const activeChallengesKeys = {
  all: ["active-challenges"] as const,
  list: () => [...activeChallengesKeys.all, "list"] as const,
};

async function fetchActiveChallenges(): Promise<ActiveChallenge[]> {
  const res = await fetch("/api/challenges/active");
  if (!res.ok) {
    if (res.status === 401) return [];
    throw new Error("Failed to fetch active challenges");
  }
  return res.json();
}

async function completeChallenge(challengeId: number): Promise<{ success: boolean }> {
  const res = await fetch("/api/challenges/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeId }),
  });
  if (!res.ok) throw new Error("Failed to complete challenge");
  return res.json();
}

export function useActiveChallenges() {
  return useQuery({
    queryKey: activeChallengesKeys.list(),
    queryFn: fetchActiveChallenges,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useCompleteChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: completeChallenge,
    onMutate: async (challengeId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: activeChallengesKeys.list() });

      // Snapshot previous value
      const previous = queryClient.getQueryData<ActiveChallenge[]>(activeChallengesKeys.list());

      // Optimistically remove the completed challenge
      queryClient.setQueryData<ActiveChallenge[]>(activeChallengesKeys.list(), (old) =>
        old?.filter((c) => c.challengeId !== challengeId)
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(activeChallengesKeys.list(), context.previous);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: activeChallengesKeys.all });
      queryClient.invalidateQueries({ queryKey: ["challenge-leaderboard"] });
    },
  });
}
