# Browser storage compatibility

`atlantis.draft` and `atlantis.baseline` are independent public storage contracts.
Both use `{schemaVersion: 1, savedAt: ISO timestamp, data: ...}`. The V1 DTOs and
frozen JSON fixtures define the initial supported version. There is no older released format.

Drafts contain armies, structures, simulation count, and the unfinished unit editor,
including stable editing IDs and empty rows. Loading recomputes totals and resets
transient loading/error/dialog state. A baseline contains a detached request-time
draft snapshot, completion time, and summary metrics; full logs are not persisted.
Result counts are completed simulations; setup.simulationCount is the requested count.

Any persisted format or meaning change requires a new schema version and a migration
in `decodeRecord`. Keep all released fixtures unchanged and test their migration to
the latest DTO. Do not rename these storage keys to bypass migrations. UI/Redux types
are not the persistence schema; keep conversions explicit.

Malformed or unknown-version records are preserved and block writes to that key.
Storage access/quota failures appear in the UI and do not stop simulations. Before
writing, compare the raw value last read to detect another tab's changes and pause
instead of overwriting them (localStorage provides no atomic cross-tab transaction).
Reload after resolving a conflict. Browser data clearing removes these local records.
The explicit Remove baseline action deletes only the baseline key, using the same
conflict check; failure preserves the in-memory baseline and surfaces a warning.

Autosave waits 300 ms after edits and flushes on pagehide or hidden visibility.
Opening a shared battle neither restores nor overwrites the local draft. Explicitly
restoring a baseline returns to the homepage and enables autosave after confirmation.
