-- Clear today's sales, purchases, and returns for fresh testing

-- Get today's date
.mode column
.headers on

SELECT 'TODAY:', date('now');

-- Show what will be deleted
SELECT 'Today''s Sales:' as info, COUNT(*) as count FROM sales WHERE date(created_at) = date('now');
SELECT 'Today''s Sale Items:' as info, COUNT(*) as count FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE date(created_at) = date('now'));
SELECT 'Today''s Purchases:' as info, COUNT(*) as count FROM purchases WHERE date(created_at) = date('now');
SELECT 'Today''s Returns:' as info, COUNT(*) as count FROM sale_returns WHERE date(created_at) = date('now');

-- Delete today's data
DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE date(created_at) = date('now'));
DELETE FROM sales WHERE date(created_at) = date('now');
DELETE FROM sale_return_items WHERE return_id IN (SELECT id FROM sale_returns WHERE date(created_at) = date('now'));
DELETE FROM sale_returns WHERE date(created_at) = date('now');
DELETE FROM purchases WHERE date(created_at) = date('now');

-- Reset purchase_items qty_sold to 0 for all products
UPDATE purchase_items SET qty_sold = 0;

-- Verify
SELECT 'After cleanup - Sales:' as info, COUNT(*) as count FROM sales WHERE date(created_at) = date('now');
SELECT 'After cleanup - Purchases:' as info, COUNT(*) as count FROM purchases WHERE date(created_at) = date('now');
