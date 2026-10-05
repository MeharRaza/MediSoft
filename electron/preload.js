const { contextBridge, ipcRenderer } = require('electron')

console.log('🔧 [PRELOAD] Loading preload script...')

// Expose safe API to renderer process
contextBridge.exposeInMainWorld('api', {
  // Auto Updater
  updater: {
    check:      () => ipcRenderer.invoke('updater:check'),
    download:   () => ipcRenderer.invoke('updater:download'),
    install:    () => ipcRenderer.invoke('updater:install'),
    getVersion: () => ipcRenderer.invoke('updater:getVersion'),
    onStatus:   (cb) => ipcRenderer.on('update:status',    (_, d) => cb(d)),
    onAvailable:(cb) => ipcRenderer.on('update:available', (_, d) => cb(d)),
    onProgress: (cb) => ipcRenderer.on('update:progress',  (_, d) => cb(d)),
    onDownloaded:(cb)=> ipcRenderer.on('update:downloaded',(_, d) => cb(d)),
    onError:    (cb) => ipcRenderer.on('update:error',     (_, d) => cb(d)),
  },
  // No custom print handlers
  // Sales
  sales: {
    createInvoice:   (data) => ipcRenderer.invoke('sales:createInvoice', data),
    getInvoices:     (filters) => ipcRenderer.invoke('sales:getInvoices', filters),
    getInvoiceById:  (id) => ipcRenderer.invoke('sales:getInvoiceById', id),
    createReturn:    (data) => ipcRenderer.invoke('sales:createReturn', data),
    getReturns:      (filters) => ipcRenderer.invoke('sales:getReturns', filters),
    getQuotations:   () => ipcRenderer.invoke('sales:getQuotations'),
    createQuotation: (data) => ipcRenderer.invoke('sales:createQuotation', data),
    convertQuotation:(id) => ipcRenderer.invoke('sales:convertQuotation', id),
    getCustomers:    () => ipcRenderer.invoke('sales:getCustomers'),
    createCustomer:  (data) => ipcRenderer.invoke('sales:createCustomer', data),
    updateCustomer:  (data) => ipcRenderer.invoke('sales:updateCustomer', data),
    deleteCustomer:  (id) => ipcRenderer.invoke('sales:deleteCustomer', id),
    getProductHistory: (productId) => ipcRenderer.invoke('sales:getProductHistory', productId),
  },
  // Purchase
  purchase: {
    getNextInvoiceNo:() => ipcRenderer.invoke('purchase:getNextInvoiceNo'),
    createPurchase:  (data) => ipcRenderer.invoke('purchase:createPurchase', data),
    getPurchases:    (filters) => ipcRenderer.invoke('purchase:getPurchases', filters),
    getPurchaseById: (id) => ipcRenderer.invoke('purchase:getPurchaseById', id),
    createReturn:    (data) => ipcRenderer.invoke('purchase:createReturn', data),
    getReturns:      () => ipcRenderer.invoke('purchase:getReturns'),
    getSuppliers:    () => ipcRenderer.invoke('purchase:getSuppliers'),
    getSupplierProducts: (id) => ipcRenderer.invoke('purchase:getSupplierProducts', id),
    getSupplierCompanies: (id) => ipcRenderer.invoke('purchase:getSupplierCompanies', id),
    addSupplierCompanies: (data) => ipcRenderer.invoke('purchase:addSupplierCompanies', data),
    getProductsByCompany: (name) => ipcRenderer.invoke('purchase:getProductsByCompany', name),
    createSupplier:  (data) => ipcRenderer.invoke('purchase:createSupplier', data),
    updateSupplier:  (data) => ipcRenderer.invoke('purchase:updateSupplier', data),
    deleteSupplier:  (id) => ipcRenderer.invoke('purchase:deleteSupplier', id),
    createPO:        (data) => ipcRenderer.invoke('purchase:createPO', data),
    getPOs:          () => ipcRenderer.invoke('purchase:getPOs'),
  },
  // Inventory
  inventory: {
    getProducts:     (filters) => ipcRenderer.invoke('inventory:getProducts', filters),
    createProduct:   (data) => ipcRenderer.invoke('inventory:createProduct', data),
    updateProduct:   (data) => ipcRenderer.invoke('inventory:updateProduct', data),
    deleteProduct:   (id) => ipcRenderer.invoke('inventory:deleteProduct', id),
    getBatches:      (productId) => ipcRenderer.invoke('inventory:getBatches', productId),
    getAllBatches:   (filters) => ipcRenderer.invoke('inventory:getAllBatches', filters),
    updatePurchaseItemExpiry: (data) => ipcRenderer.invoke('inventory:updatePurchaseItemExpiry', data),
    adjustStock:     (data) => ipcRenderer.invoke('inventory:adjustStock', data),
    transferStock:   (data) => ipcRenderer.invoke('inventory:transferStock', data),
    getCategories:   () => ipcRenderer.invoke('inventory:getCategories'),
    createCategory:  (data) => ipcRenderer.invoke('inventory:createCategory', data),
    getExpiryAlerts: () => ipcRenderer.invoke('inventory:getExpiryAlerts'),
    getLowStock:     () => ipcRenderer.invoke('inventory:getLowStock'),
    searchProduct:   (q) => ipcRenderer.invoke('inventory:searchProduct', q),
    debugStockCalculation: (productName) => ipcRenderer.invoke('inventory:debugStockCalculation', productName),
    syncQtySold:     (options) => ipcRenderer.invoke('inventory:syncQtySold', options),
  },
  // Accounts
  accounts: {
    getLedger:       (filters) => ipcRenderer.invoke('accounts:getLedger', filters),
    createVoucher:   (data) => ipcRenderer.invoke('accounts:createVoucher', data),
    getVouchers:     (filters) => ipcRenderer.invoke('accounts:getVouchers', filters),
    getAccounts:     () => ipcRenderer.invoke('accounts:getAccounts'),
    createAccount:   (data) => ipcRenderer.invoke('accounts:createAccount', data),
    getRecoveries:   () => ipcRenderer.invoke('accounts:getRecoveries'),
    createRecovery:  (data) => ipcRenderer.invoke('accounts:createRecovery', data),
    getDashboard:    () => ipcRenderer.invoke('accounts:getDashboard'),
  },
  // HRM
  hrm: {
    getEmployees:    () => ipcRenderer.invoke('hrm:getEmployees'),
    createEmployee:  (data) => ipcRenderer.invoke('hrm:createEmployee', data),
    updateEmployee:  (data) => ipcRenderer.invoke('hrm:updateEmployee', data),
    deleteEmployee:  (id) => ipcRenderer.invoke('hrm:deleteEmployee', id),
    getPayroll:      (month) => ipcRenderer.invoke('hrm:getPayroll', month),
    generatePayroll: (month) => ipcRenderer.invoke('hrm:generatePayroll', month),
    getLeaves:       (filters) => ipcRenderer.invoke('hrm:getLeaves', filters),
    createLeave:     (data) => ipcRenderer.invoke('hrm:createLeave', data),
    updateLeave:     (data) => ipcRenderer.invoke('hrm:updateLeave', data),
  },
  // Reports
  reports: {
    getSalesSummary:    (filters) => ipcRenderer.invoke('reports:getSalesSummary', filters),
    getPurchaseSummary: (filters) => ipcRenderer.invoke('reports:getPurchaseSummary', filters),
    getStockReport:     (filters) => ipcRenderer.invoke('reports:getStockReport', filters),
    getProfitLoss:      (filters) => ipcRenderer.invoke('reports:getProfitLoss', filters),
    getAccountsReport:  (filters) => ipcRenderer.invoke('reports:getAccountsReport', filters),
    getExpiryReport:    (filters) => ipcRenderer.invoke('reports:getExpiryReport', filters),
  },
  // Settings
  settings: {
    getUsers:        () => ipcRenderer.invoke('settings:getUsers'),
    createUser:      (data) => ipcRenderer.invoke('settings:createUser', data),
    updateUser:      (data) => ipcRenderer.invoke('settings:updateUser', data),
    deleteUser:      (id) => ipcRenderer.invoke('settings:deleteUser', id),
    getBranches:     () => ipcRenderer.invoke('settings:getBranches'),
    createBranch:    (data) => ipcRenderer.invoke('settings:createBranch', data),
    updateBranch:    (data) => ipcRenderer.invoke('settings:updateBranch', data),
    getCompanyInfo:  () => ipcRenderer.invoke('settings:getCompanyInfo'),
    saveCompanyInfo: (data) => ipcRenderer.invoke('settings:saveCompanyInfo', data),
    login:           (data) => ipcRenderer.invoke('settings:login', data),
    getCurrentUser:  () => ipcRenderer.invoke('settings:getCurrentUser'),
    logout:          () => ipcRenderer.invoke('settings:logout'),
    // Backup & Restore
    getBackupInfo:       () => ipcRenderer.invoke('settings:getBackupInfo'),
    createManualBackup:  () => ipcRenderer.invoke('settings:createManualBackup'),
    restoreBackup:       () => ipcRenderer.invoke('settings:restoreBackup'),
    openBackupFolder:    () => ipcRenderer.invoke('settings:openBackupFolder'),
  },
  // Dashboard
  dashboard: {
    getStats: () => ipcRenderer.invoke('dashboard:getStats'),
  },
  // Fix utilities
  fix: {
    updatePcsInPack: () => ipcRenderer.invoke('fix:updatePcsInPack'),
  },
  // Testing utilities
  testing: {
    resetDatabase: () => ipcRenderer.invoke('testing:resetDatabase'),
  },
})

console.log('✅ [PRELOAD] API exposed to window.api')
console.log('✅ [PRELOAD] api.sales.getProductHistory available:', typeof window.api?.sales?.getProductHistory)
