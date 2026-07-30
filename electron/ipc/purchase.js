const db = require('../database')

module.exports = (ipcMain) => {

  ipcMain.handle('purchase:getNextInvoiceNo', () => {
    const last = db.prepare(`SELECT invoice_no FROM purchases ORDER BY id DESC LIMIT 1`).get()
    if (!last) return 'INV-0001'
    const num = parseInt(last.invoice_no.replace(/\D/g, '')) + 1
    return `INV-${String(num).padStart(4, '0')}`
  })

  ipcMain.handle('purchase:createPurchase', (_, data) => {
    console.log('🛒 Creating purchase entry...')
    console.log('📋 Purchase data:', JSON.stringify({
      invoice_no: data.invoice_no,
      supplier_id: data.supplier_id,
      items_count: data.items?.length || 0
    }, null, 2))
    
    const create = db.transaction(() => {
      // Auto-generate invoice number if not provided
      let invoiceNo = data.invoice_no
      if (!invoiceNo || !invoiceNo.trim()) {
        const last = db.prepare(`SELECT invoice_no FROM purchases ORDER BY id DESC LIMIT 1`).get()
        const num = last ? parseInt(last.invoice_no.replace(/\D/g, '')) + 1 : 1
        invoiceNo = `INV-${String(num).padStart(4, '0')}`
      }
      
      const r = db.prepare(`
        INSERT INTO purchases (invoice_no,supplier_id,branch_id,payment_method,sub_total,discount,gst_tax_percent,tax,grand_total,paid_amount,notes,user_id)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(invoiceNo, data.supplier_id||null, data.branch_id||1, data.payment_method||'credit',
             data.sub_total||0, data.discount||0, data.gst_tax_percent||0, data.tax||0, data.grand_total||0,
             data.paid_amount||0, data.notes||null, data.user_id||1)
      const purchaseId = r.lastInsertRowid

      for (const item of data.items) {
        let productId = item.product_id
        
        // Handle manual category name - NO LONGER NEEDED, REMOVED
        // Category column completely removed from Purchase Entry
        
        // If product_id is null, create new product first
        if (!productId) {
          console.log('🆕 Creating new product:', item.product_name)
          console.log('   - Company:', item.company_name)
          console.log('   - pcs_in_pack:', item.pcs_in_pack)
          console.log('   - Sale Price:', item.sale_price)
          console.log('   - Purchase Price:', item.purchase_price)
          
          const productResult = db.prepare(`
            INSERT INTO products (name,generic_name,rack_location,pcs_in_pack,sale_price,trade_price,is_active)
            VALUES (?,?,?,?,?,?,1)
          `).run(
            item.product_name || 'Unnamed Product',
            item.company_name || null, // Company name stored in generic_name field
            item.rack_location || null,
            item.pcs_in_pack || 1,
            item.sale_price || 0,
            item.purchase_price || 0
          )
          productId = productResult.lastInsertRowid
          console.log(`✅ NEW PRODUCT CREATED with ID: ${productId}`)
          console.log(`   Database Row Inserted: products table, id=${productId}`)
          
          // Verify the product was created
          const verifyProduct = db.prepare('SELECT * FROM products WHERE id=?').get(productId)
          console.log(`✅ Verification - Product in database:`, verifyProduct)
        } else {
          console.log(`♻️ Updating existing product ID: ${productId}`)
          // Update existing product prices
          db.prepare('UPDATE products SET trade_price=?,sale_price=?,updated_at=datetime(\'now\') WHERE id=?')
            .run(item.purchase_price||0, item.sale_price||item.purchase_price||0, productId)
          console.log(`✅ Product prices updated`)
        }
        
        // Insert into purchase_items (no batch creation - direct tracking)
        // Use profit_percent from frontend (already includes discount and bonus)
        const profitPercent = item.profit_percent || 0
        
        const purchaseItemResult = db.prepare(`
          INSERT INTO purchase_items (purchase_id,product_id,expiry_date,purchase_price,sale_price,qty,qty_in_boxes,qty_loose,pcs_in_pack,qty_sold,bonus,discount_percent,total,profit_percent)
          VALUES (?,?,?,?,?,?,?,?,?,0,?,?,?,?)
        `).run(purchaseId, productId, item.expiry_date||null,
              item.purchase_price||0, item.sale_price||0, item.qty, 
              item.qty_in_boxes||0, item.qty_loose||0, item.pcs_in_pack||1,
              item.bonus||0, item.discount_percent||0, item.total, profitPercent)
        
        const purchaseItemId = purchaseItemResult.lastInsertRowid
        console.log(`✅ Purchase item created with ID: ${purchaseItemId}, product_id: ${productId}, qty: ${item.qty}`)
      }

      // Update supplier balance
      if (data.supplier_id && data.payment_method === 'credit') {
        db.prepare('UPDATE suppliers SET balance=balance+? WHERE id=?').run(data.grand_total, data.supplier_id)
      } else if (data.supplier_id && data.paid_amount < data.grand_total) {
        db.prepare('UPDATE suppliers SET balance=balance+? WHERE id=?').run(data.grand_total - data.paid_amount, data.supplier_id)
      }

      console.log(`✅ Purchase entry completed: Invoice ${invoiceNo}, ID: ${purchaseId}`)
      return { id: purchaseId, invoice_no: invoiceNo, success: true }
    })
    return create()
  })

  ipcMain.handle('purchase:getPurchases', (_, filters = {}) => {
    let q = `SELECT p.*, s.name as supplier_name FROM purchases p
      LEFT JOIN suppliers s ON s.id=p.supplier_id WHERE 1=1`
    const params = []
    if (filters.from_date) { q += ' AND date(p.created_at)>=?'; params.push(filters.from_date) }
    if (filters.to_date)   { q += ' AND date(p.created_at)<=?'; params.push(filters.to_date) }
    if (filters.supplier_id) { q += ' AND p.supplier_id=?'; params.push(filters.supplier_id) }
    if (filters.search)    { q += ' AND (p.invoice_no LIKE ? OR s.name LIKE ?)'; params.push(`%${filters.search}%`, `%${filters.search}%`) }
    q += ' ORDER BY p.id DESC'
    return db.prepare(q).all(...params)
  })

  ipcMain.handle('purchase:getPurchaseById', (_, id) => {
    const purchase = db.prepare(`SELECT p.*, s.name as supplier_name FROM purchases p
      LEFT JOIN suppliers s ON s.id=p.supplier_id WHERE p.id=?`).get(id)
    if (!purchase) return null
    purchase.items = db.prepare(`SELECT pi.*, pr.name as product_name FROM purchase_items pi
      JOIN products pr ON pr.id=pi.product_id WHERE pi.purchase_id=?`).all(id)
    return purchase
  })

  ipcMain.handle('purchase:createReturn', (_, data) => {
    const ret = db.transaction(() => {
      const r = db.prepare(`INSERT INTO purchase_returns (purchase_id,supplier_id,total,notes) VALUES (?,?,?,?)`)
        .run(data.purchase_id||null, data.supplier_id||null, data.total||0, data.notes||null)
      const returnId = r.lastInsertRowid
      for (const item of data.items) {
        db.prepare(`INSERT INTO purchase_return_items (return_id,product_id,batch_id,qty,price,total) VALUES (?,?,?,?,?,?)`)
          .run(returnId, item.product_id, item.batch_id||null, item.qty, item.price, item.total)
        if (item.batch_id) {
          db.prepare('UPDATE batches SET qty=qty-? WHERE id=?').run(item.qty, item.batch_id)
        }
      }
      if (data.supplier_id) {
        db.prepare('UPDATE suppliers SET balance=balance-? WHERE id=?').run(data.total, data.supplier_id)
      }
      return { id: returnId }
    })
    return ret()
  })

  ipcMain.handle('purchase:getReturns', () => {
    return db.prepare(`SELECT pr.*, s.name as supplier_name FROM purchase_returns pr
      LEFT JOIN suppliers s ON s.id=pr.supplier_id ORDER BY pr.id DESC`).all()
  })

  ipcMain.handle('purchase:getSuppliers', () => db.prepare('SELECT * FROM suppliers WHERE is_active=1 ORDER BY name').all())
  
  // Get supplier companies
  ipcMain.handle('purchase:getSupplierCompanies', (_, supplierId) => {
    return db.prepare('SELECT * FROM supplier_companies WHERE supplier_id = ? ORDER BY company_name').all(supplierId)
  })
  
  // Add companies to supplier
  ipcMain.handle('purchase:addSupplierCompanies', (_, { supplierId, companies }) => {
    const insert = db.transaction(() => {
      // Delete old companies
      db.prepare('DELETE FROM supplier_companies WHERE supplier_id = ?').run(supplierId)
      // Insert new companies
      const stmt = db.prepare('INSERT INTO supplier_companies (supplier_id, company_name) VALUES (?, ?)')
      companies.forEach(companyName => {
        if (companyName && companyName.trim()) {
          stmt.run(supplierId, companyName.trim())
        }
      })
    })
    insert()
    return { success: true }
  })
  
  // Get products by company name (for filtering)
  ipcMain.handle('purchase:getProductsByCompany', (_, companyName) => {
    return db.prepare(`
      SELECT DISTINCT 
        p.id, 
        p.name, 
        p.generic_name, 
        p.pcs_in_pack, 
        p.trade_price, 
        p.sale_price,
        p.rack_location, 
        pi.expiry_date, 
        pi.sale_price as last_sale_price, 
        pi.purchase_price as last_purchase_price,
        COALESCE(SUM(pi.qty - pi.qty_sold), 0) as stock
      FROM products p
      JOIN purchase_items pi ON pi.product_id = p.id
      JOIN purchases pu ON pu.id = pi.purchase_id
      WHERE p.generic_name = ? AND p.is_active = 1
      GROUP BY p.id
      ORDER BY pu.created_at DESC
      LIMIT 50
    `).all(companyName)
  })
  
  // NEW: Get products previously purchased from a supplier
  ipcMain.handle('purchase:getSupplierProducts', (_, supplierId) => {
    return db.prepare(`
      SELECT DISTINCT p.id, p.name, p.pcs_in_pack, p.trade_price, p.sale_price
      FROM products p
      JOIN purchase_items pi ON pi.product_id = p.id
      JOIN purchases pu ON pu.id = pi.purchase_id
      WHERE pu.supplier_id = ? AND p.is_active = 1
      ORDER BY pi.id DESC
      LIMIT 30
    `).all(supplierId)
  })
  
  ipcMain.handle('purchase:createSupplier', (_, data) => {
    const r = db.prepare(`INSERT INTO suppliers (name,contact_person,phone,email,address,opening_balance,balance) VALUES (?,?,?,?,?,?,?)`)
      .run(data.name, data.contact_person||null, data.phone||null, data.email||null, data.address||null, data.opening_balance||0, data.opening_balance||0)
    return { id: r.lastInsertRowid, success: true }
  })
  ipcMain.handle('purchase:updateSupplier', (_, data) => {
    db.prepare(`UPDATE suppliers SET name=?,contact_person=?,phone=?,email=?,address=? WHERE id=?`)
      .run(data.name, data.contact_person||null, data.phone||null, data.email||null, data.address||null, data.id)
    return { success: true }
  })
  ipcMain.handle('purchase:deleteSupplier', (_, id) => {
    db.prepare('UPDATE suppliers SET is_active=0 WHERE id=?').run(id)
    return { success: true }
  })

  ipcMain.handle('purchase:createPO', (_, data) => {
    const create = db.transaction(() => {
      const last = db.prepare(`SELECT po_number FROM purchase_orders ORDER BY id DESC LIMIT 1`).get()
      const num = last ? parseInt(last.po_number.replace('PO-', '')) + 1 : 1
      const poNo = `PO-${String(num).padStart(4, '0')}`
      const r = db.prepare(`INSERT INTO purchase_orders (po_number,supplier_id,notes) VALUES (?,?,?)`)
        .run(poNo, data.supplier_id||null, data.notes||null)
      const poId = r.lastInsertRowid
      for (const item of data.items) {
        db.prepare(`INSERT INTO purchase_order_items (po_id,product_id,qty,purchase_price) VALUES (?,?,?,?)`)
          .run(poId, item.product_id, item.qty, item.purchase_price||0)
      }
      return { id: poId, po_number: poNo }
    })
    return create()
  })

  ipcMain.handle('purchase:getPOs', () => {
    return db.prepare(`SELECT po.*, s.name as supplier_name FROM purchase_orders po
      LEFT JOIN suppliers s ON s.id=po.supplier_id ORDER BY po.id DESC`).all()
  })
}
