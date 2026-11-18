// Unified API layer — routes seamlessly between Local Electron IPC, LAN RPC (for Cashier Terminals), and Dev Mocks
import { rpcCall } from './lanClient'

const isElectron = typeof window !== 'undefined' && window.api

// Helper to route through RPC when in Cashier mode, or local IPC when Standalone / Server
function call(channel, fallbackDev, ...args) {
  return rpcCall(channel, () => {
    if (isElectron) {
      const [ns, method] = channel.split(':')
      if (window.api?.[ns]?.[method]) {
        return window.api[ns][method](...args)
      }
    }
    return fallbackDev ? fallbackDev(...args) : Promise.resolve(null)
  }, ...args)
}

// Mock data for browser dev mode
const mockData = {
  products: [
    { id: 1, name: 'Panadol Tab 500mg', barcode: '123456', category_name: 'TAB', generic_name: 'Paracetamol', manufacturer_name: 'GSK', sale_price: 355, trade_price: 289, stock: 5683, alert_qty: 100, is_active: 1 },
    { id: 2, name: 'Amoxicillin Cap 500mg', barcode: '234567', category_name: 'CAP', generic_name: 'Amoxicillin', manufacturer_name: 'Abbott', sale_price: 450, trade_price: 380, stock: 200, alert_qty: 50, is_active: 1 },
    { id: 3, name: 'Insulin Glargine', barcode: '345678', category_name: 'INJ', generic_name: 'Insulin', manufacturer_name: 'Sanofi', sale_price: 2800, trade_price: 2200, stock: 15, alert_qty: 20, is_active: 1 },
    { id: 4, name: 'Vitamin C 1000mg', barcode: '456789', category_name: 'TAB', generic_name: 'Ascorbic Acid', manufacturer_name: 'Sandoz', sale_price: 120, trade_price: 95, stock: 400, alert_qty: 50, is_active: 1 },
  ],
  customers: [
    { id: 1, name: 'Walk-in Customer', phone: '', balance: 0 },
    { id: 2, name: 'Ahmad Ali', phone: '0300-1234567', balance: 1500 },
    { id: 3, name: 'Sara Khan', phone: '0321-9876543', balance: 0 },
  ],
  suppliers: [
    { id: 1, name: 'GSK Pharmaceuticals', phone: '042-1234567', balance: 25000 },
    { id: 2, name: 'Abbott Laboratories', phone: '021-9876543', balance: 15000 },
    { id: 3, name: 'Pfizer Medical', phone: '051-1112222', balance: 0 },
  ],
  categories: [
    { id: 1, name: 'TAB' }, { id: 2, name: 'CAP' }, { id: 3, name: 'SYP' },
    { id: 4, name: 'INJ' }, { id: 5, name: 'CREAM' }, { id: 6, name: 'DROPS' },
    { id: 7, name: 'SHAMPOO' }, { id: 8, name: 'SOAP' }, { id: 9, name: 'OTHER' },
  ],
  branches: [{ id: 1, name: 'Main Branch', address: 'Main Street' }],
  employees: [
    { id: 1, emp_code: 'EMP-001', full_name: 'Muhammad Usman', designation: 'Pharmacist', department: 'Sales', phone: '0300-1111111', basic_salary: 45000, branch_name: 'Main Branch', is_active: 1 },
    { id: 2, emp_code: 'EMP-002', full_name: 'Fatima Malik', designation: 'Cashier', department: 'Sales', phone: '0321-2222222', basic_salary: 30000, branch_name: 'Main Branch', is_active: 1 },
  ],
}

