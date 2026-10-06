# CityFit

A browser-based spending and relocation calculator for 16 major US cities.

Serve `dist/` with any static HTTP server. No build step is needed. The vendored PDF.js 6.4.299 official legacy compatibility library reads PDF text using a local worker; its Apache 2.0 license is included in dist/vendor. The page uses ES modules and native HTML dialogs.

Manual budgets, CSV transaction review, and city comparisons are processed entirely in the current browser tab. No financial data is stored or sent to a server. Refreshing resets the example. Plaid is a future integration.

The model uses the fixed Numbeo 2026 North America snapshot cited in the app: category indices for rent, groceries, and restaurants, and the general index as a proxy for other variable costs. Fixed costs do not scale. Roommates use an adjustable planning factor, not a measured statistic. Actual rent overrides replace the estimate. Scenario bands of ±15% are not statistical confidence intervals.

CSV import supports quoted commas, escaped quotes, UTF-8 BOM, positive/negative spending conventions, column mapping, manual recategorization, transfer exclusions, and a user-specified count of complete months. Only included spending is averaged; importing replaces the current budget. PDF import supports text-based statements up to 10 MB and 75 pages. It reconstructs text rows, recognizes dated transactions, allows selecting the amount position and meaning of negative amounts, and provides editable descriptions, amounts, categories, raw extracted text, and manually added missing rows. Users must confirm review before saving a PDF budget. The import dialog has an always-visible Save to budget button, read-success feedback, a disabled-state explanation, and a visible budget-saved confirmation. Saving applies data to the current browser tab; it does not provide cross-session persistence. Scanned/image-only and password-protected PDFs show actionable errors. Currencies other than USD, OCR, and live bank connections are not supported.

The main CityFit view uses an interactive spending donut, city comparison tiles, and paired category bars. Hover or keyboard focus reveals precise amounts; click/tap opens category editing. City double-click and See the numbers open a detailed comparison. Full monthly spending and rent are edited in focused dialogs. PDF/CSV import and save confirmations are preserved.
