const db = require('../database')

module.exports = (ipcMain) => {

  ipcMain.handle('reports:getSalesSummary', (_, filters = {}) => {
    const from = filters.from_date || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    const to   = filters.to_date   || new Date().toISOString().split('T')[0]
    const summary = db.prepare(`
      SELECT COUNT(*) as total_invoices, COALESCE(SUM(grand_total),0) as total_sales,
        COALESCE(SUM(discount),0) as total_discount, COALESCE(SUM(tax),0) as total_tax,
        COALESCE(SUM(CASE WHEN status='paid' THEN grand_total ELSE 0 END),0) as cash_sales,
        COALESCE(SUM(CASE WHEN status='credit' THEN grand_total ELSE 0 END),0) as credit_sales
      FROM sales WHERE date(created_at) BETWEEN ? AND ? AND status!='voided'`).get(from, to)
    const daily = db.prepare(`
      SELECT date(created_at) as day, COUNT(*) as invoices, SUM(grand_total) as total
      FROM sales WHERE date(created_at) BETWEEN ? AND ? AND status!='voided'
      GROUP BY day ORDER BY day`).all(from, to)
    const topProducts = db.prepare(`
      SELECT p.name, SUM(si.qty) as qty_sold, SUM(si.total) as total_sales
      FROM sale_items si JOIN products p ON p.id=si.product_id
      JOIN sales s ON s.id=si.sale_id
      WHERE date(s.created_at) BETWEEN ? AND ? AND s.status!='voided'
      GROUP BY si.product_id ORDER BY total_sales DESC LIMIT 10`).all(from, to)
    const invoices = db.prepare(`
      SELECT s.*, c.name as customer_name FROM sales s
      LEFT JOIN customers c ON c.id=s.customer_id
      WHERE date(s.created_at) BETWEEN ? AND ? AND s.status!='voided'
      ORDER BY s.id DESC LIMIT 100`).all(from, to)
    return { summary, daily, topProducts, invoices }
  })

  ipcMain.handle('reports:getPurchaseSummary', (_, filters = {}) => {
    const from = filters.from_date || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    const to   = filters.to_date   || new Date().toISOString().split('T')[0]
    const summary = db.prepare(`
      SELECT COUNT(*) as total_purchases, COALESCE(SUM(grand_total),0) as total_amount,
        COALESCE(SUM(discount),0) as total_discount
      FROM purchases WHERE date(created_at) BETWEEN ? AND ?`).get(from, to)
    const bySupplier = db.prepare(`
      SELECT s.name as supplier_name, COUNT(p.id) as purchases, SUM(p.grand_total) as total
      FROM purchases p JOIN suppliers s ON s.id=p.supplier_id
      WHERE date(p.created_at) BETWEEN ? AND ?
      GROUP BY p.supplier_id ORDER BY total DESC`).all(from, to)
    const invoices = db.prepare(`
      SELECT p.*, s.name as supplier_name FROM purchases p
      LEFT JOIN suppliers s ON s.id=p.supplier_id
      WHERE date(p.created_at) BETWEEN ? AND ? ORDER BY p.id DESC LIMIT 100`).all(from, to)
    return { summary, bySupplier, invoices }
  })

  ipcMain.handle('reports:getStockReport', (_, filters = {}) => {
    let q = `SELECT p.*, c.name as category_name, m.name as manufacturer_name,
        COALESCE((
          SELECT SUM(pi.qty - pi.qty_sold) 
          FROM purchase_items pi 
          WHERE pi.product_id = p.id
        ), 0) as stock,
        COALESCE((
          SELECT SUM(
            (pi.qty - pi.qty_sold) * 
            (pi.purchase_price / COALESCE(NULLIF(pi.pcs_in_pack, 0), 1))
          ) 
          FROM purchase_items pi 
          WHERE pi.product_id = p.id
        ), 0) as stock_value
      FROM products p
      LEFT JOIN categories c ON c.id=p.category_id
      LEFT JOIN manufacturers m ON m.id=p.manufacturer_id
      WHERE p.is_active=1`
    const params = []
    if (filters.category_id) { q += ' AND p.category_id=?'; params.push(filters.category_id) }
    q += ' GROUP BY p.id ORDER BY p.name'
    const products = db.prepare(q).all(...params)
    const totalValue = products.reduce((s, p) => s + p.stock_value, 0)
    console.log('📊 Stock Report - Total Products:', products.length, 'Total Value:', totalValue.toFixed(2))
    return { products, totalValue }
  })

  ipcMain.handle('reports:getProfitLoss', (_, filters = {}) => {
    const from = filters.from_date || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
    const to   = filters.to_date   || new Date().toISOString().split('T')[0]
    
    // Total Sales Revenue
    const grossSales = db.prepare(`SELECT COALESCE(SUM(grand_total),0) as t FROM sales WHERE date(created_at) BETWEEN ? AND ? AND status!='voided'`).get(from, to).t
    
    // Total Returns
    const totalReturns = db.prepare(`SELECT COALESCE(SUM(total),0) as t FROM sale_returns WHERE date(created_at) BETWEEN ? AND ?`).get(from, to).t
    
    // Net Revenue (Sales - Returns)
    const revenue = grossSales - totalReturns
    
    // Cost of Goods Sold (only for sold items, not returned)
    const soldCogs = db.prepare(`
      SELECT COALESCE(SUM(si.qty * COALESCE((pi.purchase_price / CASE WHEN pi.pcs_in_pack IS NULL OR pi.pcs_in_pack = 0 THEN 1 ELSE pi.pcs_in_pack END),0)),0) as t
      FROM sale_items si 
      JOIN sales s ON s.id=si.sale_id 
      LEFT JOIN purchase_items pi ON pi.id=si.purchase_item_id
      WHERE date(s.created_at) BETWEEN ? AND ? AND s.status!='voided'`).get(from, to).t
    
    // Cost of Returned Goods (COGS that should be subtracted)
    // Now using purchase_item_id directly from sale_return_items (more accurate)
    const returnedCogs = db.prepare(`
      SELECT COALESCE(SUM(sri.qty * COALESCE((pi.purchase_price / CASE WHEN pi.pcs_in_pack IS NULL OR pi.pcs_in_pack = 0 THEN 1 ELSE pi.pcs_in_pack END),0)),0) as t
      FROM sale_return_items sri
      JOIN sale_returns sr ON sr.id=sri.return_id
      LEFT JOIN purchase_items pi ON pi.id=sri.purchase_item_id
      WHERE date(sr.created_at) BETWEEN ? AND ?`).get(from, to).t
    
    // Net COGS (Sold COGS - Returned COGS)
    const cogs = soldCogs - returnedCogs
    
    // Gross Profit = Net Revenue - Net COGS
    const grossProfit = revenue - cogs
    
    const expenses = db.prepare(`
      SELECT a.name, SUM(ve.debit - ve.credit) as amount FROM voucher_entries ve
      JOIN accounts a ON a.id=ve.account_id JOIN vouchers v ON v.id=ve.voucher_id
      WHERE a.type='expense' AND v.date BETWEEN ? AND ?
      GROUP BY ve.account_id`).all(from, to)
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
    const netProfit = grossProfit - totalExpenses
    
    return { 
      revenue, 
      cogs, 
      grossProfit, 
      expenses, 
      totalExpenses, 
      netProfit, 
      from, 
      to,
      // Additional details for transparency
      grossSales,
      totalReturns,
      soldCogs,
      returnedCogs
    }
  })

  ipcMain.handle('reports:getAccountsReport', (_, filters = {}) => {
    const accounts = db.prepare('SELECT * FROM accounts ORDER BY code').all()
    const from = filters.from_date || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
    const to   = filters.to_date   || new Date().toISOString().split('T')[0]
    const ledger = db.prepare(`
      SELECT ve.*, v.voucher_no, v.date, v.type as v_type, a.name as account_name
      FROM voucher_entries ve
      JOIN vouchers v ON v.id=ve.voucher_id JOIN accounts a ON a.id=ve.account_id
      WHERE v.date BETWEEN ? AND ? ORDER BY v.date, v.id`).all(from, to)
    return { accounts, ledger }
  })

  ipcMain.handle('reports:getExpiryReport', (_, filters = {}) => {
    // Always load expiry data (search is optional filter)
    console.log('📊 Loading expiry report with filters:', filters)
    
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const d30  = new Date(); d30.setDate(d30.getDate() + 30)
    const d180 = new Date(); d180.setDate(d180.getDate() + 180) // 6 months
    
    console.log('📅 Expiry Report - Today:', todayStr)
    console.log('📅 Expiry Report - 30 days:', d30.toISOString().split('T')[0])
    console.log('📅 Expiry Report - 180 days:', d180.toISOString().split('T')[0])
    
    // Helper function to convert various date formats to comparable timestamp
    // Handles: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY
    const parseExpiryDate = (dateStr) => {
      if (!dateStr) return null
      
      // Try YYYY-MM-DD format first (ISO)
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return new Date(dateStr).getTime()
      }
      
      // Try MM/DD/YYYY or DD/MM/YYYY format
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/')
        if (parts.length === 3) {
          // Assume MM/DD/YYYY format (common in US)
          const month = parseInt(parts[0])
          const day = parseInt(parts[1])
          const year = parseInt(parts[2])
          
          // Validate
          if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year > 1900) {
            return new Date(year, month - 1, day).getTime()
          }
        }
      }
      
      return null
    }
    
    const todayTimestamp = today.getTime()
    const d30Timestamp = d30.getTime()
    const d180Timestamp = d180.getTime()
    
    // Build query with optional search filter
    let query = `
      SELECT pi.*, p.name as product_name, pu.created_at as purchase_date,
        pu.invoice_no as batch_no,
        (pi.qty - pi.qty_sold) as qty,
        pi.qty_in_boxes, pi.qty_loose
      FROM purchase_items pi 
      JOIN products p ON p.id=pi.product_id
      JOIN purchases pu ON pu.id=pi.purchase_id
      WHERE (pi.qty - pi.qty_sold) > 0 
      AND p.is_active = 1
      AND pi.expiry_date IS NOT NULL`
    
    const params = []
    
    // Add search filter if provided
    if (filters.search) {
      query += ` AND (p.name LIKE ? OR pu.invoice_no LIKE ?)`
      params.push(`%${filters.search}%`, `%${filters.search}%`)
    }
    
    query += ` ORDER BY pi.expiry_date, pu.created_at`
    
    // Get all active purchase items with expiry dates
    const allItems = db.prepare(query).all(...params)
    
    console.log(`📦 Total items with expiry dates: ${allItems.length}`)
    
    // Filter items by date ranges using JavaScript
    const expired = []
    const expiring30 = []
    const expiring180 = []
    
    allItems.forEach(item => {
      const expiryTimestamp = parseExpiryDate(item.expiry_date)
      
      if (!expiryTimestamp) {
        console.log(`⚠️ Could not parse date: ${item.expiry_date} for product: ${item.product_name}`)
        return
      }
      
      if (expiryTimestamp < todayTimestamp) {
        expired.push(item)
      } else if (expiryTimestamp >= todayTimestamp && expiryTimestamp <= d30Timestamp) {
        expiring30.push(item)
      } else if (expiryTimestamp > d30Timestamp && expiryTimestamp <= d180Timestamp) {
        expiring180.push(item)
      }
    })
    
    console.log(`🔴 Expired items: ${expired.length}`)
    console.log(`🟡 Expiring in 30 days: ${expiring30.length}`)
    console.log(`🟢 Expiring in 6 months: ${expiring180.length}`)
    
    if (expired.length > 0) {
      console.log('Sample expired item:', expired[0])
    }
    
    return { expired, expiring30, expiring90: expiring180 }
  })
}
