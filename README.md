# Elsewhere

A browser-based spending and relocation calculator for 16 major US cities.

Serve `dist/` with any static HTTP server. No build or runtime dependencies are needed. The page uses ES modules and native HTML dialogs.

Manual budgets, CSV transaction review, and city comparisons are processed entirely in the current browser tab. No financial data is stored or sent to a server. Refreshing resets the example. Plaid is a future integration.

The model uses the fixed Numbeo 2026 North America snapshot cited in the app: category indices for rent, groceries, and restaurants, and the general index as a proxy for other variable costs. Fixed costs do not scale. Roommates use an adjustable planning factor, not a measured statistic. Actual rent overrides replace the estimate. Scenario bands of ±15% are not statistical confidence intervals.

CSV import supports quoted commas, escaped quotes, UTF-8 BOM, positive/negative spending conventions, column mapping, manual recategorization, transfer exclusions, and a user-specified count of complete months. Only included spending is averaged; importing replaces the current budget. PDFs, currencies other than USD, and live bank connections are not supported.
