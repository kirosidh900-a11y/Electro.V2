# Utility Scripts

This directory contains one-time utility and migration scripts for the application.

## Available Scripts

### fix-cod-payments.js
Fixes COD (Cash on Delivery) orders that are delivered but still have pending payment status.

**Usage:**
```bash
node src/utils/scripts/fix-cod-payments.js
```

**What it does:**
- Finds all COD orders with status 'delivered' but payment status 'pending'
- Updates their payment status to 'paid' and sets the paidAt timestamp
- Logs the number of orders updated and their order numbers

**When to use:**
- After discovering data inconsistencies in COD payments
- As a one-time migration after fixing the COD payment logic
- Before generating financial reports to ensure accurate data

**Prerequisites:**
- Ensure MONGODB_URI environment variable is set
- Backup your database before running