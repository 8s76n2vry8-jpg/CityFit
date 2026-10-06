# CityFit

A spending and relocation calculator for 16 US cities, with account-specific merchant categorization for PDF and CSV statements.

## Run and publish

Requires Node 22.13 or later. Run `npm ci`, `npm run db:generate` after a schema change, `npm run build`, then `npm test`. The build bundles `worker/index.js` to `dist/server/index.js` and embeds the existing files in `dist/` so the PDF reader and app assets stay self-contained. Do not edit the generated Worker or generated asset module. Sites owns the production D1 binding `DB` and applies committed Drizzle migrations before deploying. The existing Site ID and access policy are preserved.

The frontend remains native HTML, CSS, and JavaScript modules. The vendored Mozilla PDF.js 6.4.299 legacy library and its Apache 2.0 license are unchanged.

## Accounts and privacy

Create an account with a username, email, and password of 12–128 characters. Sign in using either username or email, with case-insensitive identifiers. Passwords use salted scrypt (`N=32768, r=8, p=3`, 32-byte hash); plaintext passwords are never stored. Hashing is serialized within an isolate to bound memory. Sessions use random 256-bit tokens, store only the token hash, expire after seven days, and can be revoked by signing out. Cookies are Secure, HttpOnly, SameSite=Lax, and host-scoped. Write APIs check the request origin. Auth attempts are limited by IP and identifier.

Merchant corrections are stored in D1 under the app's authenticated user ID. Every correction query derives the owner from the server-side session; client-supplied user IDs are ignored. Forgetting a rule removes it from future matching. Split purchases do not teach a single merchant category. Mixed retailers default to not remembering a category unless the user opts in.

PDF/CSV files, extracted statement text, transaction lists, and budgets stay in the current browser tab. Only accounts and remembered merchant/category rules are saved. Refreshing resets the budget. Signing out clears the current transaction review. Optional AI review sends selected ambiguous transaction descriptors, amount, date, and available location to OpenAI; it never uploads the entire statement.

Password recovery, email verification, and expanded sign-in options are tracked in [Parking Lot](docs/PARKING_LOT.md). No email ownership verification is currently performed. The Site retains its current private audience.

## Categorization

Both PDF and CSV use `dist/merchant-engine.js`:

1. Keep the original statement descriptor and normalize processor prefixes, card noise, store numbers, and supported city/state suffixes.
2. Apply the user's saved rules and a deterministic dictionary of known merchants. Transfer/credit exclusions are handled separately.
3. Match spelling variants conservatively, using minimum similarity and separation from the next candidate. Short names and ambiguous variants do not use unrestricted substring matching.
4. Accept supplied cleaned merchant names, MCCs, and provider category hints. CSV recognizes optional `date`, `merchant name`, `mcc`, and `location` columns. Future bank adapters can use the same engine; no bank or Stripe integration is connected yet.
5. Optionally request AI for unresolved or low-confidence merchants. Known merchants, credits, and mixed retailers are not overwritten by AI. Responses are constrained to CityFit categories and validated before application.
6. Review: 90%+ matches are automatic; 70–89% require confirmation; below 70% remain unassigned with a suggestion. Scores are heuristic match strength or model-reported confidence, not a measured probability of correctness.
7. Save optional merchant corrections to the account. Review shows the cleaned merchant, exact charge cents, reason/source, and expandable original statement details.

Mixed stores including Walmart, Target, Costco, Amazon, CVS, and Walgreens need a user choice or split. Split amounts must be positive, use whole cents, and total the original charge exactly. Saving is blocked until unresolved categories, suggestions, and invalid split totals are reviewed. Credits and transfers can remain excluded. CSV opposite-sign rows are skipped; PDF credit sections and CR amounts are explicitly excluded.

AI is implemented at `/api/categorize` but **inactive until a server-side `OPENAI_API_KEY` is configured**. `OPENAI_MODEL` optionally selects the model (default `gpt-4.1-mini`). Use the OpenAI Developers connection and Sites secrets; never put a key in source or the browser. The endpoint uses the Responses API with structured output and `store:false`, a 25-row limit, per-account request limits, and timeout handling. Outages leave manual review available.

## Categories and city estimates

Fourteen categories: Housing, Groceries, Dining & Coffee, Transportation, Travel, Shopping, Entertainment, Health & Fitness, Personal Care, Utilities, Subscriptions, Insurance, Pets, and Miscellaneous. Stable IDs retain `rent`, `dining`, and `transport`. Old CSV category `fixed` maps to Miscellaneous; old combined categories should be reviewed on import.

The fixed Numbeo 2026 North America snapshot supplies housing, groceries, and restaurant price indices. The general index is a rough proxy for other local variable costs. Travel, subscriptions, insurance, and miscellaneous stay fixed. Shared housing uses an adjustable planning factor; actual-rent overrides replace the estimate. Moving costs, income changes, taxes, and neighborhoods are not modeled. The ±15% scenario band is not a confidence interval. Category rows show signed estimated monthly changes, with savings in green.

CSV supports quoted commas, escaped quotes, BOM, column mapping, sign conventions, manual categories, and complete-month averaging. PDF supports text statements up to 10 MB / 75 pages, coordinate-based rows, amount selection, credit handling, manually added missing rows, and a required statement check. Scanned or protected PDFs need another export. USD only; OCR is not supported.

## Validation

Tests use isolated SQLite behind the D1 interface and a DOM integration test. They cover password storage, sign-up, email/username login, account isolation, sessions, logout, CSRF, rate limits, normalization, aliases, false/fuzzy matches, mixed stores, MCCs, thresholds, AI validation, PDF/CSV consistency, descriptors, splits, and account → CSV review → saved rule → budget. No real statements or real passwords are included.
