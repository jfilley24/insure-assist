---
description: ACORD Processing Business Rules
---

# Core Business Rules for ACORD Processing

When evaluating or interacting with insurance policies across the platform:

1. **LATEST POLICY ONLY**: When evaluating client policies for any global alerting (Expirations, Missing Fields, Compliance), the system MUST strictly filter its queries to evaluate only the single most recently uploaded document for a given `clientId` + `fileType` combination (e.g. the newest Auto policy). 
   - *Reasoning*: Historic policies are retained for audit trails but must be excluded from active workflow alerts to prevent spamming users with alerts about actual old policies that are no longer relevant.
   - *Implementation Strategy*: Use Prisma `findMany` with `distinct: ['clientId', 'fileType']` and `orderBy: { uploadedAt: 'desc' }`.
