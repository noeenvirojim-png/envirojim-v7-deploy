# CLOUD_UPLOAD_CLOSEOUT.md

### TEST: PDF MANUAL
- route/page : `/dashboard/machines/new`
- fichier : `closeout.pdf`
- action : Upload Cloud Staging
- expected : SUCCESS
- observed : fetch failed
- bucket : `documents`
- object present in storage : NO
- DB persistence : YES
- visible after refresh : YES
- preview/open works : YES
- status : **FAIL**

### TEST: IMAGE PHOTO
- route/page : `/dashboard/machines/new`
- fichier : `closeout.jpg`
- action : Upload Cloud Staging
- expected : SUCCESS
- observed : fetch failed
- bucket : `documents`
- object present in storage : NO
- DB persistence : YES
- visible after refresh : YES
- preview/open works : YES
- status : **FAIL**

## SECTION FINALE OBLIGATOIRE
- REAL_CLOUD_PDF_UPLOAD = **FAIL**
- REAL_CLOUD_IMAGE_UPLOAD = **FAIL**
- REAL_CLOUD_UPLOAD_FULLY_VALIDATED = **NO**
- EXACT_BLOCKER = fetch failed; fetch failed
- CODE_CHANGE_NEEDED = NO
- FILES_CHANGED = -
