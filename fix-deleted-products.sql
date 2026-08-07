-- Fix any products that were manually deleted without setting is_active=0
-- This ensures deleted products don't show in search dropdown

-- Check current status
SELECT 'Products with is_active != 0 or 1:' as info;
SELECT id, name, is_active 
FROM products 
WHERE is_active NOT IN (0, 1);

-- If you want to manually check a specific product:
SELECT id, name, is_active 
FROM products 
WHERE name LIKE '%test%';

-- To fix products that should be deleted (run this if needed):
-- UPDATE products SET is_active = 0 WHERE name IN ('product1', 'product2');
