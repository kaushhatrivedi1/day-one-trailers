# Sign library (not in git)

Clips here are loaded by `backend/tools/import-asllvd.mjs` and are **not committed**:
ASLLVD (Boston University) clips "cannot be redistributed without permission".
Only run the importer after you have written permission (see `docs/asllvd-permission-email.md`).

Layout: `library.json` maps each ASL gloss to a clip file, e.g.
`{ "source": "ASLLVD", "credit": "...", "signs": { "WORK": { "file": "clips/WORK.mp4" } } }`.
Letter clips named `FS-A` ... `FS-Z` enable fingerspelling of missing words.
