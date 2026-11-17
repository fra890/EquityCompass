# Grant Explorer

`grant-explorer.html` is a single, self-contained page (no CDNs, works offline). Open it in a browser and drop in a
Shareworks "Vesting Summary" `.xlsx` (or a CSV of the vesting details). Nothing is uploaded, stored, or embedded.

## Verify

Client exports are never committed. Pass the path to one:

    python3 test/handcheck.py "<Vesting Summary.xlsx>" /tmp/expected.json   # grant table, reconciliation, 3 hand-checked numbers
    npm i --no-save jsdom && node test/smoke.cjs "<Vesting Summary.xlsx>" /tmp/expected.json

## Tax constants

Tax year 2026. Federal figures are from Rev. Proc. 2025-32. The California schedule is the 2025 FTB schedule indexed
by FTB's 3.4% factor for 2026; confirm against ftb.ca.gov and re-verify all constants each tax year.