export const api = {
  sales: {
    createInvoice:   (data) => call('sales:createInvoice', () => Promise.resolve({ success: true, invoice_no: 'INV-MOCK' }), data),
    getInvoices:     (f) => call('sales:getInvoices', () => Promise.resolve([]), f),
    getInvoiceById:  (id) => call('sales:getInvoiceById', () => Promise.resolve(null), id),
    createReturn:    (data) => call('sales:createReturn', () => Promise.resolve({ success: true }), data),
    getReturns:      (f) => call('sales:getReturns', () => Promise.resolve([]), f),
    getQuotations:   () => call('sales:getQuotations', () => Promise.resolve([])),
    createQuotation: (data) => call('sales:createQuotation', () => Promise.resolve({ success: true }), data),
    convertQuotation:(id) => call('sales:convertQuotation', () => Promise.resolve({ success: true }), id),
    getCustomers:    () => call('sales:getCustomers', () => Promise.resolve(mockData.customers)),
    createCustomer:  (data) => call('sales:createCustomer', () => Promise.resolve({ success: true, id: 99 }), data),
    updateCustomer:  (data) => call('sales:updateCustomer', () => Promise.resolve({ success: true }), data),
    deleteCustomer:  (id) => call('sales:deleteCustomer', () => Promise.resolve({ success: true }), id),
    getProductHistory: (productId) => call('sales:getProductHistory', () => Promise.resolve({ history: [], stats: { total_sales: 0, total_quantity: 0, avg_price: 0, max_price: 0, min_price: 0 } }), productId),
  },
  purchase: {
    getNextInvoiceNo:() => call('purchase:getNextInvoiceNo', () => Promise.resolve('INV-0001')),
    getSupplierProducts: (id) => call('purchase:getSupplierProducts', () => Promise.resolve([]), id),
    getSupplierCompanies: (id) => call('purchase:getSupplierCompanies', () => Promise.resolve([]), id),
    addSupplierCompanies: (data) => call('purchase:addSupplierCompanies', () => Promise.resolve({ success: true }), data),
    getProductsByCompany: (name) => call('purchase:getProductsByCompany', () => Promise.resolve([]), name),
    createPurchase:  (data) => call('purchase:createPurchase', () => Promise.resolve({ success: true }), data),
    getPurchases:    (f) => call('purchase:getPurchases', () => Promise.resolve([]), f),
    getPurchaseById: (id) => call('purchase:getPurchaseById', () => Promise.resolve(null), id),
    createReturn:    (data) => call('purchase:createReturn', () => Promise.resolve({ success: true }), data),
    getReturns:      () => call('purchase:getReturns', () => Promise.resolve([])),
    getSuppliers:    () => call('purchase:getSuppliers', () => Promise.resolve(mockData.suppliers)),
    createSupplier:  (data) => call('purchase:createSupplier', () => Promise.resolve({ success: true, id: 99 }), data),
    updateSupplier:  (data) => call('purchase:updateSupplier', () => Promise.resolve({ success: true }), data),
    deleteSupplier:  (id) => call('purchase:deleteSupplier', () => Promise.resolve({ success: true }), id),
    createPO:        (data) => call('purchase:createPO', () => Promise.resolve({ success: true }), data),
    getPOs:          () => call('purchase:getPOs', () => Promise.resolve([])),
  },
  inventory: {
    getProducts:     (f) => call('inventory:getProducts', () => Promise.resolve(mockData.products), f),
    searchProduct:   (q) => call('inventory:searchProduct', () => Promise.resolve(mockData.products.filter(p => p.name.toLowerCase().includes(q.toLowerCase()))), q),
    createProduct:   (data) => call('inventory:createProduct', () => Promise.resolve({ success: true, id: 99 }), data),
    updateProduct:   (data) => call('inventory:updateProduct', () => Promise.resolve({ success: true }), data),
    deleteProduct:   (id) => call('inventory:deleteProduct', () => Promise.resolve({ success: true }), id),
    getBatches:      (id) => call('inventory:getBatches', () => Promise.resolve([]), id),
    getFifoSplits:   (productId, qty) => call('inventory:getFifoSplits', () => Promise.resolve([]), productId, qty),
    getAllBatches:   (f) => call('inventory:getAllBatches', () => Promise.resolve([]), f),
    updatePurchaseItemExpiry: (data) => call('inventory:updatePurchaseItemExpiry', () => Promise.resolve({ success: true }), data),
    adjustStock:     (data) => call('inventory:adjustStock', () => Promise.resolve({ success: true }), data),
    transferStock:   (data) => call('inventory:transferStock', () => Promise.resolve({ success: true }), data),
    getCategories:   () => call('inventory:getCategories', () => Promise.resolve(mockData.categories)),
    createCategory:  (data) => call('inventory:createCategory', () => Promise.resolve({ success: true }), data),
    getExpiryAlerts: () => call('inventory:getExpiryAlerts', () => Promise.resolve([])),
    getLowStock:     () => call('inventory:getLowStock', () => Promise.resolve(mockData.products.filter(p => p.stock <= p.alert_qty))),
  },
  accounts: {
    getLedger:       (f) => call('accounts:getLedger', () => Promise.resolve([]), f),
    createVoucher:   (data) => call('accounts:createVoucher', () => Promise.resolve({ success: true }), data),
    getVouchers:     (f) => call('accounts:getVouchers', () => Promise.resolve([]), f),
    getAccounts:     () => call('accounts:getAccounts', () => Promise.resolve([])),
    createAccount:   (data) => call('accounts:createAccount', () => Promise.resolve({ success: true }), data),
    getRecoveries:   () => call('accounts:getRecoveries', () => Promise.resolve([])),
    createRecovery:  (data) => call('accounts:createRecovery', () => Promise.resolve({ success: true }), data),
    getDashboard:    () => call('accounts:getDashboard', () => Promise.resolve({ totalAssets: 0, totalLiabilities: 0, totalIncome: 0, totalExpense: 0, pendingReceivable: 4920, pendingPayable: 40000, recentVouchers: [] })),
  },
  hrm: {
    getEmployees:    () => call('hrm:getEmployees', () => Promise.resolve(mockData.employees)),
    createEmployee:  (data) => call('hrm:createEmployee', () => Promise.resolve({ success: true }), data),
    updateEmployee:  (data) => call('hrm:updateEmployee', () => Promise.resolve({ success: true }), data),
    deleteEmployee:  (id) => call('hrm:deleteEmployee', () => Promise.resolve({ success: true }), id),
    getPayroll:      (m) => call('hrm:getPayroll', () => Promise.resolve([]), m),
    generatePayroll: (m) => call('hrm:generatePayroll', () => Promise.resolve({ count: 0 }), m),
    getLeaves:       (f) => call('hrm:getLeaves', () => Promise.resolve([]), f),
    createLeave:     (data) => call('hrm:createLeave', () => Promise.resolve({ success: true }), data),
    updateLeave:     (data) => call('hrm:updateLeave', () => Promise.resolve({ success: true }), data),
  },
  reports: {
    getSalesSummary:    (f) => call('reports:getSalesSummary', () => Promise.resolve({ summary: {}, daily: [], topProducts: [], invoices: [] }), f),
    getPurchaseSummary: (f) => call('reports:getPurchaseSummary', () => Promise.resolve({ summary: {}, bySupplier: [], invoices: [] }), f),
    getStockReport:     (f) => call('reports:getStockReport', () => Promise.resolve({ products: mockData.products, totalValue: 0 }), f),
    getProfitLoss:      (f) => call('reports:getProfitLoss', () => Promise.resolve({ revenue: 0, cogs: 0, grossProfit: 0, expenses: [], totalExpenses: 0, netProfit: 0 }), f),
    getAccountsReport:  (f) => call('reports:getAccountsReport', () => Promise.resolve({ accounts: [], ledger: [] }), f),
    getExpiryReport:    (f) => call('reports:getExpiryReport', () => Promise.resolve({ expired: [], expiring30: [], expiring90: [] }), f),
  },
  expenses: {
    getExpenses:      (f) => call('expenses:getExpenses', () => Promise.resolve([]), f),
    getTotalExpenses: (f) => call('expenses:getTotalExpenses', () => Promise.resolve(0), f),
    createExpense:    (data) => call('expenses:createExpense', () => Promise.resolve({ success: true, id: 99 }), data),
    updateExpense:    (data) => call('expenses:updateExpense', () => Promise.resolve({ success: true }), data),
    deleteExpense:    (id) => call('expenses:deleteExpense', () => Promise.resolve({ success: true }), id),
    getCategories:    () => call('expenses:getCategories', () => Promise.resolve([])),
  },
  settings: {
    getUsers:          () => call('settings:getUsers', () => Promise.resolve([])),
    createUser:        (data) => call('settings:createUser', () => Promise.resolve({ success: true }), data),
    updateUser:        (data) => call('settings:updateUser', () => Promise.resolve({ success: true }), data),
    changeCredentials: (data) => call('settings:changeCredentials', () => Promise.resolve({ success: true, message: 'Updated' }), data),
    deleteUser:        (id) => call('settings:deleteUser', () => Promise.resolve({ success: true }), id),
    getBranches:       () => call('settings:getBranches', () => Promise.resolve(mockData.branches)),
    createBranch:      (data) => call('settings:createBranch', () => Promise.resolve({ success: true }), data),
    updateBranch:      (data) => call('settings:updateBranch', () => Promise.resolve({ success: true }), data),
    getCompanyInfo:    () => call('settings:getCompanyInfo', () => Promise.resolve({ name: 'MediSoft Pharmacy', currency: 'PKR', tax_rate: 0 })),
    saveCompanyInfo:   (data) => call('settings:saveCompanyInfo', () => Promise.resolve({ success: true }), data),
    getInvoiceSettings: () => call('settings:getInvoiceSettings', () => {
      try {
        const saved = localStorage.getItem('medisoft_invoice_settings')
        if (saved) return Promise.resolve(JSON.parse(saved))
      } catch (e) {}
      return Promise.resolve({
        id: 1,
        store_name: 'Harmain Medical Store',
        tagline: '',
        address: 'Opposite Nadra Kiosik Main Bazar Raiwind',
        phone: '03228684603',
        paper_width: '80mm',
        header_font_size: 19,
        address_font_size: 13.5,
        meta_font_size: 12.5,
        item_font_size: 12.5,
        total_font_size: 13,
        net_total_font_size: 16,
        footer_font_size: 10,
        footer_terms: 'LOOSE ITEMS, VACCINES, INHALERS AND FRIDGE ITEMS WILL NOT BE RETURNED.',
        thank_you_msg: 'Thank You For Your Visit!',
        show_discount_col: 0,
        show_customer_name: 1,
        header_bold: 0,
        tagline_bold: 0,
        address_bold: 0,
        phone_bold: 0,
        meta_bold: 0,
        table_header_bold: 0,
        item_bold: 0,
        total_bold: 0,
        net_total_bold: 1,
        footer_terms_bold: 0,
        thank_you_bold: 0
      })
    }),
    saveInvoiceSettings: (data) => call('settings:saveInvoiceSettings', () => {
      try {
        localStorage.setItem('medisoft_invoice_settings', JSON.stringify(data))
      } catch (e) {}
      return Promise.resolve({ success: true })
    }, data),
    login: (data) => isElectron && window.api?.settings?.login ? window.api.settings.login(data) : Promise.resolve({ success: true, user: { id: 1, full_name: 'Administrator', role: 'admin' } }),
    logout: () => isElectron && window.api?.settings?.logout ? window.api.settings.logout() : Promise.resolve({ success: true }),
    getCurrentUser: () => isElectron && window.api?.settings?.getCurrentUser ? window.api.settings.getCurrentUser() : Promise.resolve(null),
  },
  dashboard: {
    getStats: () => call('dashboard:getStats', () => Promise.resolve({
      todaySales: 24582, todaySalesCount: 42, todayPurchase: 56000, lowStock: 18,
      expiryAlerts: 7, pendingRecovery: 34200, profitToday: 8124,
      recentSales: [], weeklySales: [],
    })),
  },
  // Machine-local Terminal & LAN Settings (always local to this PC)
  terminal: {
    getStatus:  () => isElectron && window.api?.terminal ? window.api.terminal.getStatus() : Promise.resolve({ mode: 'standalone', serverIp: '127.0.0.1', serverPort: 8088, localIp: '127.0.0.1', counterName: 'Main Counter', isServerRunning: false }),
    saveConfig: (cfg) => isElectron && window.api?.terminal ? window.api.terminal.saveConfig(cfg) : Promise.resolve({ success: true, config: cfg }),
    getLocalIp: () => isElectron && window.api?.terminal ? window.api.terminal.getLocalIp() : Promise.resolve('127.0.0.1'),
  }
}
