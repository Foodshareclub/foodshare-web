import { assertEquals } from "@std/assert";
import { getSecret, getSecretSync } from "../_shared/vault.ts";
import { VAULT_PRELOAD_NAMES } from "../_shared/vault-secret-names.ts";
Deno.test("application workers cannot load R2 backup credentials", async () => {
  const old = Deno.env.get("R2_ACCESS_KEY_ID");
  Deno.env.set("R2_ACCESS_KEY_ID", "never-expose-backup-fixture");
  try {
    assertEquals(await getSecret("R2_ACCESS_KEY_ID"), undefined);
    assertEquals(getSecretSync("R2_ACCESS_KEY_ID"), undefined);
    assertEquals(
      VAULT_PRELOAD_NAMES.some((name) => name.startsWith("R2_")),
      false,
    );
  } finally {
    if (old === undefined) Deno.env.delete("R2_ACCESS_KEY_ID");
    else Deno.env.set("R2_ACCESS_KEY_ID", old);
  }
});
