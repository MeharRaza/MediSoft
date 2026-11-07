const db = require('../database')

module.exports = (ipcMain) => {
  
  // Get all expenses with optional date filtering
  ipcMain.handle('expenses:getExpenses', (_, filters = {}) => {
    let q = `SELECT * FROM expenses WHERE 1=1`
    const params = []
    
    if (filters.startDate) {
      q += ` AND date >= ?`
      params.push(filters.startDate)
    }
    
    if (filters.endDate) {
      q += ` AND date <= ?`
      params.push(filters.endDate)
    }
    
    if (filters.category) {
      q += ` AND category = ?`
      params.push(filters.category)
    }
    
    q += ` ORDER BY date DESC, id DESC`
    
    return db.prepare(q).all(...params)
  })
  
  // Get total expenses for a period
  ipcMain.handle('expenses:getTotalExpenses', (_, filters = {}) => {
    let q = `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE 1=1`
    const params = []
    
    if (filters.startDate) {
      q += ` AND date >= ?`
      params.push(filters.startDate)
    }
    
    if (filters.endDate) {
      q += ` AND date <= ?`
      params.push(filters.endDate)
    }
    
    const result = db.prepare(q).get(...params)
    return result.total
  })
  
  // Create new expense
  ipcMain.handle('expenses:createExpense', (_, data) => {
    const result = db.prepare(`
      INSERT INTO expenses (date, description, category, amount, payment_method, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      data.date,
      data.description,
      data.category || null,
      data.amount,
      data.payment_method || 'cash',
      data.notes || null
    )
    
    return { id: result.lastInsertRowid, success: true }
  })
  
  // Update expense
  ipcMain.handle('expenses:updateExpense', (_, data) => {
    db.prepare(`
      UPDATE expenses 
      SET date = ?, description = ?, category = ?, amount = ?, 
          payment_method = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      data.date,
      data.description,
      data.category || null,
      data.amount,
      data.payment_method || 'cash',
      data.notes || null,
      data.id
    )
    
    return { success: true }
  })
  
  // Delete expense
  ipcMain.handle('expenses:deleteExpense', (_, id) => {
    db.prepare('DELETE FROM expenses WHERE id = ?').run(id)
    return { success: true }
  })
  
  // Get expense categories (for dropdown)
  ipcMain.handle('expenses:getCategories', () => {
    const categories = db.prepare(`
      SELECT DISTINCT category 
      FROM expenses 
      WHERE category IS NOT NULL 
      ORDER BY category
    `).all()
    
    return categories.map(c => c.category)
  })
}
