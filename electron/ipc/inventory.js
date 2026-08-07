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
          WHERE pi.product_id = p.id AND pi.qty > pi.qty_sold
        ), 0) as stock
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
      q += ' AND (p.name LIKE ? OR p.barcode LIKE ? OR p.generic_name LIKE ?)'
      const searchPattern = `%${filters.search}%`
      params.push(searchPattern, searchPattern, searchPattern)
      console.log(`🔍 Searching products with pattern: "${searchPattern}"`)
    }
    if (filters.category_id) { q += ' AND p.category_id=?'; params.push(filters.category_id) }
    if (filters.is_active !== undefined) { q += ' AND p.is_active=?'; params.push(filters.is_active) }
    q += ' ORDER BY p.name'
    
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
    
    const results = db.prepare(`
      SELECT p.id, p.barcode, p.name, p.generic_name as company_name, p.category_id,
             p.rack_location, p.pcs_in_pack, p.sale_price, p.trade_price, p.is_active,
             c.name as category_name,
        
        -- Total stock across all purchases (purchased - sold)
        COALESCE((
          SELECT SUM(pi.qty - pi.qty_sold) 
          FROM purchase_items pi 
          WHERE pi.product_id = p.id AND pi.qty > pi.qty_sold
        ), 0) as stock,
        
        -- Active purchase entry (OLDEST available batch for FIFO stock management)
        (SELECT pi.id FROM purchase_items pi 
         JOIN purchases pu ON pu.id = pi.purchase_id
         WHERE pi.product_id = p.id 
         AND pi.qty > pi.qty_sold
         ORDER BY pu.created_at ASC, pi.expiry_date ASC LIMIT 1) as current_purchase_item_id,
        
        (SELECT pi.expiry_date FROM purchase_items pi 
         JOIN purchases pu ON pu.id = pi.purchase_id
         WHERE pi.product_id = p.id 
         AND pi.qty > pi.qty_sold
         ORDER BY pu.created_at ASC, pi.expiry_date ASC LIMIT 1) as current_expiry,
        
        -- ALWAYS show LATEST prices (even if that batch is sold out)
        (SELECT pi.sale_price FROM purchase_items pi 
         JOIN purchases pu ON pu.id = pi.purchase_id
         WHERE pi.product_id = p.id
         ORDER BY pu.created_at DESC LIMIT 1) as current_sale_price,
        
        (SELECT pi.purchase_price FROM purchase_items pi 
         JOIN purchases pu ON pu.id = pi.purchase_id
         WHERE pi.product_id = p.id
         ORDER BY pu.created_at DESC LIMIT 1) as current_purchase_price,
        
        -- ALWAYS show LATEST profit % (even if that batch is sold out)
        (SELECT pi.profit_percent
         FROM purchase_items pi 
         JOIN purchases pu ON pu.id = pi.purchase_id
         WHERE pi.product_id = p.id
         ORDER BY pu.created_at DESC LIMIT 1) as profit_percent,
        
        -- Current active purchase entry stock (still FIFO for stock management)
        (SELECT (pi.qty - pi.qty_sold) FROM purchase_items pi 
         JOIN purchases pu ON pu.id = pi.purchase_id
         WHERE pi.product_id = p.id 
         AND pi.qty > pi.qty_sold
         ORDER BY pu.created_at ASC, pi.expiry_date ASC LIMIT 1) as current_stock,
        
        (SELECT pi.qty_in_boxes FROM purchase_items pi 
         JOIN purchases pu ON pu.id = pi.purchase_id
         WHERE pi.product_id = p.id 
         AND pi.qty > pi.qty_sold
         ORDER BY pu.created_at ASC, pi.expiry_date ASC LIMIT 1) as current_boxes,
        
        (SELECT pi.qty_loose FROM purchase_items pi 
         JOIN purchases pu ON pu.id = pi.purchase_id
         WHERE pi.product_id = p.id 
         AND pi.qty > pi.qty_sold
         ORDER BY pu.created_at ASC, pi.expiry_date ASC LIMIT 1) as current_loose
        
      FROM products p 
      LEFT JOIN categories c ON c.id=p.category_id
      WHERE p.is_active=1 AND (LOWER(p.name) LIKE LOWER(?) OR p.barcode LIKE ? OR LOWER(p.generic_name) LIKE LOWER(?))
      ORDER BY p.name LIMIT 20`
    ).all(`%${q}%`, `%${q}%`, `%${q}%`)
    
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
          WHERE pi.product_id = p.id AND pi.qty > pi.qty_sold
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
    
    // Return empty if no search (unless loadAll flag)
    if (!filters.search && !filters.loadAll) {
      console.log('⚠️ No search query provided - returning empty array')
      return []
    }
    
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
        WHERE pi.qty > pi.qty_sold 
          AND p.is_active = 1`
      
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
      console.log(`✅ Found ${batches.length} batches matching search`)
      if (batches.length > 0) {
        console.log('📋 First batch:', batches[0])
      } else {
        console.log('❌ No batches found for search:', filters.search)
      }
      return batches
    } catch (err) {
      console.error('❌ getAllBatches error:', err.message)
      return []
    }
  })
}
