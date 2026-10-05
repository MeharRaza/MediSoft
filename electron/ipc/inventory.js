const db = require('../database')

module.exports = (ipcMain) => {

  ipcMain.handle('inventory:getProducts', (_, filters = {}) => {
    console.log('🔍 getProducts called with filters:', JSON.stringify(filters))
    
    let q = `
      SELECT p.id, p.barcode, p.name, p.generic_name as company_name, p.category_id, 
             p.manufacturer_id, p.rack_location, p.pcs_in_pack, p.sale_price, p.trade_price, 
             p.alert_qty, p.is_active, p.created_at, p.updated_at,
             c.name as category_name,
        COALESCE((
          SELECT SUM(pi.qty - pi.qty_sold) 
          FROM purchase_items pi 
          WHERE pi.product_id = p.id
        ), 0) as stock,
        
        -- Priority scoring for better search ranking
        CASE 
          WHEN ? IS NULL THEN 999
          WHEN LOWER(p.name) = LOWER(?) THEN 1
          WHEN LOWER(p.name) LIKE LOWER(?) THEN 2
          ELSE 3
        END as search_priority
        
      FROM products p
      LEFT JOIN categories c ON c.id=p.category_id
      WHERE 1=1`
    const params = []
    
    // If no search and no loadAll flag, return empty (prevent auto-loading)
    if (!filters.search && !filters.loadAll) {
      console.log('⚠️ No search query and no loadAll flag - returning empty array')
      return []
    }
    
    if (filters.search) {
      q += ` AND (
        LOWER(p.name) LIKE LOWER(?) 
        OR p.barcode LIKE ? 
        OR LOWER(p.generic_name) LIKE LOWER(?)
        OR LOWER(REPLACE(p.name, ' ', '')) LIKE LOWER(REPLACE(?, ' ', ''))
      )`
      const searchPattern = `%${filters.search}%`
      const startsWithPattern = `${filters.search}%`
      
      // Add params for priority scoring
      params.push(filters.search, filters.search, startsWithPattern)
      
      // Add params for WHERE conditions
      params.push(searchPattern, searchPattern, searchPattern, searchPattern)
      console.log(`🔍 Searching products with pattern: "${searchPattern}"`)
    } else {
      // No search - add null params for priority scoring
      params.push(null, null, null)
    }
    
    if (filters.category_id) { q += ' AND p.category_id=?'; params.push(filters.category_id) }
    if (filters.is_active !== undefined) { q += ' AND p.is_active=?'; params.push(filters.is_active) }
    
    // Order by priority first, then name
    q += ' ORDER BY search_priority ASC, p.name ASC'
    
    const results = db.prepare(q).all(...params)
    console.log(`✅ Found ${results.length} products`)
    if (results.length > 0 && results.length <= 5) {
      console.log('📋 Results:', results.map(r => ({ id: r.id, name: r.name, stock: r.stock })))
    }
    return results
  })

  ipcMain.handle('inventory:searchProduct', (_, q) => {
    console.log(`🔍 [BACKEND] Searching for product: "${q}"`)
    
    // FIFO Logic WITHOUT batch system
    // Get oldest unsold purchase entry with stock > qty_sold
    // Expire zone = 180 days (6 months)
    const expireZoneDate = new Date()
    expireZoneDate.setDate(expireZoneDate.getDate() + 180)
    const expireZoneDateStr = expireZoneDate.toISOString().split('T')[0]
    
    console.log(`📅 Expiry cutoff date: ${expireZoneDateStr}`)
    
    // DEBUG: Check is_active status
    const activeCheck = db.prepare(`
      SELECT id, name, is_active 
      FROM products 
      WHERE LOWER(name) LIKE LOWER(?)
    `).all(`%${q}%`)
    console.log(`📊 [DEBUG] All products matching "${q}":`)
    activeCheck.forEach(p => {
      console.log(`  - ${p.name}: is_active=${p.is_active}`)
    })
    
    // IMPROVED SEARCH with priority ordering and fuzzy matching
    // Priority: 1. Starts with query, 2. Contains query
    const results = db.prepare(`
      SELECT p.id, p.barcode, p.name, p.generic_name as company_name, p.category_id,
             p.rack_location, p.pcs_in_pack, p.sale_price, p.trade_price, p.is_active,
             c.name as category_name,
        
        -- Total stock across all purchases (purchased - sold)
        -- Include oversold batches (negative remaining) in calculation
        COALESCE((
          SELECT SUM(pi.qty - pi.qty_sold) 
          FROM purchase_items pi 
          WHERE pi.product_id = p.id
        ), 0) as stock,
        
        -- Active purchase entry (FIFO by EXPIRY DATE - oldest expiry first)
        (SELECT pi.id FROM purchase_items pi 
         JOIN purchases pu ON pu.id = pi.purchase_id
         WHERE pi.product_id = p.id 
         AND pi.qty > pi.qty_sold
         AND (pi.expiry_date IS NULL OR pi.expiry_date >= date('now'))
         ORDER BY pi.expiry_date ASC NULLS LAST, pu.created_at ASC LIMIT 1) as current_purchase_item_id,
        
        (SELECT pi.expiry_date FROM purchase_items pi 
         JOIN purchases pu ON pu.id = pi.purchase_id
         WHERE pi.product_id = p.id 
         AND pi.qty > pi.qty_sold
         AND (pi.expiry_date IS NULL OR pi.expiry_date >= date('now'))
         ORDER BY pi.expiry_date ASC NULLS LAST, pu.created_at ASC LIMIT 1) as current_expiry,
        
        -- ALWAYS show LATEST prices (even if that batch is sold out)
        (SELECT pi.sale_price FROM purchase_items pi 
         JOIN purchases pu ON pu.id = pi.purchase_id
         WHERE pi.product_id = p.id
         ORDER BY pu.created_at DESC LIMIT 1) as current_sale_price,
        
        -- Effective purchase price (accounts for bonus boxes)
        -- If bonus > 0: effective = (purchase_price * qty_in_boxes) / (qty_in_boxes + bonus)
        (SELECT 
          CASE 
            WHEN (pi.qty_in_boxes + COALESCE(pi.bonus, 0)) > 0 AND pi.bonus > 0
            THEN (pi.purchase_price * pi.qty_in_boxes) / (pi.qty_in_boxes + pi.bonus)
            ELSE pi.purchase_price
          END
         FROM purchase_items pi 
         JOIN purchases pu ON pu.id = pi.purchase_id
         WHERE pi.product_id = p.id
         ORDER BY pu.created_at DESC LIMIT 1) as current_purchase_price,
        
        -- ALWAYS show LATEST profit % (even if that batch is sold out)
        (SELECT pi.profit_percent
         FROM purchase_items pi 
         JOIN purchases pu ON pu.id = pi.purchase_id
         WHERE pi.product_id = p.id
         ORDER BY pu.created_at DESC LIMIT 1) as profit_percent,
        
        -- Current active purchase entry stock (FIFO by EXPIRY DATE)
        (SELECT (pi.qty - pi.qty_sold) FROM purchase_items pi 
         JOIN purchases pu ON pu.id = pi.purchase_id
         WHERE pi.product_id = p.id 
         AND pi.qty > pi.qty_sold
         AND (pi.expiry_date IS NULL OR pi.expiry_date >= date('now'))
         ORDER BY pi.expiry_date ASC NULLS LAST, pu.created_at ASC LIMIT 1) as current_stock,
        
        (SELECT pi.qty_in_boxes FROM purchase_items pi 
         JOIN purchases pu ON pu.id = pi.purchase_id
         WHERE pi.product_id = p.id 
         AND pi.qty > pi.qty_sold
         AND (pi.expiry_date IS NULL OR pi.expiry_date >= date('now'))
         ORDER BY pi.expiry_date ASC NULLS LAST, pu.created_at ASC LIMIT 1) as current_boxes,
        
        (SELECT pi.qty_loose FROM purchase_items pi 
         JOIN purchases pu ON pu.id = pi.purchase_id
         WHERE pi.product_id = p.id 
         AND pi.qty > pi.qty_sold
         AND (pi.expiry_date IS NULL OR pi.expiry_date >= date('now'))
         ORDER BY pi.expiry_date ASC NULLS LAST, pu.created_at ASC LIMIT 1) as current_loose,
        
        -- Priority scoring for better search ranking
        -- Priority 1: Exact match (highest)
        -- Priority 2: Starts with query
        -- Priority 3: Contains query
        CASE 
          WHEN LOWER(p.name) = LOWER(?) THEN 1
          WHEN LOWER(p.name) LIKE LOWER(?) THEN 2
          ELSE 3
        END as search_priority
        
      FROM products p 
      LEFT JOIN categories c ON c.id=p.category_id
      WHERE p.is_active=1 
        AND (
          LOWER(p.name) LIKE LOWER(?) 
          OR p.barcode LIKE ? 
          OR LOWER(p.generic_name) LIKE LOWER(?)
          OR LOWER(REPLACE(p.name, ' ', '')) LIKE LOWER(REPLACE(?, ' ', ''))
        )
      ORDER BY search_priority ASC, p.name ASC 
      LIMIT 20`
    ).all(
      q,           // Exact match
      `${q}%`,     // Starts with
      `%${q}%`,    // Contains (name)
      `%${q}%`,    // Contains (barcode)
      `%${q}%`,    // Contains (company)
      `%${q}%`     // Contains (no spaces - fuzzy)
    )
    
    // Debug: For each product, show purchase_items info
    results.forEach(r => {
      const purchaseItems = db.prepare(`
        SELECT pi.id, pi.qty, pi.qty_sold, (pi.qty - pi.qty_sold) as remaining, 
               pi.expiry_date, pu.created_at as purchase_date,
               pi.sale_price as box_sale_price, pi.purchase_price as box_purchase_price
        FROM purchase_items pi
        JOIN purchases pu ON pu.id = pi.purchase_id
        WHERE pi.product_id = ?
        ORDER BY pu.created_at ASC, pi.expiry_date ASC
      `).all(r.id)
      
      console.log(`  📦 Product: ${r.name} (ID: ${r.id})`)
      console.log(`     Total stock: ${r.stock}`)
      console.log(`     pcs_in_pack from products table: ${r.pcs_in_pack}`)
      console.log(`     current_sale_price (calculated): ${r.current_sale_price}`)
      console.log(`     current_purchase_price (calculated): ${r.current_purchase_price}`)
      console.log(`     profit_percent (backend calculated): ${r.profit_percent}%`)
      console.log(`     current_purchase_item_id: ${r.current_purchase_item_id}`)
      
      // Check GST for this purchase
      if (purchaseItems.length > 0) {
        const latestPurchase = db.prepare(`
          SELECT pu.gst_tax_percent 
          FROM purchases pu 
          JOIN purchase_items pi ON pi.purchase_id = pu.id
          WHERE pi.id = ?
        `).get(r.current_purchase_item_id)
        console.log(`     GST Tax %: ${latestPurchase?.gst_tax_percent || 0}%`)
      }
      
      console.log(`     Purchase entries:`, purchaseItems)
    })
    
    return results
  })

  ipcMain.handle('inventory:createProduct', (_, data) => {
    console.log('📦 Creating product with data:', JSON.stringify(data, null, 2))
    
    // Just create the product - no batch creation
    // Purchase entries will be created separately via Purchase Entry page
    const r = db.prepare(`
      INSERT INTO products (barcode,name,generic_name,category_id,manufacturer_id,rack_location,pcs_in_pack,sale_price,trade_price,alert_qty,is_active)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `).run(data.barcode||null, data.name, data.generic_name||null, data.category_id||null,
           data.manufacturer_id||null, data.rack_location||null, data.pcs_in_pack||1,
           data.sale_price||0, data.trade_price||0, data.alert_qty||10, data.is_active??1)
    
    const productId = r.lastInsertRowid
    console.log('✅ Product created with ID:', productId)

    return { id: productId, success: true }
  })

  ipcMain.handle('inventory:updateProduct', (_, data) => {
    const update = db.transaction(() => {
      // 1. Update products table (base price - PER BOX)
      db.prepare(`
        UPDATE products SET barcode=?,name=?,generic_name=?,category_id=?,manufacturer_id=?,
          rack_location=?,pcs_in_pack=?,sale_price=?,trade_price=?,alert_qty=?,is_active=?,updated_at=datetime('now')
        WHERE id=?
      `).run(data.barcode||null, data.name, data.generic_name||null, data.category_id||null,
             data.manufacturer_id||null, data.rack_location||null, data.pcs_in_pack||1,
             data.sale_price||0, data.trade_price||0, data.alert_qty||10, data.is_active??1, data.id)
      
      // 2. Update LATEST purchase_items entry (so Fast Billing shows updated price)
      const latestPurchaseItem = db.prepare(`
        SELECT pi.id, pi.purchase_price, pu.gst_tax_percent
        FROM purchase_items pi
        JOIN purchases pu ON pu.id = pi.purchase_id
        WHERE pi.product_id = ?
        ORDER BY pu.created_at DESC
        LIMIT 1
      `).get(data.id)
      
      if (latestPurchaseItem) {
        // Calculate new profit percentage
        const salePrice = data.sale_price || 0
        const purchasePrice = data.trade_price || latestPurchaseItem.purchase_price || 0
        const gstTax = latestPurchaseItem.gst_tax_percent || 0
        
        let profitPercent = 0
        if (salePrice > 0) {
          profitPercent = ((salePrice - purchasePrice) / salePrice) * 100 - gstTax
        }
        
        // Update both prices and profit percentage
        db.prepare(`
          UPDATE purchase_items 
          SET sale_price = ?, 
              purchase_price = ?,
              profit_percent = ?
          WHERE id = ?
        `).run(salePrice, purchasePrice, profitPercent, latestPurchaseItem.id)
        
        console.log(`✅ Updated latest purchase_items (ID: ${latestPurchaseItem.id})`)
        console.log(`   Sale: ${salePrice}, Purchase: ${purchasePrice}`)
        console.log(`   Profit %: ${profitPercent.toFixed(2)}%`)
      }
    })
    
    update()
    return { success: true }
  })

  ipcMain.handle('inventory:deleteProduct', (_, id) => {
    db.prepare('UPDATE products SET is_active=0 WHERE id=?').run(id)
    return { success: true }
  })

  ipcMain.handle('inventory:getBatches', (_, productId) => {
    return db.prepare(`
      SELECT b.*, p.name as product_name FROM batches b
      JOIN products p ON p.id=b.product_id
      WHERE b.product_id=? ORDER BY b.expiry_date ASC
    `).all(productId)
  })

  ipcMain.handle('inventory:adjustStock', (_, data) => {
    const adj = db.transaction(() => {
      const batch = db.prepare('SELECT * FROM batches WHERE id=?').get(data.batch_id)
      if (!batch) throw new Error('Batch not found')
      const newQty = data.type === 'add' ? batch.qty + data.qty : batch.qty - data.qty
      db.prepare('UPDATE batches SET qty=? WHERE id=?').run(newQty, data.batch_id)
      db.prepare(`INSERT INTO stock_adjustments (product_id,batch_id,type,qty,reason,user_id) VALUES (?,?,?,?,?,?)`)
        .run(data.product_id, data.batch_id, data.type, data.qty, data.reason||'', data.user_id||1)
    })
    adj()
    return { success: true }
  })

  ipcMain.handle('inventory:transferStock', (_, data) => {
    const transfer = db.transaction(() => {
      const from = db.prepare('SELECT * FROM batches WHERE id=?').get(data.from_batch_id)
      if (!from || from.qty < data.qty) throw new Error('Insufficient stock')
      db.prepare('UPDATE batches SET qty=qty-? WHERE id=?').run(data.qty, data.from_batch_id)
      // Check if batch exists in target branch
      let toBatch = db.prepare('SELECT * FROM batches WHERE product_id=? AND batch_no=? AND branch_id=?')
        .get(from.product_id, from.batch_no, data.to_branch_id)
      if (toBatch) {
        db.prepare('UPDATE batches SET qty=qty+? WHERE id=?').run(data.qty, toBatch.id)
      } else {
        db.prepare(`INSERT INTO batches (product_id,batch_no,expiry_date,purchase_price,sale_price,qty,branch_id)
          VALUES (?,?,?,?,?,?,?)`).run(from.product_id, from.batch_no, from.expiry_date, from.purchase_price, from.sale_price, data.qty, data.to_branch_id)
      }
      db.prepare(`INSERT INTO stock_adjustments (product_id,batch_id,type,qty,reason,from_branch_id,to_branch_id,user_id)
        VALUES (?,?,?,?,?,?,?,?)`)
        .run(from.product_id, data.from_batch_id, 'transfer', data.qty, 'Stock Transfer', data.from_branch_id, data.to_branch_id, data.user_id||1)
    })
    transfer()
    return { success: true }
  })

  ipcMain.handle('inventory:getCategories', () => db.prepare('SELECT * FROM categories ORDER BY name').all())
  ipcMain.handle('inventory:createCategory', (_, data) => {
    const r = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)').run(data.name)
    return { id: r.lastInsertRowid, success: true }
  })

  ipcMain.handle('inventory:getExpiryAlerts', () => {
    const d180 = new Date(); d180.setDate(d180.getDate() + 180) // 6 months
    return db.prepare(`
      SELECT 
        pi.*,
        p.name as product_name,
        pi.sale_price,
        (pi.qty - pi.qty_sold) as qty,
        pu.invoice_no as batch_no
      FROM purchase_items pi
      JOIN products p ON p.id = pi.product_id
      JOIN purchases pu ON pu.id = pi.purchase_id
      WHERE (pi.qty - pi.qty_sold) > 0 
        AND p.is_active = 1
        AND pi.expiry_date IS NOT NULL
        AND pi.expiry_date <= ?
      ORDER BY pi.expiry_date ASC
    `).all(d180.toISOString().split('T')[0])
  })

  ipcMain.handle('inventory:getLowStock', () => {
    return db.prepare(`
      SELECT 
        p.*,
        COALESCE((
          SELECT SUM(pi.qty - pi.qty_sold)
          FROM purchase_items pi
          WHERE pi.product_id = p.id
        ), 0) as stock,
        c.name as category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = 1
      GROUP BY p.id
      HAVING stock <= p.alert_qty
      ORDER BY stock ASC
    `).all()
  })

  ipcMain.handle('inventory:getAllBatches', (_, filters = {}) => {
    console.log('📦 getAllBatches API called with filters:', JSON.stringify(filters))
    
    // Always load batches (search is optional filter)
    
    try {
      let query = `
        SELECT 
          pi.id,
          pi.product_id,
          p.name as product_name,
          p.pcs_in_pack,
          pi.expiry_date,
          pi.purchase_price,
          pi.sale_price,
          (pi.qty - pi.qty_sold) as qty,
          pi.qty_in_boxes,
          pi.qty_loose,
          pu.created_at as purchase_date,
          pu.invoice_no as batch_no
        FROM purchase_items pi
        JOIN products p ON p.id = pi.product_id
        JOIN purchases pu ON pu.id = pi.purchase_id
        WHERE p.is_active = 1`
      
      const params = []
      
      // Add search filter if provided
      if (filters.search) {
        query += ` AND (p.name LIKE ? OR pu.invoice_no LIKE ?)`
        const searchPattern = `%${filters.search}%`
        params.push(searchPattern, searchPattern)
        console.log(`🔍 Searching with pattern: "${searchPattern}"`)
      }
      
      query += ` ORDER BY pi.expiry_date ASC`
      
      const batches = db.prepare(query).all(...params)
      console.log(`✅ Found ${batches.length} batches`)
      return batches
    } catch (err) {
      console.error('❌ getAllBatches error:', err.message)
      return []
    }
  })

  // Update expiry date for a purchase_items entry
  ipcMain.handle('inventory:updatePurchaseItemExpiry', (_, data) => {
    console.log('📅 Updating expiry date for purchase_item:', data)
    try {
      db.prepare(`
        UPDATE purchase_items 
        SET expiry_date = ?
        WHERE id = ?
      `).run(data.expiry_date, data.purchase_item_id)
      
      console.log(`✅ Updated expiry date for purchase_item ID: ${data.purchase_item_id}`)
      return { success: true }
    } catch (err) {
      console.error('❌ Update expiry error:', err.message)
      throw new Error(err.message)
    }
  })

  // DEBUG: Check stock calculation for any product
  ipcMain.handle('inventory:debugStockCalculation', (_, productName) => {
    console.log(`\n🔍 DEBUGGING STOCK CALCULATION FOR: ${productName}`)
    console.log('='.repeat(80))
    
    const product = db.prepare(`
      SELECT id, name, pcs_in_pack 
      FROM products 
      WHERE LOWER(name) LIKE LOWER(?)
    `).get(`%${productName}%`)
    
    if (!product) {
      return { error: 'Product not found' }
    }
    
    console.log(`Product: ${product.name} (ID: ${product.id})`)
    
    // Get purchase items
    const purchases = db.prepare(`
      SELECT 
        pi.id,
        pi.qty,
        pi.qty_sold,
        (pi.qty - IFNULL(pi.qty_sold, 0)) as remaining,
        pi.expiry_date,
        pu.invoice_no,
        pu.created_at
      FROM purchase_items pi
      JOIN purchases pu ON pu.id = pi.purchase_id
      WHERE pi.product_id = ?
      ORDER BY pu.created_at ASC
    `).all(product.id)
    
    let totalPurchased = 0
    let totalQtySold = 0
    
    console.log('\nPURCHASE ITEMS:')
    purchases.forEach(p => {
      console.log(`  Batch ID: ${p.id}, Qty: ${p.qty}, qty_sold: ${p.qty_sold || 0}, Remaining: ${p.remaining}, Expiry: ${p.expiry_date}, Invoice: ${p.invoice_no}`)
      totalPurchased += p.qty
      totalQtySold += (p.qty_sold || 0)
    })
    
    // Get sale items with FULL DETAILS
    const sales = db.prepare(`
      SELECT 
        si.id as sale_item_id,
        si.qty,
        si.purchase_item_id,
        si.sale_id,
        s.invoice_no,
        s.status,
        s.created_at,
        pi.qty as batch_qty,
        pi.qty_sold as batch_qty_sold_after,
        pi.expiry_date as batch_expiry
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      LEFT JOIN purchase_items pi ON pi.id = si.purchase_item_id
      WHERE si.product_id = ?
      ORDER BY s.created_at ASC
    `).all(product.id)
    
    let actualSold = 0
    console.log('\nSALE ITEMS (CHRONOLOGICAL ORDER):')
    console.log('  Sale# | Date                | Invoice    | Qty | Batch ID | Batch Qty | Current qty_sold | Expiry')
    console.log('  ' + '-'.repeat(100))
    
    sales.forEach((s, idx) => {
      const date = s.created_at.substring(0, 19)
      const batchInfo = s.purchase_item_id 
        ? `${s.purchase_item_id} | ${s.batch_qty} | ${s.batch_qty_sold_after || 0} | ${s.batch_expiry || 'N/A'}`
        : 'NULL | - | - | -'
      
      console.log(`  ${(idx+1).toString().padStart(5)} | ${date} | ${s.invoice_no.padEnd(10)} | ${s.qty.toString().padStart(3)} | ${batchInfo}`)
      
      if (s.status !== 'voided') {
        actualSold += s.qty
      }
    })
    
    // Get returns
    const returns = db.prepare(`
      SELECT 
        sri.qty,
        sri.purchase_item_id,
        sr.created_at
      FROM sale_return_items sri
      JOIN sale_returns sr ON sr.id = sri.return_id
      WHERE sri.product_id = ?
    `).all(product.id)
    
    let totalReturns = 0
    if (returns.length > 0) {
      console.log('\nRETURNS:')
      returns.forEach(r => {
        console.log(`  Returned: ${r.qty}, Purchase Item: ${r.purchase_item_id || 'NULL'}`)
        totalReturns += r.qty
      })
    }
    
    // Correct expected stock = purchased - (sold - returned)
    // BUT only count returns that are properly linked to batches
    // NULL returns should NOT be counted in expectedStock
    // because they don't affect any batch's qty_sold
    const linkedReturns = returns.filter(r => r.purchase_item_id !== null)
    const linkedReturnQty = linkedReturns.reduce((sum, r) => sum + r.qty, 0)
    const nullReturnQty = totalReturns - linkedReturnQty
    
    // calculatedStock = SUM(qty - qty_sold) from purchase_items
    // This is the ACTUAL displayed stock
    // expectedStock = what stock SHOULD be based on sales history
    // After sync: both should match
    const expectedStock = totalPurchased - (actualSold - linkedReturnQty)
    const calculatedStock = totalPurchased - totalQtySold
    const discrepancy = expectedStock - calculatedStock
    
    console.log('\n' + '='.repeat(80))
    console.log('SUMMARY:')
    console.log(`Total Purchased:          ${totalPurchased}`)
    console.log(`Total Sold:               ${actualSold}`)
    console.log(`Returns (linked):         ${linkedReturnQty}`)
    console.log(`Returns (NULL - ignored): ${nullReturnQty}`)
    console.log(`Net Sold:                 ${actualSold - linkedReturnQty}`)
    console.log(`qty_sold in DB (total):   ${totalQtySold}`)
    console.log(`Expected Stock:           ${expectedStock}`)
    console.log(`Calculated Stock:         ${calculatedStock}`)
    console.log(`Displayed Stock:          ${calculatedStock}`)
    
    if (discrepancy !== 0) {
      console.log(`\n🐛 DISCREPANCY: ${Math.abs(discrepancy)} (sync needed)`)
    } else {
      console.log(`\n✅ Stock is accurate`)
    }
    console.log('='.repeat(80) + '\n')
    
    return {
      product: product.name,
      totalPurchased,
      actualSold,
      totalReturns,
      linkedReturnQty,
      nullReturnQty,
      netSold: actualSold - linkedReturnQty,
      qtySoldInDB: totalQtySold,
      expectedStock,
      calculatedStock,
      discrepancy,
      purchases,
      sales,
      returns
    }
  })

  // Check returns with NULL purchase_item_id
  ipcMain.handle('inventory:checkNullReturns', () => {
    console.log('\n🔍 CHECKING RETURNS WITH NULL PURCHASE_ITEM_ID\n')
    
    const nullReturns = db.prepare(`
      SELECT 
        sri.id,
        sri.return_id,
        sri.qty,
        sri.product_id,
        p.name as product_name,
        sr.sale_id,
        sr.created_at as return_date,
        s.invoice_no
      FROM sale_return_items sri
      JOIN sale_returns sr ON sr.id = sri.return_id
      JOIN products p ON p.id = sri.product_id
      LEFT JOIN sales s ON s.id = sr.sale_id
      WHERE sri.purchase_item_id IS NULL
      ORDER BY sr.created_at DESC
    `).all()
    
    console.log(`Found ${nullReturns.length} return items with NULL purchase_item_id\n`)
    
    if (nullReturns.length > 0) {
      console.log('AFFECTED RETURNS:\n')
      nullReturns.forEach((r, idx) => {
        console.log(`${idx + 1}. Return Item #${r.id} (Return #${r.return_id})`)
        console.log(`   Product: ${r.product_name}`)
        console.log(`   Qty: ${r.qty}`)
        console.log(`   Original Sale: ${r.invoice_no} (Sale #${r.sale_id})`)
        console.log(`   Date: ${r.return_date}`)
        console.log()
      })
      
      // Group by product
      const byProduct = {}
      nullReturns.forEach(r => {
        if (!byProduct[r.product_name]) {
          byProduct[r.product_name] = { qty: 0, count: 0 }
        }
        byProduct[r.product_name].qty += r.qty
        byProduct[r.product_name].count += 1
      })
      
      console.log('AFFECTED PRODUCTS:\n')
      Object.entries(byProduct)
        .sort((a, b) => b[1].qty - a[1].qty)
        .forEach(([name, data]) => {
          console.log(`  ${name}: ${data.qty} pills (${data.count} returns)`)
        })
      console.log()
    }
    
    return {
      total: nullReturns.length,
      returns: nullReturns,
      affectedProducts: nullReturns.length > 0 ? Object.keys(
        nullReturns.reduce((acc, r) => ({ ...acc, [r.product_name]: true }), {})
      ).length : 0
    }
  })

  // Fix NULL purchase_item_id in sale_return_items by backfilling from original sale
  ipcMain.handle('inventory:fixNullReturnPurchaseItems', (_, options = {}) => {
    const dryRun = options.dryRun !== false // Default to dry run
    
    console.log('\n' + '='.repeat(80))
    console.log(`🔧 FIX NULL RETURN PURCHASE_ITEM_IDS: ${dryRun ? 'DRY RUN' : 'EXECUTING'}`)
    console.log('='.repeat(80) + '\n')
    
    // Get all returns with NULL purchase_item_id
    const nullReturns = db.prepare(`
      SELECT 
        sri.id as return_item_id,
        sri.return_id,
        sri.qty,
        sri.product_id,
        p.name as product_name,
        sr.sale_id
      FROM sale_return_items sri
      JOIN sale_returns sr ON sr.id = sri.return_id
      JOIN products p ON p.id = sri.product_id
      WHERE sri.purchase_item_id IS NULL
      ORDER BY sri.id ASC
    `).all()
    
    console.log(`Found ${nullReturns.length} return items with NULL purchase_item_id\n`)
    
    if (nullReturns.length === 0) {
      console.log('✅ No NULL purchase_item_ids found - all returns are properly linked!\n')
      return { total: 0, fixed: 0, unfixable: [], productsSummary: [] }
    }
    
    const fixes = []
    const unfixable = []
    const productImpact = new Map()
    
    nullReturns.forEach(ret => {
      // Try to find purchase_item_id from original sale_items
      // Use LIMIT 1 to get the first matching item (FIFO assumption)
      const saleItem = db.prepare(`
        SELECT purchase_item_id, qty
        FROM sale_items 
        WHERE sale_id = ? AND product_id = ?
        ORDER BY id ASC
        LIMIT 1
      `).get(ret.sale_id, ret.product_id)
      
      if (saleItem && saleItem.purchase_item_id) {
        fixes.push({
          return_item_id: ret.return_item_id,
          product_name: ret.product_name,
          product_id: ret.product_id,
          qty: ret.qty,
          purchase_item_id: saleItem.purchase_item_id
        })
        
        // Track product impact
        if (!productImpact.has(ret.product_id)) {
          productImpact.set(ret.product_id, {
            product_name: ret.product_name,
            qty_affected: 0,
            returns_fixed: 0
          })
        }
        const impact = productImpact.get(ret.product_id)
        impact.qty_affected += ret.qty
        impact.returns_fixed += 1
      } else {
        unfixable.push({
          return_item_id: ret.return_item_id,
          product_name: ret.product_name,
          product_id: ret.product_id,
          qty: ret.qty,
          sale_id: ret.sale_id,
          reason: saleItem ? 'sale_item has NULL purchase_item_id' : 'sale_item not found'
        })
      }
    })
    
    console.log('📋 Analysis Results:\n')
    console.log(`   Total NULL returns: ${nullReturns.length}`)
    console.log(`   Fixable: ${fixes.length}`)
    console.log(`   Unfixable: ${unfixable.length}`)
    console.log(`   Products affected: ${productImpact.size}\n`)
    
    if (fixes.length > 0) {
      console.log('✅ FIXABLE RETURNS:\n')
      fixes.forEach((f, idx) => {
        console.log(`${idx + 1}. Return Item #${f.return_item_id}`)
        console.log(`   Product: ${f.product_name}`)
        console.log(`   Qty: ${f.qty}`)
        console.log(`   Will set purchase_item_id: ${f.purchase_item_id}`)
        console.log()
      })
    }
    
    if (unfixable.length > 0) {
      console.log('❌ UNFIXABLE RETURNS (manual investigation needed):\n')
      unfixable.forEach((u, idx) => {
        console.log(`${idx + 1}. Return Item #${u.return_item_id}`)
        console.log(`   Product: ${u.product_name}`)
        console.log(`   Qty: ${u.qty}`)
        console.log(`   Sale ID: ${u.sale_id}`)
        console.log(`   Reason: ${u.reason}`)
        console.log()
      })
    }
    
    if (productImpact.size > 0) {
      console.log('📊 STOCK IMPACT BY PRODUCT:\n')
      console.log('   Product Name                          | Returns Fixed | Qty Affected')
      console.log('   ' + '-'.repeat(80))
      
      Array.from(productImpact.values())
        .sort((a, b) => b.qty_affected - a.qty_affected)
        .forEach(p => {
          const name = p.product_name.padEnd(40).substring(0, 40)
          const returns = p.returns_fixed.toString().padStart(13)
          const qty = p.qty_affected.toString().padStart(12)
          console.log(`   ${name} | ${returns} | ${qty}`)
        })
      console.log()
    }
    
    // Execute fixes if not dry run
    if (!dryRun && fixes.length > 0) {
      console.log('💾 EXECUTING UPDATES...\n')
      
      const updateStmt = db.prepare(`
        UPDATE sale_return_items 
        SET purchase_item_id = ?
        WHERE id = ?
      `)
      
      const transaction = db.transaction(() => {
        fixes.forEach(f => {
          updateStmt.run(f.purchase_item_id, f.return_item_id)
        })
      })
      
      transaction()
      
      console.log(`✅ Updated ${fixes.length} return items with purchase_item_id\n`)
    }
    
    console.log('='.repeat(80) + '\n')
    
    return {
      total: nullReturns.length,
      fixed: fixes.length,
      unfixable: unfixable,
      productsSummary: Array.from(productImpact.values())
    }
  })

  // SYNC: Fix NULL return links + Recalculate qty_sold for ALL purchase_items
  ipcMain.handle('inventory:syncQtySold', (_, options = {}) => {
    const dryRun = options.dryRun !== false // Default to dry run
    
    console.log('\n' + '='.repeat(80))
    console.log(`🔧 QTY_SOLD SYNC: ${dryRun ? 'DRY RUN' : 'EXECUTING'}`)
    console.log('='.repeat(80) + '\n')

    // ─── STEP 1: Fix NULL purchase_item_id in sale_return_items ───────────────
    console.log('📋 STEP 1: Checking for NULL purchase_item_id in returns...\n')

    const nullReturns = db.prepare(`
      SELECT 
        sri.id as return_item_id,
        sri.return_id,
        sri.qty,
        sri.product_id,
        sr.sale_id
      FROM sale_return_items sri
      JOIN sale_returns sr ON sr.id = sri.return_id
      WHERE sri.purchase_item_id IS NULL
      ORDER BY sri.id ASC
    `).all()

    console.log(`   Found ${nullReturns.length} return items with NULL purchase_item_id`)

    const nullFixes = []
    const nullUnfixable = []

    nullReturns.forEach(ret => {
      // Look up purchase_item_id from original sale_items
      const saleItem = db.prepare(`
        SELECT purchase_item_id
        FROM sale_items
        WHERE sale_id = ? AND product_id = ?
        ORDER BY id ASC
        LIMIT 1
      `).get(ret.sale_id, ret.product_id)

      if (saleItem && saleItem.purchase_item_id) {
        nullFixes.push({
          return_item_id: ret.return_item_id,
          purchase_item_id: saleItem.purchase_item_id,
          qty: ret.qty
        })
      } else {
        // Fallback: find oldest FIFO batch for this product
        const fifoBatch = db.prepare(`
          SELECT id FROM purchase_items
          WHERE product_id = ?
          ORDER BY expiry_date ASC NULLS LAST, id ASC
          LIMIT 1
        `).get(ret.product_id)

        if (fifoBatch) {
          nullFixes.push({
            return_item_id: ret.return_item_id,
            purchase_item_id: fifoBatch.id,
            qty: ret.qty
          })
        } else {
          nullUnfixable.push(ret.return_item_id)
        }
      }
    })

    console.log(`   Fixable: ${nullFixes.length}, Unfixable: ${nullUnfixable.length}\n`)

    // ─── STEP 2: Get all purchase_items ───────────────────────────────────────
    console.log('📦 STEP 2: Loading all purchase_items...')
    const allPurchaseItems = db.prepare(`
      SELECT 
        pi.id,
        pi.product_id,
        pi.qty,
        pi.qty_sold as old_qty_sold,
        p.name as product_name
      FROM purchase_items pi
      JOIN products p ON p.id = pi.product_id
      ORDER BY pi.id ASC
    `).all()
    console.log(`   Found ${allPurchaseItems.length} purchase items\n`)

    // ─── STEP 3: Calculate correct qty_sold per batch ─────────────────────────
    // We must simulate the null-fixes first so the return query is accurate
    console.log('📊 STEP 3: Calculating correct qty_sold from sales & returns...\n')

    const updates = []
    const oversold = []
    const affectedProducts = new Map()

    allPurchaseItems.forEach(pi => {
      // Total sold from sale_items for this batch
      const soldData = db.prepare(`
        SELECT COALESCE(SUM(si.qty), 0) as total_sold
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        WHERE si.purchase_item_id = ?
          AND s.status != 'voided'
      `).get(pi.id)

      // Total returned WITH purchase_item_id (already linked)
      const returnLinked = db.prepare(`
        SELECT COALESCE(SUM(sri.qty), 0) as total
        FROM sale_return_items sri
        WHERE sri.purchase_item_id = ?
      `).get(pi.id)

      // Total returned that WILL be linked (NULL fixes for this batch)
      const returnNullFixed = nullFixes
        .filter(f => f.purchase_item_id === pi.id)
        .reduce((sum, f) => sum + f.qty, 0)

      const actualSold = soldData.total_sold || 0
      const actualReturned = (returnLinked.total || 0) + returnNullFixed
      const newQtySold = actualSold - actualReturned
      const drift = newQtySold - (pi.old_qty_sold || 0)

      // Track affected products
      if (drift !== 0) {
        if (!affectedProducts.has(pi.product_id)) {
          affectedProducts.set(pi.product_id, {
            product_name: pi.product_name,
            old_stock: 0,
            new_stock: 0,
            batches: 0
          })
        }
        const pd = affectedProducts.get(pi.product_id)
        pd.old_stock += (pi.qty - (pi.old_qty_sold || 0))
        pd.new_stock += (pi.qty - newQtySold)
        pd.batches += 1
      }

      if (drift !== 0) {
        updates.push({
          id: pi.id,
          product_name: pi.product_name,
          qty: pi.qty,
          old_qty_sold: pi.old_qty_sold || 0,
          new_qty_sold: newQtySold,
          drift,
          oversold: newQtySold > pi.qty
        })

        if (newQtySold > pi.qty) {
          oversold.push({
            id: pi.id,
            product_name: pi.product_name,
            qty: pi.qty,
            new_qty_sold: newQtySold,
            excess: newQtySold - pi.qty
          })
        }
      }
    })

    // ─── Report ───────────────────────────────────────────────────────────────
    console.log('📋 Analysis Results:\n')
    console.log(`   NULL return fixes:       ${nullFixes.length}`)
    console.log(`   Batches needing update:  ${updates.length}`)
    console.log(`   Oversold batches:        ${oversold.length}`)
    console.log(`   Products affected:       ${affectedProducts.size}\n`)

    if (affectedProducts.size > 0) {
      console.log('📊 STOCK CHANGES BY PRODUCT:\n')
      console.log('   Product                                  | Old Stock | New Stock | Change')
      console.log('   ' + '-'.repeat(85))
      Array.from(affectedProducts.values())
        .sort((a, b) => Math.abs(b.new_stock - b.old_stock) - Math.abs(a.new_stock - a.old_stock))
        .slice(0, 30)
        .forEach(p => {
          const change = p.new_stock - p.old_stock
          const changeStr = change > 0 ? `+${change}` : `${change}`
          console.log(`   ${p.product_name.padEnd(40).substring(0, 40)} | ${p.old_stock.toString().padStart(9)} | ${p.new_stock.toString().padStart(9)} | ${changeStr.padStart(6)}`)
        })
      console.log()
    }

    // ─── Execute ──────────────────────────────────────────────────────────────
    if (!dryRun) {
      console.log('🚀 EXECUTING...\n')

      const syncTransaction = db.transaction(() => {
        // Step A: Fix NULL return purchase_item_ids
        const fixStmt = db.prepare(`
          UPDATE sale_return_items SET purchase_item_id = ? WHERE id = ?
        `)
        nullFixes.forEach(f => fixStmt.run(f.purchase_item_id, f.return_item_id))
        console.log(`   ✅ Fixed ${nullFixes.length} NULL return links`)

        // Step B: Recalculate qty_sold for ALL batches
        const updateStmt = db.prepare(`UPDATE purchase_items SET qty_sold = ? WHERE id = ?`)
        updates.forEach(u => updateStmt.run(u.new_qty_sold, u.id))
        console.log(`   ✅ Updated ${updates.length} batch qty_sold values`)
      })

      syncTransaction()
      console.log('\n✅ SYNC COMPLETE!\n')
    } else {
      console.log('📝 DRY RUN - No changes made\n')
    }

    console.log('='.repeat(80) + '\n')

    return {
      total: allPurchaseItems.length,
      needsUpdate: updates.length,
      oversold: oversold.length,
      nullReturnsFixes: nullFixes.length,
      productsAffected: affectedProducts.size,
      updates,
      oversoldBatches: oversold,
      productStockChanges: Array.from(affectedProducts.values()),
      executed: !dryRun
    }
  })
}


