const db = require('../database')

module.exports = (ipcMain) => {

  ipcMain.handle('hrm:getEmployees', () =>
    db.prepare(`SELECT e.*, b.name as branch_name FROM employees e
      LEFT JOIN branches b ON b.id=e.branch_id WHERE e.is_active=1 ORDER BY e.full_name`).all()
  )

  ipcMain.handle('hrm:createEmployee', (_, data) => {
    const last = db.prepare('SELECT emp_code FROM employees ORDER BY id DESC LIMIT 1').get()
    const num = last && last.emp_code ? parseInt(last.emp_code.replace('EMP-', '')) + 1 : 1
    const empCode = `EMP-${String(num).padStart(3, '0')}`
    const r = db.prepare(`INSERT INTO employees (emp_code,full_name,designation,department,phone,email,address,join_date,basic_salary,branch_id)
      VALUES (?,?,?,?,?,?,?,?,?,?)`
    ).run(empCode, data.full_name, data.designation||null, data.department||null,
          data.phone||null, data.email||null, data.address||null, data.join_date||null,
          data.basic_salary||0, data.branch_id||1)
    return { id: r.lastInsertRowid, emp_code: empCode }
  })

  ipcMain.handle('hrm:updateEmployee', (_, data) => {
    db.prepare(`UPDATE employees SET full_name=?,designation=?,department=?,phone=?,email=?,address=?,join_date=?,basic_salary=?,branch_id=? WHERE id=?`)
      .run(data.full_name, data.designation||null, data.department||null, data.phone||null,
           data.email||null, data.address||null, data.join_date||null, data.basic_salary||0,
           data.branch_id||1, data.id)
    return { success: true }
  })

  ipcMain.handle('hrm:deleteEmployee', (_, id) => {
    db.prepare('UPDATE employees SET is_active=0 WHERE id=?').run(id)
    return { success: true }
  })

  ipcMain.handle('hrm:getPayroll', (_, month) => {
    const m = month || new Date().toISOString().slice(0, 7)
    return db.prepare(`SELECT pr.*, e.full_name, e.emp_code, e.designation FROM payroll pr
      JOIN employees e ON e.id=pr.employee_id WHERE pr.month=? ORDER BY e.full_name`).all(m)
  })

  ipcMain.handle('hrm:generatePayroll', (_, month) => {
    const m = month || new Date().toISOString().slice(0, 7)
    const gen = db.transaction(() => {
      const employees = db.prepare('SELECT * FROM employees WHERE is_active=1').all()
      const ins = db.prepare(`INSERT OR IGNORE INTO payroll (employee_id,month,basic_salary,allowances,deductions,net_salary)
        VALUES (?,?,?,0,0,?)`)
      employees.forEach(e => {
        ins.run(e.id, m, e.basic_salary, e.basic_salary)
      })
      return { count: employees.length }
    })
    return gen()
  })

  ipcMain.handle('hrm:getLeaves', (_, filters = {}) => {
    let q = `SELECT l.*, e.full_name, e.emp_code FROM leaves l JOIN employees e ON e.id=l.employee_id WHERE 1=1`
    const params = []
    if (filters.employee_id) { q += ' AND l.employee_id=?'; params.push(filters.employee_id) }
    if (filters.status)      { q += ' AND l.status=?';      params.push(filters.status) }
    if (filters.month)       { q += " AND strftime('%Y-%m', l.from_date)=?"; params.push(filters.month) }
    q += ' ORDER BY l.id DESC'
    return db.prepare(q).all(...params)
  })

  ipcMain.handle('hrm:createLeave', (_, data) => {
    const r = db.prepare(`INSERT INTO leaves (employee_id,type,from_date,to_date,days,reason,status) VALUES (?,?,?,?,?,?,?)`)
      .run(data.employee_id, data.type, data.from_date, data.to_date,
           data.days||1, data.reason||null, 'pending')
    return { id: r.lastInsertRowid }
  })

  ipcMain.handle('hrm:updateLeave', (_, data) => {
    db.prepare('UPDATE leaves SET status=? WHERE id=?').run(data.status, data.id)
    return { success: true }
  })
}
