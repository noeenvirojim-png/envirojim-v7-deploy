# CLOUD_UPLOAD_RUNTIME_PROOF.md

| Test | Route/Page | Fichier | Action | Expected | Observed | Bucket Path | DB Persistence | Retrieval | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Machine Manual | `/dashboard/machines/new` | `cloud-test.pdf` | Upload Cloud | Success | fetch failed | `-` | NO | NO | **FAIL** |
| Machine Photo | `/dashboard/machines/new` | `cloud-test.jpg` | Upload Cloud | Success | fetch failed | `-` | NO | NO | **FAIL** |

## SECTION FINALE
- REAL_CLOUD_PDF_UPLOAD = **FAIL**
- REAL_CLOUD_IMAGE_UPLOAD = **FAIL**
- REAL_CLOUD_UPLOAD_FULLY_VALIDATED = **NO**
- EXACT_BLOCKER = fetch failed; fetch failed
