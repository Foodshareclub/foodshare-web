-- Re-baseline device records whose trust was granted by the retired
-- DeviceCheck and SafetyNet paths.
--
-- Both were client-selectable request types that produced a trusted device
-- record without any verification behind it:
--
--   * DeviceCheck accepted any base64 string of at least 50 characters and
--     returned `verified: true, trustLevel: 'trusted'`. DeviceCheck is an
--     opaque one-time token — there is nothing to check locally without a
--     round trip to `api.devicecheck.apple.com` authenticated with a private
--     key this server does not hold. `POST /ios` with
--     `{"type":"device_check","token":"<any 50 bytes>"}` bought a trusted
--     device record.
--   * SafetyNet parsed the JWT payload with no signature verification, so a
--     hand-written `{"ctsProfileMatch":true}` passed. Google retired the
--     SafetyNet Attestation API and required migration to Play Integrity by
--     June 2024; verifying tokens from a stopped API is theatre.
--     `POST /android` with `{"type":"safetynet","integrityToken":"<forged>"}`
--     bought a trusted device record.
--
-- Both were fixed in dae88c6d (DeviceCheck fails closed, SafetyNet is
-- retired and always refuses), but records written before that carry trust
-- they did not earn. They are recoverable by signature, and the signatures
-- cannot match an earned record:
--
--   * DeviceCheck — `platform = 'ios'`, `public_key IS NULL`, and a
--     `key_id` of exactly 32 lowercase hex characters. The key_id is the
--     first 32 hex characters of the token's SHA-256, and the path stored
--     no public key. App Attest key ids are Apple-generated base64url (44
--     characters, never all-hex) and always carry the attested public key,
--     so an earned iOS record never matches.
--   * SafetyNet — `platform = 'android'`, verified, with no verdicts in
--     `flags`. Play Integrity, the only other Android path, always writes
--     verdicts, so an earned Android record never matches.
--
-- The re-baseline sets `trust_level = 'unknown'` and
-- `attestation_verified = false` — the device has not proven itself, and
-- can earn trust again by attesting through App Attest or Play Integrity,
-- both of which now verify for real. What it changed is recorded on the
-- row under `flags.rebaselined`, so the operation is reversible and
-- auditable. The WHERE clause makes a second run a no-op: a re-baselined
-- row is no longer `attestation_verified`.

-- DeviceCheck: any 50-byte token bought 'trusted'.
UPDATE public.device_attestations
SET trust_level = 'unknown',
    attestation_verified = false,
    flags = flags || jsonb_build_object(
        'rebaselined', jsonb_build_object(
            'at', now(),
            'reason', 'device_check',
            'from_trust_level', trust_level,
            'from_attestation_verified', attestation_verified
        )
    ),
    updated_at = now()
WHERE platform = 'ios'
  AND public_key IS NULL
  AND key_id ~ '^[0-9a-f]{32}$'
  AND attestation_verified = true
  AND trust_level IN ('trusted', 'verified');

-- SafetyNet: a forged JWT bought 'trusted'.
UPDATE public.device_attestations
SET trust_level = 'unknown',
    attestation_verified = false,
    flags = flags || jsonb_build_object(
        'rebaselined', jsonb_build_object(
            'at', now(),
            'reason', 'safetynet',
            'from_trust_level', trust_level,
            'from_attestation_verified', attestation_verified
        )
    ),
    updated_at = now()
WHERE platform = 'android'
  AND attestation_verified = true
  AND trust_level IN ('trusted', 'verified')
  AND (flags -> 'verdicts' IS NULL OR flags -> 'verdicts' = 'null'::jsonb);
