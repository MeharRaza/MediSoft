const db = require('../database')

function nextInvoiceNo(prefix) {
  const last = db.prepare(`SELECT invoice_no FROM sales WHERE invoice_no LIKE ? ORDER BY id DESC LIMIT 1`).get(`${prefix}%`)
  if (!last) return `${prefix}0001`
  const num = parseInt(last.invoice_no.replace(prefix, '')) + 1
  return `${prefix}${String(num).padStart(4, '0')}`
}

module.exports = (ipcMain) => {

  ipcMain.handle('sales:createInvoice', (_, data) => {
    console.log('🛒 Creating sale invoice...')
    const create = db.transaction(() => {
      const invNo = nextInvoiceNo('INV-')
      const r = db.prepare(`
        INSERT INTO sales (invoice_no,customer_id,branch_id,user_id,payment_method,sub_total,discount,tax,grand_total,paid_amount,change_amount,status,notes)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(invNo, data.customer_id||null, data.branch_id||1, data.user_id||1,
             data.payment_method||'cash', data.sub_total||0, data.discount||0, data.tax||0,
             data.grand_total||0, data.paid_amount||0, data.change_amount||0,
             data.payment_method === 'credit' ? 'credit' : 'paid', data.notes||null)

      const saleId = r.lastInsertRowid
      console.log(`✅ Sale created with ID: ${saleId}, Invoice: ${invNo}`)

      for (const item of data.items) {
        console.log(`📦 Processing sale item:`, {
          product_id: item.product_id,
          purchase_item_id: item.purchase_item_id,
          qty: item.qty,
          expiry_date: item.expiry_date
        })
        
        // Insert sale item with link to purchase_item_id
        const saleItemResult = db.prepare(`INSERT INTO sale_items (sale_id,product_id,purchase_item_id,expiry_date,qty,sale_price,discount_percent,total)
          VALUES (?,?,?,?,?,?,?,?)`
        ).run(saleId, item.product_id, item.purchase_item_id||null,
              item.expiry_date||null, item.qty, item.sale_price, item.discount_percent||0, item.total)
        
        console.log(`✅ Sale item inserted with ID: ${saleItemResult.lastInsertRowid}`)

        // Update qty_sold in purchase_items (FIFO tracking)
        if (item.purchase_item_id) {
          console.log(`🔄 Updating qty_sold for purchase_item_id: ${item.purchase_item_id}`)
          const purchaseItem = db.prepare('SELECT id, product_id, qty, qty_sold FROM purchase_items WHERE id=?').get(item.purchase_item_id)
          if (purchaseItem) {
            console.log(`   Before update: qty=${purchaseItem.qty}, qty_sold=${purchaseItem.qty_sold || 0}`)
            const currentQtySold = purchaseItem.qty_sold || 0
            const newQtySold = currentQtySold + parseFloat(item.qty)
            
            const updateResult = db.prepare('UPDATE purchase_items SET qty_sold=? WHERE id=?')
              .run(newQtySold, item.purchase_item_id)
            
            console.log(`   Update result: changes=${updateResult.changes}`)
            console.log(`   After update: qty_sold=${newQtySold}, remaining=${purchaseItem.qty - newQtySold}`)
            
            // Verify update
            const verify = db.prepare('SELECT qty_sold FROM purchase_items WHERE id=?').get(item.purchase_item_id)
            console.log(`   Verification: qty_sold in DB is now ${verify.qty_sold}`)
          } else {
            console.log(`   ❌ Purchase item ${item.purchase_item_id} NOT FOUND in database!`)
          }
        } else {
          console.log(`   ⚠️ No purchase_item_id provided - stock won't be deducted`)
          console.log(`   This happens when product was added directly (not via Purchase Entry)`)
        }
      }

      // Update customer balance if credit
      if (data.customer_id && data.payment_method === 'credit') {
        db.prepare('UPDATE customers SET balance=balance+? WHERE id=?').run(data.grand_total, data.customer_id)
      } else if (data.customer_id && data.paid_amount < data.grand_total) {
        db.prepare('UPDATE customers SET balance=balance+? WHERE id=?').run(data.grand_total - data.paid_amount, data.customer_id)
      }

      console.log('✅ Sale transaction completed successfully')
      return { id: saleId, invoice_no: invNo }
    })
    return create()
  })

  ipcMain.handle('sales:getInvoices', (_, filters = {}) => {
    let q = `
      SELECT s.*, c.name as customer_name, u.full_name as cashier_name,
             (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) as items_count
      FROM sales s
      LEFT JOIN customers c ON c.id=s.customer_id
      LEFT JOIN users u ON u.id=s.user_id
      WHERE 1=1`
    const params = []
    if (filters.from_date) { q += ' AND date(s.created_at)>=?'; params.push(filters.from_date) }
    if (filters.to_date)   { q += ' AND date(s.created_at)<=?'; params.push(filters.to_date) }
    if (filters.status)    { q += ' AND s.status=?'; params.push(filters.status) }
    if (filters.customer_id) { q += ' AND s.customer_id=?'; params.push(filters.customer_id) }
    
    // Enhanced search: Invoice#, Customer name, OR Product name
    if (filters.search) { 
      q += ` AND (
        s.invoice_no LIKE ? 
        OR c.name LIKE ? 
        OR s.id IN (
          SELECT si.sale_id FROM sale_items si 
          JOIN products p ON p.id = si.product_id 
          WHERE p.name LIKE ?
        )
      )`
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`)
    }
    
    q += ' ORDER BY s.id DESC'
    if (filters.limit) { q += ' LIMIT ?'; params.push(filters.limit) }
    return db.prepare(q).all(...params)
  })

  ipcMain.handle('sales:getInvoiceById', (_, id) => {
    const sale = db.prepare(`
      SELECT s.*, c.name as customer_name FROM sales s
      LEFT JOIN customers c ON c.id=s.customer_id WHERE s.id=?`).get(id)
    if (!sale) return null
    sale.items = db.prepare(`
      SELECT si.*, p.name as product_name, p.generic_name
      FROM sale_items si JOIN products p ON p.id=si.product_id WHERE si.sale_id=?`).all(id)
    return sale
  })

  ipcMain.handle('sales:createReturn', (_, data) => {
    const ret = db.transaction(() => {
      // Create return record
      const r = db.prepare(`INSERT INTO sale_returns (sale_id,customer_id,total,notes) VALUES (?,?,?,?)`)
        .run(data.sale_id||null, data.customer_id||null, data.total||0, data.notes||null)
      const returnId = r.lastInsertRowid
      
      console.log('🔄 Processing sales return, Return ID:', returnId)
      
      for (const item of data.items) {
        // Insert return item
        db.prepare(`INSERT INTO sale_return_items (return_id,product_id,batch_id,qty,price,total) VALUES (?,?,?,?,?,?)`)
          .run(returnId, item.product_id, item.batch_id||null, item.qty, item.price, item.total)
        
        console.log(`📦 Return item: product_id=${item.product_id}, qty=${item.qty}, purchase_item_id=${item.purchase_item_id}`)
        
        // Update batch stock if batch exists
        if (item.batch_id) {
          db.prepare('UPDATE batches SET qty=qty+? WHERE id=?').run(item.qty, item.batch_id)
        }
        
        // IMPORTANT: Return stock to purchase_items (decrease qty_sold)
        if (item.purchase_item_id) {
          const before = db.prepare('SELECT qty_sold FROM purchase_items WHERE id=?').get(item.purchase_item_id)
          console.log(`   Before: qty_sold=${before?.qty_sold}`)
          
          db.prepare('UPDATE purchase_items SET qty_sold = qty_sold - ? WHERE id = ?')
            .run(item.qty, item.purchase_item_id)
          
          const after = db.prepare('SELECT qty_sold FROM purchase_items WHERE id=?').get(item.purchase_item_id)
          console.log(`   After: qty_sold=${after?.qty_sold}`)
          console.log(`   ✅ Stock returned to purchase_item_id: ${item.purchase_item_id}`)
        } else {
          console.log(`   ⚠️ No purchase_item_id found for product ${item.product_id}`)
        }
      }
      
      // Update customer balance
      if (data.customer_id) {
        db.prepare('UPDATE customers SET balance=balance-? WHERE id=?').run(data.total, data.customer_id)
      }
      
      console.log('✅ Sales return completed successfully')
      return { id: returnId }
    })
    return ret()
  })

  ipcMain.handle('sales:getReturns', (_, filters = {}) => {
    let q = `SELECT sr.*, c.name as customer_name FROM sale_returns sr
      LEFT JOIN customers c ON c.id=sr.customer_id WHERE 1=1`
    const params = []
    if (filters.from_date) { q += ' AND date(sr.created_at)>=?'; params.push(filters.from_date) }
    if (filters.to_date)   { q += ' AND date(sr.created_at)<=?'; params.push(filters.to_date) }
    q += ' ORDER BY sr.id DESC'
    return db.prepare(q).all(...params)
  })

  ipcMain.handle('sales:getQuotations', () => {
    return db.prepare(`SELECT q.*, c.name as customer_name FROM quotations q
      LEFT JOIN customers c ON c.id=q.customer_id ORDER BY q.id DESC`).all()
  })

  ipcMain.handle('sales:createQuotation', (_, data) => {
    const create = db.transaction(() => {
      const last = db.prepare(`SELECT quote_no FROM quotations ORDER BY id DESC LIMIT 1`).get()
      const num = last ? parseInt(last.quote_no.replace('QT-', '')) + 1 : 1
      const quoteNo = `QT-${String(num).padStart(4, '0')}`
      const r = db.prepare(`INSERT INTO quotations (quote_no,customer_id,total,notes) VALUES (?,?,?,?)`)
        .run(quoteNo, data.customer_id||null, data.total||0, data.notes||null)
      const qId = r.lastInsertRowid
      for (const item of data.items) {
        db.prepare(`INSERT INTO quotation_items (quotation_id,product_id,qty,price,discount_percent,total) VALUES (?,?,?,?,?,?)`)
          .run(qId, item.product_id, item.qty, item.price, item.discount_percent||0, item.total)
      }
      return { id: qId, quote_no: quoteNo }
    })
    return create()
  })

  ipcMain.handle('sales:convertQuotation', (_, id) => {
    db.prepare(`UPDATE quotations SET status='converted' WHERE id=?`).run(id)
    return { success: true }
  })

  ipcMain.handle('sales:getCustomers', () => db.prepare('SELECT * FROM customers WHERE is_active=1 ORDER BY name').all())
  ipcMain.handle('sales:createCustomer', (_, data) => {
    const r = db.prepare(`INSERT INTO customers (name,phone,address,opening_balance,balance,discount_percent) VALUES (?,?,?,?,?,?)`)
      .run(data.name, data.phone||null, data.address||null, data.opening_balance||0, data.opening_balance||0, data.discount_percent||0)
    return { id: r.lastInsertRowid, success: true }
  })
  ipcMain.handle('sales:updateCustomer', (_, data) => {
    db.prepare(`UPDATE customers SET name=?,phone=?,address=?,discount_percent=? WHERE id=?`)
      .run(data.name, data.phone||null, data.address||null, data.discount_percent||0, data.id)
    return { success: true }
  })
  ipcMain.handle('sales:deleteCustomer', (_, id) => {
    db.prepare('UPDATE customers SET is_active=0 WHERE id=?').run(id)
    return { success: true }
  })

  // Dashboard stats IPC (placed here for convenience)
  ipcMain.handle('dashboard:getStats', () => {
    const today = new Date().toISOString().split('T')[0]
    
    // Today's Sales - Subtract today's returns
    const todaySales = db.prepare(`SELECT COALESCE(SUM(grand_total),0) as total, COUNT(*) as count FROM sales WHERE date(created_at)=? AND status != 'voided'`).get(today)
    const todayReturns = db.prepare(`SELECT COALESCE(SUM(total),0) as total FROM sale_returns WHERE date(created_at)=?`).get(today)
    
    // Adjust sales for returns (returns are on the day they occur, not original sale date)
    const adjustedSales = (todaySales?.total || 0) - (todayReturns?.total || 0)
    
    const todayPurchase = db.prepare(`SELECT COALESCE(SUM(grand_total),0) as total FROM purchases WHERE date(created_at)=?`).get(today)
    
    // Low stock: products where (total purchased - total sold) <= alert_qty
    const lowStock = db.prepare(`
      SELECT COUNT(DISTINCT p.id) as count 
      FROM products p
      WHERE p.is_active = 1
      AND (
        SELECT COALESCE(SUM(pi.qty - pi.qty_sold), 0)
        FROM purchase_items pi 
        WHERE pi.product_id = p.id AND pi.qty > pi.qty_sold
      ) <= p.alert_qty
    `).get()
    
    // Expiry alerts: count purchase entries with unsold stock expiring within 180 days (6 months)
    // Only count active products
    // Use JavaScript-based date parsing to handle various date formats
    const d180 = new Date(); d180.setDate(d180.getDate() + 180)
    const d180Timestamp = d180.getTime()
    const todayTimestamp = new Date().getTime()
    
    // Helper function to parse expiry dates
    const parseExpiryDate = (dateStr) => {
      if (!dateStr) return null
      // Try YYYY-MM-DD format
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return new Date(dateStr).getTime()
      }
      // Try MM/DD/YYYY format
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/')
        if (parts.length === 3) {
          const month = parseInt(parts[0])
          const day = parseInt(parts[1])
          const year = parseInt(parts[2])
          if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year > 1900) {
            return new Date(year, month - 1, day).getTime()
          }
        }
      }
      return null
    }
    
    // Get all purchase items with expiry dates
    const allExpiryItems = db.prepare(`
      SELECT pi.expiry_date
      FROM purchase_items pi
      JOIN products p ON p.id = pi.product_id
      WHERE (pi.qty - pi.qty_sold) > 0 
      AND p.is_active = 1
      AND pi.expiry_date IS NOT NULL
    `).all()
    
    // Filter using JavaScript
    const expiringCount = allExpiryItems.filter(item => {
      const expiryTimestamp = parseExpiryDate(item.expiry_date)
      return expiryTimestamp && expiryTimestamp >= todayTimestamp && expiryTimestamp <= d180Timestamp
    }).length
    
    console.log(`📊 Dashboard Stats - Expiry Alerts: ${expiringCount} items expiring within 6 months`)
    
    const pendingRecovery = db.prepare(`SELECT COALESCE(SUM(balance),0) as total FROM customers WHERE balance>0`).get()
    
    // Profit calculation: sale_total - (per_piece_cost * qty_sold)
    // Per-piece cost = purchase_price / pcs_in_pack (with safety check for NULL/0)
    const profitToday = db.prepare(`
      SELECT COALESCE(SUM(si.total - ((pi.purchase_price / CASE WHEN pi.pcs_in_pack IS NULL OR pi.pcs_in_pack = 0 THEN 1 ELSE pi.pcs_in_pack END) * si.qty)),0) as profit
      FROM sale_items si
      JOIN sales s ON s.id=si.sale_id
      LEFT JOIN purchase_items pi ON pi.id=si.purchase_item_id
      WHERE date(s.created_at)=? AND s.status!='voided'`).get(today)
    
    const recentSales = db.prepare(`
      SELECT s.invoice_no, s.grand_total, s.status, s.created_at, c.name as customer_name
      FROM sales s LEFT JOIN customers c ON c.id=s.customer_id
      ORDER BY s.id DESC LIMIT 8`).all()
    
    const weeklySales = db.prepare(`
      SELECT date(created_at) as day, SUM(grand_total) as total
      FROM sales WHERE date(created_at) >= date('now','-6 days') AND status!='voided'
      GROUP BY day ORDER BY day`).all()

    return {
      todaySales: adjustedSales, // Use adjusted sales (sales - returns)
      todaySalesCount: todaySales.count,
      todayPurchase: todayPurchase.total,
      lowStock: lowStock.count,
      expiryAlerts: expiringCount,
      pendingRecovery: pendingRecovery.total,
      profitToday: profitToday.profit,
      recentSales,
      weeklySales,
    }
  })

  // Get product sales history for item history popup
  ipcMain.handle('sales:getProductHistory', (_, productId) => {
    const history = db.prepare(`
      SELECT 
        s.invoice_no,
        s.created_at as sale_date,
        si.qty,
        si.sale_price,
        si.total,
        c.name as customer_name,
        u.full_name as cashier_name
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      LEFT JOIN customers c ON c.id = s.customer_id
      LEFT JOIN users u ON u.id = s.user_id
      WHERE si.product_id = ? AND s.status != 'voided'
      ORDER BY s.created_at DESC
      LIMIT 50
    `).all(productId)
    
    // Get summary stats
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_sales,
        SUM(si.qty) as total_quantity,
        AVG(si.sale_price) as avg_price,
        MAX(si.sale_price) as max_price,
        MIN(si.sale_price) as min_price
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      WHERE si.product_id = ? AND s.status != 'voided'
    `).get(productId)
    
    return {
      history,
      stats: stats || {
        total_sales: 0,
        total_quantity: 0,
        avg_price: 0,
        max_price: 0,
        min_price: 0
      }
    }
  })
}
