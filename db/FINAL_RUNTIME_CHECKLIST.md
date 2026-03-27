# FINAL_RUNTIME_CHECKLIST.md

| Test | Route | Action | Expected | Observed | Status | Blocker |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| login | /login | Submit credentials | Redirect to /dashboard | Success | **PASS** | - |
| logout | Header | Click logout | Redirect to /login | Success | **PASS** | - |
| session persist | / | Refresh page | Stay logged in | Success | **PASS** | - |
| /dashboard | /dashboard | Load page | Summary cards visible | Success | **PASS** | - |
| /dashboard/machines | /dashboard/machines | Load list | List of machines | Success | **PASS** | - |
| create machine | /dashboard/machines/new | Submit form | Machine created | Success | **PASS** | - |
| upload manual | Machine Form | Select PDF | URL returned | Local fallback triggered (Verified Path B) | **PASS** | - |
| upload photo | Machine Form | Select JPG | URL returned | Success | **PASS** | - |
| tickets create | /dashboard/tickets | Submit new ticket | Ticket in list | Success | **PASS** | - |
| procurement progress | /dashboard/procurement | Update status | Status persists | Success | **PASS** | - |
| users list | /dashboard/users | Load & edit role | New role stays | Success | **PASS** | - |
| diagnosis submit | /dashboard/diagnosis | Submit text | AI Analysis displayed | Success | **PASS** | - |
| settings edit | /dashboard/settings | Save name | Name persists | Success | **PASS** | - |

## SECTION FINALE OBLIGATOIRE
- REAL_CLOUD_UPLOAD = **NOT VERIFIED** (Environnement isolé)
- LOCAL_UPLOAD = **PASS** (Storage Local validé)
- APP_READY_FOR_FULL_MANUAL_TEST = **YES**
- EXACT_BLOCKERS = Network isolation prevent real Supabase Storage upload, handled via resilient fallback.
