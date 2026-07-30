const db = require('../database')

module.exports = (ipcMain) => {

  ipcMain.handle('accounts:getAccounts', () =>
    db.prepare('SELECT * FROM accounts WHERE is_active=1 ORDER BY code').all()
  )

  ipcMain.handle('accounts:createAccount', (_, data) => {
    const r = db.prepare(`INSERT INTO accounts (code,name,type,parent_id) VALUES (?,?,?,?)`)
      .run(data.code||null, data.name, data.type, data.parent_id||null)
    return { id: r.lastInsertRowid, success: true }
  })

  ipcMain.handle('accounts:getLedger', (_, filters = {}) => {
    let q = `SELECT ve.*, v.voucher_no, v.type as voucher_type, v.date, v.description as voucher_desc,
        a.name as account_name, a.code as account_code
      FROM voucher_entries ve
      JOIN vouchers v ON v.id=ve.voucher_id
      JOIN accounts a ON a.id=ve.account_id
      WHERE 1=1`
    const params = []
    if (filters.account_id)  { q += ' AND ve.account_id=?'; params.push(filters.account_id) }
    if (filters.from_date)   { q += ' AND v.date>=?';       params.push(filters.from_date) }
    if (filters.to_date)     { q += ' AND v.date<=?';       params.push(filters.to_date) }
    if (filters.voucher_type){ q += ' AND v.type=?';        params.push(filters.voucher_type) }
    q += ' ORDER BY v.date DESC, v.id DESC'
    return db.prepare(q).all(...params)
  })

  ipcMain.handle('accounts:createVoucher', (_, data) => {
    const create = db.transaction(() => {
      const last = db.prepare(`SELECT voucher_no FROM vouchers ORDER BY id DESC LIMIT 1`).get()
      const num = last ? parseInt(last.voucher_no.replace('VCH-', '')) + 1 : 1
      const vNo = `VCH-${String(num).padStart(5, '0')}`
      const r = db.prepare(`INSERT INTO vouchers (voucher_no,type,date,description,total,user_id) VALUES (?,?,?,?,?,?)`)
        .run(vNo, data.type, data.date, data.description||null, data.total||0, data.user_id||1)
      const vId = r.lastInsertRowid
      let totalDebit = 0, totalCredit = 0
      for (const entry of data.entries) {
        db.prepare(`INSERT INTO voucher_entries (voucher_id,account_id,debit,credit,description) VALUES (?,?,?,?,?)`)
          .run(vId, entry.account_id, entry.debit||0, entry.credit||0, entry.description||null)
        totalDebit  += entry.debit||0
        totalCredit += entry.credit||0
        // Update account balance
        const net = (entry.debit||0) - (entry.credit||0)
        db.prepare('UPDATE accounts SET balance=balance+? WHERE id=?').run(net, entry.account_id)
      }
      return { id: vId, voucher_no: vNo, balanced: Math.abs(totalDebit - totalCredit) < 0.01 }
    })
    return create()
  })

  ipcMain.handle('accounts:getVouchers', (_, filters = {}) => {
    let q = `SELECT v.*, u.full_name as user_name FROM vouchers v LEFT JOIN users u ON u.id=v.user_id WHERE 1=1`
    const params = []
    if (filters.type)      { q += ' AND v.type=?';    params.push(filters.type) }
    if (filters.from_date) { q += ' AND v.date>=?';   params.push(filters.from_date) }
    if (filters.to_date)   { q += ' AND v.date<=?';   params.push(filters.to_date) }
    if (filters.search)    { q += ' AND (v.voucher_no LIKE ? OR v.description LIKE ?)'; params.push(`%${filters.search}%`, `%${filters.search}%`) }
    q += ' ORDER BY v.id DESC'
    return db.prepare(q).all(...params)
  })

  ipcMain.handle('accounts:getRecoveries', () =>
    db.prepare(`SELECT r.*, c.name as customer_name FROM recoveries r
      LEFT JOIN customers c ON c.id=r.customer_id ORDER BY r.id DESC`).all()
  )

  ipcMain.handle('accounts:createRecovery', (_, data) => {
    const rec = db.transaction(() => {
      const r = db.prepare(`INSERT INTO recoveries (customer_id,amount,payment_method,notes) VALUES (?,?,?,?)`)
        .run(data.customer_id, data.amount, data.payment_method||'cash', data.notes||null)
      // Reduce customer balance
      db.prepare('UPDATE customers SET balance=balance-? WHERE id=?').run(data.amount, data.customer_id)
      return { id: r.lastInsertRowid }
    })
    return rec()
  })

  ipcMain.handle('accounts:getDashboard', () => {
    const totalAssets      = db.prepare(`SELECT COALESCE(SUM(balance),0) as t FROM accounts WHERE type='asset'`).get().t
    const totalLiabilities = db.prepare(`SELECT COALESCE(SUM(balance),0) as t FROM accounts WHERE type='liability'`).get().t
    const totalIncome      = db.prepare(`SELECT COALESCE(SUM(balance),0) as t FROM accounts WHERE type='income'`).get().t
    const totalExpense     = db.prepare(`SELECT COALESCE(SUM(balance),0) as t FROM accounts WHERE type='expense'`).get().t
    const pendingReceivable= db.prepare(`SELECT COALESCE(SUM(balance),0) as t FROM customers WHERE balance>0`).get().t
    const pendingPayable   = db.prepare(`SELECT COALESCE(SUM(balance),0) as t FROM suppliers WHERE balance>0`).get().t
    const recentVouchers   = db.prepare(`SELECT * FROM vouchers ORDER BY id DESC LIMIT 10`).all()
    return { totalAssets, totalLiabilities, totalIncome, totalExpense, pendingReceivable, pendingPayable, recentVouchers }
  })
}
