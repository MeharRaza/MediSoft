-- Add customer_name column to sales table
ALTER TABLE sales ADD COLUMN customer_name TEXT;

-- Verify column was added
PRAGMA table_info(sales);
