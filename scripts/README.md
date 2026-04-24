# Maintenance Scripts

## promote-admin.ts
Promotes an existing user to Super Admin role.
Usage:
  npx tsx scripts/promote-admin.ts <email>
Requires MONGODB_URI and ADMIN_SECRET_KEY in .env

## cleanup-test-user.ts
Removes a test user account from the database.
Usage:
  npx tsx scripts/cleanup-test-user.ts <email>
Requires MONGODB_URI in .env
