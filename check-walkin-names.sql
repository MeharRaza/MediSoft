-- Check for walk-in customer names in sales table
SELECT DISTINCT customer_name, COUNT(*) as usage_count
FROM sales
WHERE customer_name IS NOT NULL
  AND customer_id IS NULL
  AND customer_name != ''
GROUP BY customer_name
ORDER BY id DESC
LIMIT 20;
