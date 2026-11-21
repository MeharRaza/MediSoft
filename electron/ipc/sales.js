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
    console.log('📝 Customer data:', {
      customer_id: data.customer_id,
      customer_name: data.customer_name
    })
    const create = db.transaction(() => {
      const invNo = nextInvoiceNo('INV-')
      // Get current local time explicitly
      const localTime = db.prepare(`SELECT datetime('now', 'localtime') as dt`).get().dt
      console.log('📅 Creating invoice with local time:', localTime)
      
      const r = db.prepare(`
        INSERT INTO sales (invoice_no,customer_id,customer_name,branch_id,user_id,payment_method,sub_total,discount,tax,grand_total,paid_amount,change_amount,status,notes,created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(invNo, data.customer_id||null, data.customer_name||null, data.branch_id||1, data.user_id||1,
             data.payment_method||'cash', data.sub_total||0, data.discount||0, data.tax||0,
             data.grand_total||0, data.paid_amount||0, data.change_amount||0,
             data.payment_method === 'credit' ? 'credit' : 'paid', data.notes||null, localTime)

      const saleId = r.lastInsertRowid
      console.log(`✅ Sale created with ID: ${saleId}, Invoice: ${invNo}`)

      for (const item of data.items) {
        const itemRequestedQty = parseFloat(item.qty) || 0
        if (itemRequestedQty <= 0) continue

        // Check if item.splits is valid AND its total qty matches itemRequestedQty
        const splitsTotalQty = (item.splits && Array.isArray(item.splits) && item.splits.length > 0)
          ? item.splits.reduce((s, sp) => s + (parseFloat(sp.qty) || 0), 0)
          : 0

        const hasValidSplits = Boolean(
          item.splits && 
          item.splits.length > 0 && 
          Math.abs(splitsTotalQty - itemRequestedQty) < 0.001
        )

        console.log(`📦 Processing sale item:`, {
          product_id: item.product_id,
          qty: itemRequestedQty,
          sale_price: item.sale_price,
          hasValidSplits,
          splitsTotalQty
        })

        if (hasValidSplits) {
          // Use verified pre-calculated splits
          for (const split of item.splits) {
            const splitQty = parseFloat(split.qty) || 0
            if (splitQty <= 0) continue

            const splitPrice = parseFloat(item.sale_price) || 0
            const splitDisc = parseFloat(item.discount_percent) || 0
            const splitTotal = Math.round(splitQty * splitPrice * (1 - splitDisc / 100) * 100) / 100

            db.prepare(`
              INSERT INTO sale_items (sale_id,product_id,purchase_item_id,expiry_date,qty,sale_price,discount_percent,total)
              VALUES (?,?,?,?,?,?,?,?)
            `).run(
              saleId, item.product_id, split.purchase_item_id || null,
              split.expiry_date || item.expiry_date || null,
              splitQty,
              splitPrice,
              splitDisc,
              splitTotal
            )

            // Update qty_sold for this batch if valid batch exists
            if (split.purchase_item_id) {
              db.prepare('UPDATE purchase_items SET qty_sold = qty_sold + ? WHERE id=?')
                .run(splitQty, split.purchase_item_id)
              console.log(`   ✅ Pre-split: Batch ${split.purchase_item_id} → qty ${splitQty}, qty_sold updated`)
            }
          }
        } else {
          // Dynamic FIFO distribution across available batches for the FULL itemRequestedQty!
          const batchesAvailable = db.prepare(`
            SELECT pi.id, pi.qty, pi.qty_sold, pi.expiry_date,
                   pi.sale_price, pi.pcs_in_pack,
                   (pi.qty - pi.qty_sold) as remaining
            FROM purchase_items pi
            JOIN purchases pu ON pu.id = pi.purchase_id
            WHERE pi.product_id = ?
              AND (pi.qty - pi.qty_sold) > 0
            ORDER BY CASE WHEN pi.expiry_date IS NOT NULL AND pi.expiry_date < date('now') THEN 1 ELSE 0 END ASC,
                     pi.expiry_date ASC NULLS LAST, pu.created_at ASC
          `).all(item.product_id)

          let qtyNeeded = itemRequestedQty
          const batchSplits = []

          for (const batch of batchesAvailable) {
            if (qtyNeeded <= 0) break
            const take = Math.min(qtyNeeded, batch.remaining)
            if (take <= 0) continue
            const pcsInPack = batch.pcs_in_pack || 1
            const batchUnitSalePrice = Math.round((batch.sale_price / pcsInPack) * 100) / 100
            
            batchSplits.push({
              purchase_item_id: batch.id,
              qty: take,
              expiry_date: batch.expiry_date,
              sale_price: item.price_overridden ? item.sale_price : batchUnitSalePrice
            })
            qtyNeeded -= take
          }

          // If still need more, take from the frontend-selected batch or last available
          if (qtyNeeded > 0 && item.purchase_item_id) {
            const existing = batchSplits.find(b => b.purchase_item_id === item.purchase_item_id)
            if (existing) {
              existing.qty += qtyNeeded
            } else {
              const batch = db.prepare('SELECT expiry_date, sale_price, pcs_in_pack FROM purchase_items WHERE id=?').get(item.purchase_item_id)
              const pcsInPack = batch?.pcs_in_pack || 1
              const batchUnitSalePrice = batch ? Math.round((batch.sale_price / pcsInPack) * 100) / 100 : item.sale_price
              batchSplits.push({
                purchase_item_id: item.purchase_item_id,
                qty: qtyNeeded,
                expiry_date: batch?.expiry_date || null,
                sale_price: item.price_overridden ? item.sale_price : batchUnitSalePrice
              })
            }
            qtyNeeded = 0
          }

          // If no batches found at all, fall back to item default
          if (batchSplits.length === 0) {
            let exp = item.expiry_date || null
            if (item.purchase_item_id) {
              const batch = db.prepare('SELECT expiry_date FROM purchase_items WHERE id=?').get(item.purchase_item_id)
              if (batch?.expiry_date) exp = batch.expiry_date
            }
            batchSplits.push({
              purchase_item_id: item.purchase_item_id || null,
              qty: itemRequestedQty,
              expiry_date: exp,
              sale_price: item.sale_price
            })
          }

          console.log(`   FIFO dynamic splits for ${itemRequestedQty} qty:`, batchSplits)

          for (const split of batchSplits) {
            const splitPrice = split.sale_price !== undefined ? split.sale_price : item.sale_price
            const splitDisc = parseFloat(item.discount_percent) || 0
            const splitTotal = Math.round(split.qty * splitPrice * (1 - splitDisc / 100) * 100) / 100

            db.prepare(`
              INSERT INTO sale_items (sale_id,product_id,purchase_item_id,expiry_date,qty,sale_price,discount_percent,total)
              VALUES (?,?,?,?,?,?,?,?)`
            ).run(
              saleId, item.product_id, split.purchase_item_id,
              split.expiry_date || null,
              split.qty,
              splitPrice,
              splitDisc,
              splitTotal
            )

            // Update qty_sold for this batch if valid batch exists
            if (split.purchase_item_id) {
              db.prepare('UPDATE purchase_items SET qty_sold = qty_sold + ? WHERE id=?')
                .run(split.qty, split.purchase_item_id)
              console.log(`   ✅ Dynamic split: Batch ${split.purchase_item_id} → qty ${split.qty}, qty_sold updated`)
            }
          }
        }
      }

      // Synchronize sales sub_total and grand_total with actual sale_items totals
      const itemsGross = db.prepare(`SELECT COALESCE(SUM(qty * sale_price), 0) as s FROM sale_items WHERE sale_id=?`).get(saleId).s
      const itemsNet = db.prepare(`SELECT COALESCE(SUM(total), 0) as s FROM sale_items WHERE sale_id=?`).get(saleId).s
      const invoiceDiscount = parseFloat(data.discount) || 0
      const calculatedGrandTotal = Math.max(0, itemsNet - (invoiceDiscount > (itemsGross - itemsNet) ? (invoiceDiscount - (itemsGross - itemsNet)) : 0))
      
      const finalSubTotal = data.sub_total > 0 ? data.sub_total : itemsGross
      const finalGrandTotal = data.grand_total > 0 ? data.grand_total : calculatedGrandTotal
      
      db.prepare(`UPDATE sales SET sub_total=?, grand_total=? WHERE id=?`).run(finalSubTotal, finalGrandTotal, saleId)

      // Update customer balance if credit
      if (data.customer_id && data.payment_method === 'credit') {
        db.prepare('UPDATE customers SET balance=balance+? WHERE id=?').run(data.grand_total, data.customer_id)
      } else if (data.customer_id && data.paid_amount < data.grand_total) {
        db.prepare('UPDATE customers SET balance=balance+? WHERE id=?').run(data.grand_total - data.paid_amount, data.customer_id)
      }

      console.log('✅ Sale transaction completed successfully')
      return { id: saleId, invoice_no: invNo }
    })
    const res = create()
    if (db.logActivity) {
      db.logActivity('SALE_CREATED', `Invoice #${res.invoice_no} created for PKR ${data.grand_total || 0} (${data.items?.length || 0} items) - Customer: ${data.customer_name || 'Walk-in'}`, {
        userId: data.user_id,
        username: data.cashier_name || data.created_by || 'Cashier',
        counterName: data.counter_name
      })
    }
    return res
  })

  ipcMain.handle('sales:getInvoices', (_, filters = {}) => {
    let q = `
      SELECT s.id, s.invoice_no, s.customer_id, s.branch_id, s.user_id, s.payment_method,
             s.sub_total, s.discount, s.tax, s.grand_total, s.paid_amount, s.change_amount,
             s.status, s.notes, s.created_at,
             COALESCE(s.customer_name, c.name, 'Walk-in') as customer_name,
             COALESCE(u.full_name, u.username, 'Administrator') as cashier_name
      FROM sales s
      LEFT JOIN customers c ON c.id=s.customer_id
      LEFT JOIN users u ON u.id=s.user_id
      WHERE 1=1`
    const params = []
    if (filters.from_date) {
      q += ' AND s.created_at >= ?'
      params.push(filters.from_date.includes(' ') ? filters.from_date : `${filters.from_date} 00:00:00`)
    }
    if (filters.to_date) {
      q += ' AND s.created_at <= ?'
      params.push(filters.to_date.includes(' ') ? filters.to_date : `${filters.to_date} 23:59:59`)
    }
    if (filters.status)    { q += ' AND s.status=?'; params.push(filters.status) }
    if (filters.customer_id) { q += ' AND s.customer_id=?'; params.push(filters.customer_id) }
    if (filters.user_id)   { q += ' AND s.user_id=?'; params.push(filters.user_id) }
    
    // Enhanced search: Invoice#, Customer name, OR Product name
    if (filters.search) { 
      q += ` AND (
        s.invoice_no LIKE ? 
        OR s.customer_name LIKE ?
        OR c.name LIKE ? 
        OR s.id IN (
          SELECT si.sale_id FROM sale_items si 
          JOIN products p ON p.id = si.product_id 
          WHERE p.name LIKE ?
        )
      )`
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`)
    }
    
    q += ' ORDER BY s.id DESC'
    if (filters.limit) { q += ' LIMIT ?'; params.push(filters.limit) }
    
    return db.prepare(q).all(...params)
  })

  ipcMain.handle('sales:getInvoiceById', (_, id) => {
    const sale = db.prepare(`
      SELECT s.*, 
        COALESCE(s.customer_name, c.name) as customer_name
      FROM sales s
      LEFT JOIN customers c ON c.id=s.customer_id 
      WHERE s.id=?`).get(id)
    if (!sale) return null
    
    // Get all items from original sale
    sale.items = db.prepare(`
      SELECT si.*, p.name as product_name, p.generic_name
      FROM sale_items si JOIN products p ON p.id=si.product_id WHERE si.sale_id=?`).all(id)
    
    // Get return history for this invoice
    sale.returns = db.prepare(`
      SELECT sr.id, sr.total, sr.notes, sr.created_at,
             GROUP_CONCAT(p.name || ' (Qty: ' || sri.qty || ')', ', ') as returned_items
      FROM sale_returns sr
      LEFT JOIN sale_return_items sri ON sri.return_id = sr.id
      LEFT JOIN products p ON p.id = sri.product_id
      WHERE sr.sale_id = ?
      GROUP BY sr.id
      ORDER BY sr.created_at DESC
    `).all(id)
    
    // Calculate already returned quantities for each item
    const returnedQtys = db.prepare(`
      SELECT sri.product_id, SUM(sri.qty) as returned_qty
      FROM sale_return_items sri
      JOIN sale_returns sr ON sr.id = sri.return_id
      WHERE sr.sale_id = ?
      GROUP BY sri.product_id
    `).all(id)
    
    // Create map of returned quantities
    const returnedMap = {}
    returnedQtys.forEach(r => {
      returnedMap[r.product_id] = r.returned_qty || 0
    })
    
    // Calculate remaining quantities and adjust totals
    let remainingSubTotal = 0
    sale.items = sale.items.map(item => {
      const returnedQty = returnedMap[item.product_id] || 0
      const remainingQty = item.qty - returnedQty
      const remainingTotal = remainingQty * item.sale_price
      remainingSubTotal += remainingTotal
      
      return {
        ...item,
        original_qty: item.qty,
        returned_qty: returnedQty,
        remaining_qty: remainingQty,
        remaining_total: remainingTotal
      }
    }).filter(item => item.remaining_qty > 0) // Only show items with remaining qty
    
    // Calculate adjusted invoice totals based on remaining items
    if (sale.sub_total > 0) {
      const remainingRatio = remainingSubTotal / sale.sub_total
      sale.remaining_sub_total = remainingSubTotal
      sale.remaining_discount = sale.discount * remainingRatio
      sale.remaining_grand_total = sale.grand_total * remainingRatio
      
      console.log(`📄 Invoice ${sale.invoice_no}:`)
      console.log(`   Original: ${sale.sub_total} → After discount: ${sale.grand_total}`)
      console.log(`   Remaining: ${sale.remaining_sub_total} → After discount: ${sale.remaining_grand_total}`)
    } else {
      sale.remaining_sub_total = 0
      sale.remaining_discount = 0
      sale.remaining_grand_total = 0
    }
    
    return sale
  })

  ipcMain.handle('sales:createReturn', (_, data) => {
    const ret = db.transaction(() => {
      console.log('🔄 Processing sales return...')
      console.log('📋 Return data received:', { 
        sale_id: data.sale_id, 
        items_count: data.items?.length, 
        total: data.total 
      })
      
      // Get original sale for reference
      const originalSale = db.prepare(`SELECT invoice_no, sub_total, discount, grand_total FROM sales WHERE id=?`).get(data.sale_id)
      
      if (!originalSale) {
        console.error('❌ Original sale not found!')
        throw new Error('Original sale not found')
      }
      
      console.log('📄 Original sale:', originalSale)
      console.log('💵 Return total (after user-provided discount):', data.total)
      
      // Get current local time explicitly
      const localTime = db.prepare(`SELECT datetime('now', 'localtime') as dt`).get().dt
      
      // Calculate total profit being returned (for logging/tracking)
      let totalReturnedProfit = 0
      
      // Create return record with final amount (discount already applied by frontend)
      const r = db.prepare(`INSERT INTO sale_returns (sale_id,customer_id,total,notes,created_at) VALUES (?,?,?,?,?)`)
        .run(data.sale_id||null, data.customer_id||null, data.total, data.notes||null, localTime)
      const returnId = r.lastInsertRowid
      
      console.log(`✅ Return record created with ID: ${returnId}, Total: ${data.total}`)
      
      for (const item of data.items) {
        // Get purchase_item_id from original sale_items
        let purchaseItemId = item.purchase_item_id || null
        
        // If not provided, look it up from sale_items
        if (!purchaseItemId) {
          const saleItem = db.prepare(`
            SELECT purchase_item_id 
            FROM sale_items 
            WHERE sale_id = ? AND product_id = ?
            LIMIT 1
          `).get(data.sale_id, item.product_id)
          
          purchaseItemId = saleItem?.purchase_item_id || null
          console.log(`   🔍 Found purchase_item_id from sale_items: ${purchaseItemId}`)
        }
        
        // Final fallback: FIFO oldest batch for this product
        if (!purchaseItemId) {
          const fifoBatch = db.prepare(`
            SELECT pi.id FROM purchase_items pi
            JOIN purchases pu ON pu.id = pi.purchase_id
            WHERE pi.product_id = ?
            ORDER BY pi.expiry_date ASC NULLS LAST, pu.created_at ASC
            LIMIT 1
          `).get(item.product_id)
          purchaseItemId = fifoBatch?.id || null
          console.log(`   🔍 FIFO fallback purchase_item_id: ${purchaseItemId}`)
        }
        
        // Get purchase price for profit calculation
        let purchasePrice = 0
        if (purchaseItemId) {
          const purchaseItem = db.prepare(`
            SELECT purchase_price, sale_price, pcs_in_pack, profit_percent, total, qty, bonus, qty_in_boxes 
            FROM purchase_items 
            WHERE id=?
          `).get(purchaseItemId)
          
          if (purchaseItem) {
            // Calculate effective per-piece purchase price (accounting for profit_percent, bonus, and discounts)
            const pcsInPack = purchaseItem.pcs_in_pack || 1
            if (purchaseItem.profit_percent && purchaseItem.profit_percent !== 0) {
              purchasePrice = (purchaseItem.sale_price / pcsInPack) * (1 - (purchaseItem.profit_percent / 100))
            } else if (purchaseItem.total > 0 && purchaseItem.qty > 0) {
              purchasePrice = purchaseItem.total / purchaseItem.qty
            } else if (purchaseItem.bonus > 0 && (purchaseItem.qty_in_boxes + purchaseItem.bonus) > 0) {
              purchasePrice = (purchaseItem.purchase_price * purchaseItem.qty_in_boxes) / ((purchaseItem.qty_in_boxes + purchaseItem.bonus) * pcsInPack)
            } else {
              purchasePrice = purchaseItem.purchase_price / pcsInPack
            }
            
            // Calculate returned profit for this item
            const itemReturnedProfit = (item.price - purchasePrice) * item.qty
            totalReturnedProfit += itemReturnedProfit
            
            console.log(`   📊 Item profit calculation:`)
            console.log(`      Sale Price: ${item.price}, Effective Purchase Price: ${purchasePrice.toFixed(2)}`)
            console.log(`      Qty: ${item.qty}, Returned Profit: ${itemReturnedProfit.toFixed(2)}`)
          }
        }
        
        // Insert return item WITH purchase_item_id (critical for profit tracking)
        db.prepare(`INSERT INTO sale_return_items (return_id,product_id,batch_id,qty,price,total,purchase_item_id) VALUES (?,?,?,?,?,?,?)`)
          .run(returnId, item.product_id, item.batch_id||null, item.qty, item.price, item.total, purchaseItemId)
        
        console.log(`📦 Return item inserted: product_id=${item.product_id}, qty=${item.qty}, price=${item.price}, purchase_item_id=${purchaseItemId}`)
        
        // Update batch stock if batch exists
        if (item.batch_id) {
          db.prepare('UPDATE batches SET qty=qty+? WHERE id=?').run(item.qty, item.batch_id)
        }
        
        // IMPORTANT: Return stock to purchase_items (decrease qty_sold)
        if (purchaseItemId) {
          const before = db.prepare('SELECT qty_sold FROM purchase_items WHERE id=?').get(purchaseItemId)
          console.log(`   Before: qty_sold=${before?.qty_sold}`)
          
          db.prepare('UPDATE purchase_items SET qty_sold = qty_sold - ? WHERE id = ?')
            .run(item.qty, purchaseItemId)
          
          const after = db.prepare('SELECT qty_sold FROM purchase_items WHERE id=?').get(purchaseItemId)
          console.log(`   After: qty_sold=${after?.qty_sold}`)
          console.log(`   ✅ Stock returned to purchase_item_id: ${purchaseItemId}`)
        } else {
          console.log(`   ⚠️ No purchase_item_id found for product ${item.product_id}`)
        }
      }
      
      console.log(`💰 Total Returned Profit: Rs. ${totalReturnedProfit.toFixed(2)}`)
      
      // Update customer balance with final return amount
      if (data.customer_id) {
        db.prepare('UPDATE customers SET balance=balance-? WHERE id=?').run(data.total, data.customer_id)
        console.log(`💳 Customer balance reduced by: ${data.total}`)
      }
      
      console.log('✅ Sales return completed successfully')
      return { id: returnId, total: data.total, returnedProfit: totalReturnedProfit }
    })
    const retRes = ret()
    if (db.logActivity) {
      db.logActivity('SALE_RETURNED', `Sale return recorded for PKR ${data.total || 0} (${data.items?.length || 0} items) - Return #${retRes.id}`, {
        userId: data.user_id,
        username: data.cashier_name || 'Cashier'
      })
    }
    return retRes
  })

  ipcMain.handle('sales:getReturns', (_, filters = {}) => {
    let q = `SELECT sr.*, COALESCE(c.name, 'Walk-in') as customer_name FROM sale_returns sr
      LEFT JOIN customers c ON c.id=sr.customer_id WHERE 1=1`
    const params = []
    if (filters.from_date) {
      q += ' AND sr.created_at >= ?'
      params.push(filters.from_date.includes(' ') ? filters.from_date : `${filters.from_date} 00:00:00`)
    }
    if (filters.to_date) {
      q += ' AND sr.created_at <= ?'
      params.push(filters.to_date.includes(' ') ? filters.to_date : `${filters.to_date} 23:59:59`)
    }
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
  
  // Get recent walk-in customer names from sales history
  ipcMain.handle('sales:getRecentWalkInNames', () => {
    return db.prepare(`
      SELECT customer_name as name
      FROM sales
      WHERE customer_name IS NOT NULL
        AND customer_id IS NULL
        AND customer_name != ''
      GROUP BY customer_name
      ORDER BY MAX(id) DESC
      LIMIT 50
    `).all()
  })
  
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
    // Get today's date from SQLite in local time (to match how we're storing dates)
    const today = db.prepare(`SELECT date('now', 'localtime') as today`).get().today
    console.log(`📊 Dashboard Stats - Today (local): ${today}`)
    
    // Today's Sales
    const todaySales = db.prepare(`SELECT COALESCE(SUM(grand_total),0) as total, COUNT(*) as count FROM sales WHERE date(created_at)=? AND status != 'voided'`).get(today)
    
    // Today's Returns (using discounted amounts stored in sale_returns.total)
    const todayReturns = db.prepare(`SELECT COALESCE(SUM(total),0) as total, COUNT(*) as count FROM sale_returns WHERE date(created_at)=?`).get(today)
    
    // Net Sales = Gross Sales - Returns (both amounts now account for discounts)
    const adjustedSales = (todaySales?.total || 0) - (todayReturns?.total || 0)
    
    console.log(`   Gross Sales: ${todaySales?.total || 0}`)
    console.log(`   Returns: ${todayReturns?.total || 0}`)
    console.log(`   Net Sales: ${adjustedSales}`)
    
    const todayPurchase = db.prepare(`SELECT COALESCE(SUM(grand_total),0) as total FROM purchases WHERE date(created_at)=?`).get(today)
    
    // Low stock: products where (total purchased - total sold) <= alert_qty
    const lowStock = db.prepare(`
      SELECT COUNT(DISTINCT p.id) as count 
      FROM products p
      WHERE p.is_active = 1
      AND (
        SELECT COALESCE(SUM(pi.qty - pi.qty_sold), 0)
        FROM purchase_items pi 
        WHERE pi.product_id = p.id
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
    
    const pendingRecovery = db.prepare(`SELECT COALESCE(SUM(balance),0) as total FROM customers WHERE balance>0`).get()
    
    // Profit calculation considering ALL discounts AND returns
    // Step 1: Calculate profit from all sales
    const soldProfit = db.prepare(`
      SELECT 
        COALESCE(
          SUM(
            -- Actual revenue for this item after all discounts
            COALESCE(((si.total / NULLIF(s.sub_total, 0)) * s.grand_total), si.total, 0)
            -- Minus cost price (use purchase batch cost with bonus/profit_percent, or product trade_price fallback)
            - (
                (
                  CASE
                    WHEN pi.profit_percent IS NOT NULL AND pi.profit_percent != 0
                      THEN ((pi.sale_price / CASE WHEN COALESCE(pi.pcs_in_pack, p.pcs_in_pack, 1) <= 0 THEN 1 ELSE COALESCE(pi.pcs_in_pack, p.pcs_in_pack, 1) END) * (1 - pi.profit_percent / 100.0))
                    WHEN pi.total > 0 AND pi.qty > 0
                      THEN (pi.total / pi.qty)
                    WHEN (pi.qty_in_boxes + COALESCE(pi.bonus, 0)) > 0 AND pi.bonus > 0
                      THEN ((pi.purchase_price * pi.qty_in_boxes) / ((pi.qty_in_boxes + pi.bonus) * CASE WHEN COALESCE(pi.pcs_in_pack, p.pcs_in_pack, 1) <= 0 THEN 1 ELSE COALESCE(pi.pcs_in_pack, p.pcs_in_pack, 1) END))
                    WHEN pi.purchase_price > 0
                      THEN (pi.purchase_price / CASE WHEN COALESCE(pi.pcs_in_pack, p.pcs_in_pack, 1) <= 0 THEN 1 ELSE COALESCE(pi.pcs_in_pack, p.pcs_in_pack, 1) END)
                    ELSE (COALESCE(p.trade_price, 0) / CASE WHEN COALESCE(p.pcs_in_pack, 1) <= 0 THEN 1 ELSE COALESCE(p.pcs_in_pack, 1) END)
                  END
                ) * si.qty
              )
          ),
          0
        ) as profit
      FROM sale_items si
      JOIN sales s ON s.id=si.sale_id
      JOIN products p ON p.id=si.product_id
      LEFT JOIN purchase_items pi ON pi.id=si.purchase_item_id
      WHERE date(s.created_at)=? AND s.status!='voided'`).get(today).profit
    
    // Step 2: Calculate profit that was returned (should be subtracted)
    // IMPORTANT: Use actual return amount (with discount), not just qty × price
    const returnedProfit = db.prepare(`
      SELECT 
        COALESCE(
          SUM(
            -- Use actual return total from sale_returns (has discount applied)
            -- Distribute it proportionally to items
            COALESCE(((sri.qty * sri.price) / NULLIF((SELECT SUM(qty * price) FROM sale_return_items WHERE return_id = sri.return_id), 0)) * sr.total, sri.qty * sri.price, 0)
            -- Minus cost price of returned items
            - (
                (
                  CASE
                    WHEN pi.profit_percent IS NOT NULL AND pi.profit_percent != 0
                      THEN ((pi.sale_price / CASE WHEN COALESCE(pi.pcs_in_pack, p.pcs_in_pack, 1) <= 0 THEN 1 ELSE COALESCE(pi.pcs_in_pack, p.pcs_in_pack, 1) END) * (1 - pi.profit_percent / 100.0))
                    WHEN pi.total > 0 AND pi.qty > 0
                      THEN (pi.total / pi.qty)
                    WHEN (pi.qty_in_boxes + COALESCE(pi.bonus, 0)) > 0 AND pi.bonus > 0
                      THEN ((pi.purchase_price * pi.qty_in_boxes) / ((pi.qty_in_boxes + pi.bonus) * CASE WHEN COALESCE(pi.pcs_in_pack, p.pcs_in_pack, 1) <= 0 THEN 1 ELSE COALESCE(pi.pcs_in_pack, p.pcs_in_pack, 1) END))
                    WHEN pi.purchase_price > 0
                      THEN (pi.purchase_price / CASE WHEN COALESCE(pi.pcs_in_pack, p.pcs_in_pack, 1) <= 0 THEN 1 ELSE COALESCE(pi.pcs_in_pack, p.pcs_in_pack, 1) END)
                    ELSE (COALESCE(p.trade_price, 0) / CASE WHEN COALESCE(p.pcs_in_pack, 1) <= 0 THEN 1 ELSE COALESCE(p.pcs_in_pack, 1) END)
                  END
                ) * sri.qty
              )
          ),
          0
        ) as profit
      FROM sale_return_items sri
      JOIN sale_returns sr ON sr.id=sri.return_id
      JOIN products p ON p.id=sri.product_id
      LEFT JOIN purchase_items pi ON pi.id=sri.purchase_item_id
      WHERE date(sr.created_at)=?`).get(today).profit
    
    // Net profit = Sold profit - Returned profit
    const profitToday = { profit: soldProfit - returnedProfit }
    
    console.log(`   💰 Profit Calculation:`)
    console.log(`      Sold Profit: Rs. ${soldProfit.toFixed(2)}`)
    console.log(`      Returned Profit: Rs. ${returnedProfit.toFixed(2)}`)
    console.log(`      Net Profit: Rs. ${profitToday.profit.toFixed(2)}`)
    
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
      todayReturns: todayReturns.total,
      todayReturnsCount: todayReturns.count,
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
        si.discount_percent,
        si.total,
        s.discount as invoice_discount,
        s.sub_total as invoice_sub_total,
        s.grand_total as invoice_grand_total,
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

  // TESTING HELPER: Reset database for fresh testing
  ipcMain.handle('testing:resetDatabase', () => {
    console.log('\n🗑️  RESETTING DATABASE FOR FRESH TESTING\n')
    
    const reset = db.transaction(() => {
      const today = new Date().toISOString().split('T')[0]
      
      // 1. Delete all Nims purchase items
      console.log('📦 Deleting all Nims purchase items...')
      const nimsProduct = db.prepare(`SELECT id FROM products WHERE name LIKE '%nims%'`).all()
      
      if (nimsProduct.length > 0) {
        const nimsIds = nimsProduct.map(p => p.id).join(',')
        const deletedPurchaseItems = db.prepare(`DELETE FROM purchase_items WHERE product_id IN (${nimsIds})`).run()
        console.log(`   ✅ Deleted ${deletedPurchaseItems.changes} Nims purchase_items`)
      }
      
      // 2. Delete today's sales
      console.log('💰 Deleting today\'s sales...')
      const todaySales = db.prepare(`SELECT id FROM sales WHERE date(created_at) = ?`).all(today)
      
      if (todaySales.length > 0) {
        const saleIds = todaySales.map(s => s.id).join(',')
        const deletedSaleItems = db.prepare(`DELETE FROM sale_items WHERE sale_id IN (${saleIds})`).run()
        console.log(`   ✅ Deleted ${deletedSaleItems.changes} sale_items`)
        
        const deletedSales = db.prepare(`DELETE FROM sales WHERE id IN (${saleIds})`).run()
        console.log(`   ✅ Deleted ${deletedSales.changes} sales`)
      }
      
      // 3. Delete today's returns
      console.log('🔄 Deleting today\'s returns...')
      const todayReturns = db.prepare(`SELECT id FROM sale_returns WHERE date(created_at) = ?`).all(today)
      
      if (todayReturns.length > 0) {
        const returnIds = todayReturns.map(r => r.id).join(',')
        const deletedReturnItems = db.prepare(`DELETE FROM sale_return_items WHERE return_id IN (${returnIds})`).run()
        console.log(`   ✅ Deleted ${deletedReturnItems.changes} return_items`)
        
        const deletedReturns = db.prepare(`DELETE FROM sale_returns WHERE id IN (${returnIds})`).run()
        console.log(`   ✅ Deleted ${deletedReturns.changes} returns`)
      }
      
      // 4. Delete today's purchases
      console.log('🛒 Deleting today\'s purchases...')
      const todayPurchases = db.prepare(`SELECT id FROM purchases WHERE date(created_at) = ?`).all(today)
      
      if (todayPurchases.length > 0) {
        const purchaseIds = todayPurchases.map(p => p.id).join(',')
        const deletedPurchases = db.prepare(`DELETE FROM purchases WHERE id IN (${purchaseIds})`).run()
        console.log(`   ✅ Deleted ${deletedPurchases.changes} purchases`)
      }
      
      console.log('\n✅ DATABASE RESET COMPLETE! Ready for fresh testing.\n')
      return { success: true }
    })
    
    return reset()
  })
}

