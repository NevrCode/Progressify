# Free Exercise DB attribution

Progressify's generated in-app exercise catalog is derived from
[Free Exercise DB](https://github.com/yuhonas/free-exercise-db), maintained by
the Free Exercise DB contributors.

- Source dataset: `dist/exercises.json`
- Upstream license: [The Unlicense](https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md)
- Upstream description: an open public-domain exercise dataset
- Local generation command: `npm run catalog:build`

The generated catalog keeps source provenance in its metadata. Progressify
currently includes strength-category records and their textual metadata. It does
not copy the upstream image files; it only preserves relative image paths for a
possible later media-delivery implementation.

Although attribution is not required by the Unlicense, this notice is retained
for transparency and maintainability.
