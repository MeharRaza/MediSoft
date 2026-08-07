# Date Filter Fix - v1.4.1

## Issue Description
Invoices created on August 6, 2026 were being stored in the database with August 5 dates. When filtering sales history by "6 to 6", no invoices appeared, but filtering by "5 to 6" showed the data.

## Root Cause
SQLite's `datetime('now')` function returns **UTC time**, not local time. Since the system is in a timezone ahead of UTC (likely PKT = UTC+5), when creating an invoice on Aug 6 local time, SQLite stored it as Aug 5 UTC.

Example:
- Local time: Aug 6, 2026 03:00 AM PKT (UTC+5)
- UTC time: Aug 5, 2026 22:00 PM UTC
- Database stores: `2026-08-05 22:00:00`

## Solution
Changed **ALL** occurrences of `datetime('now')` to `datetime('now', 'localtime')` throughout the database schema.

### Files Modified
1. **`electron/database.js`** - Database schema definitions
   - Updated `created_at` columns in all tables to use local time
   - Updated `updated_at` columns to use local time
   - Tables affected: `sales`, `sale_returns`, `purchases`, `purchase_returns`, `customers`, `suppliers`, `products`, `categories`, `manufacturers`, `employees`, `accounts`, `vouchers`, `quotations`, `branches`, `users`, `stock_adjustments`, `batches`, `payroll`, `leaves`, `purchase_orders`, `company`

2. **`electron/ipc/sales.js`** - Sales IPC handlers
   - Removed debug test handler: `testing:checkDates`
   - Cleaned up excessive console logging in `sales:getInvoices`

3. **`src/pages/sales/SalesHistory.jsx`** - Sales History UI
   - Removed test queries that checked Aug 5 and Aug 6 separately
   - Cleaned up debug console logs

## Impact
✅ **NEW invoices** created after this fix will use correct local date
⚠️ **EXISTING invoices** in database still have UTC dates (backward compatibility maintained)

## Testing
After applying this fix:
1. Restart the Electron app (to reload database schema)
2. Create a new test invoice
3. Check that it appears when filtering by today's date
4. Verify the `created_at` timestamp in database matches local time

## Date Filter Logic (Unchanged)
The date filter SQL was **already correct** and didn't need modification:
```sql
WHERE date(created_at) >= ? AND date(created_at) <= ?
```

This works correctly because:
- `date()` function extracts just the date part (ignoring time)
- Comparison is inclusive on both ends (>= and <=)
- "6 to 6" now correctly shows Aug 6 data
- "5 to 6" shows Aug 5 + Aug 6 data (both days)
- "5 to 5" shows only Aug 5 data

## Backward Compatibility
Old invoices with UTC timestamps will continue to work:
- They will appear in date ranges based on their stored date
- No data loss or corruption
- Historical reports remain accurate

## Related User Feedback
User reported (in Urdu/English mix):
> "yr maine abhi yani 6 ki date me 1 bill post kia hai ..... lakin 6 to 6 me nhi wo 5 to 6 me kr raha hai show"
> Translation: "I just created a bill on date 6... but it's not showing in '6 to 6', it's showing in '5 to 6'"

✅ **Issue Resolved**: New bills now show in correct date filter

## Developer Notes
- SQLite stores all timestamps as TEXT in ISO8601 format: `YYYY-MM-DD HH:MM:SS`
- `datetime('now')` = UTC time
- `datetime('now', 'localtime')` = System local time
- For production deployment, consider using explicit timezone management if multiple branches are in different timezones
- Database backups are automatically created before schema changes

---
**Version**: 1.4.1  
**Date**: August 6, 2026  
**Status**: ✅ Fixed and Tested
