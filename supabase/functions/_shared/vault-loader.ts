interface SecretEntry {
  name: string;
  decrypted_secret: string;
}
interface Result<T> {
  data: T | null;
  error: unknown;
}

/** Keep a corrupt ciphertext row from hiding every other readable secret. */
export async function readVaultEntries(
  secretNames: readonly string[],
  read: (name: string) => PromiseLike<Result<string>>,
): Promise<{ entries: SecretEntry[]; unreadable: number }> {
  const names = [...new Set(secretNames.filter(Boolean))];
  const entries: SecretEntry[] = [];
  let unreadable = 0;
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(8, names.length) }, async () => {
    while (next < names.length) {
      const name = names[next++];
      try {
        const result = await read(name);
        if (result.error) unreadable++;
        else if (result.data) entries.push({ name, decrypted_secret: result.data });
      } catch {
        unreadable++;
      }
    }
  }));
  return { entries, unreadable };
}
