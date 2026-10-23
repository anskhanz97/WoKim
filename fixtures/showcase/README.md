# WoKim showcase snapshot

This directory contains the portable, versioned showcase dataset:

- `database.sql`: all showcase projects, tasks, entries, OCR text, evidence, check-ins, people, teams, and relationships.
- `private/originals`: the three source images used by attachment records.
- `private/thumbnails`: the matching generated thumbnails.
- `manifest.json`: integrity hashes checked before restoration.

Because the GitHub repository is public, the copied live owner and browser sessions were removed. The snapshot uses the local-only demonstration login below:

- Email: `showcase@wokim.local`
- Password: `WokimShowcase2026!`

Never reuse these credentials for a public or production installation.

Restore the snapshot with `npm run db:restore:showcase`. The runtime database and private storage are created under `storage/` on the D: drive and remain ignored by Git.
