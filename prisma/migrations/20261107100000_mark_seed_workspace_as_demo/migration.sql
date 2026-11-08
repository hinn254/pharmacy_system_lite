UPDATE "Organization"
SET "isDemo" = true,
    "demoExpiresAt" = NULL
WHERE "slug" = 'main-pharmacy';
