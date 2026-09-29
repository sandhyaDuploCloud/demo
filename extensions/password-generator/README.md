# Password Generator extension

A DuploCloud platform extension that generates a cryptographically random password from user
preferences (length, symbols) and rates its strength.

- **Provisioning mode:** Worker (pure compute). Generation is deterministic in-process work with no
  cloud object and no LLM, so there is no provisioning skill and no agent ticket. The delete/drift
  seams are genuine no-ops — nothing exists outside this resource's own Mongo document.
- **REST route:** `…/environment/extensions/password-generators`
- **Mongo collection:** `extension_passwordgenerator`
- **Left-nav:** Tools → Password Generators

## Spec

| Field | Type | Required | Notes |
|---|---|---|---|
| `label` | string | required | What the password is for, e.g. "GitHub Token" |
| `length` | int | optional | Defaults to 16; clamped to 8–128 |
| `includeSymbols` | bool | optional | Defaults to true |

## Result

| Field | Type |
|---|---|
| `label` | string |
| `password` | string (masked in the UI behind a reveal toggle) |
| `passwordLength` | int |
| `strength` | string — Weak / Medium / Strong |
| `includesSymbols` | bool |
| `generatedAt` | datetime (UTC) |

Upper case, lower case and digits are always in the character set; symbols are added when enabled. The
generator guarantees at least one character from each enabled class, then shuffles with the crypto RNG.
Strength is rated from entropy (`length × log2(alphabet)`): < 60 bits Weak, < 90 bits Medium, else Strong.

## Security note

The generated password is stored in plaintext in the extension's Mongo collection and is readable by
anyone with read access to the resource. The UI masks it behind a click-to-reveal, which protects
against shoulder-surfing, not against authorized reads. It is not a substitute for a secrets manager.

## Build

    export DUPLO_TARGET=remote
    bash scripts/build-extension.sh password-generator   # from the repo root
