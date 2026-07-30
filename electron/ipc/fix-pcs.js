const db = require('../database')

module.exports = (ipcMain) => {
  ipcMain.handle('fix:updatePcsInPack', () => {
    console.log('🔧 Fixing pcs_in_pack values in products table...')
    
    try {
      // Get all products
      const products = db.prepare('SELECT id, name, pcs_in_pack FROM products').all()
      
      console.log(`📦 Found ${products.length} products`)
      
      let updated = 0
      products.forEach(product => {
        // Get the most recent purchase entry for this product
        const latestPurchase = db.prepare(`
          SELECT pcs_in_pack 
          FROM purchase_items
          WHERE product_id = ?
          ORDER BY id DESC
          LIMIT 1
        `).get(product.id)
        
        if (latestPurchase && latestPurchase.pcs_in_pack && latestPurchase.pcs_in_pack !== product.pcs_in_pack) {
          console.log(`  ✏️ Updating ${product.name}: ${product.pcs_in_pack} → ${latestPurchase.pcs_in_pack}`)
          db.prepare('UPDATE products SET pcs_in_pack = ? WHERE id = ?').run(latestPurchase.pcs_in_pack, product.id)
          updated++
        }
      })
      
      console.log(`✅ Done! ${updated} products updated.`)
      return { success: true, updated }
    } catch (error) {
      console.error('❌ Fix failed:', error)
      return { success: false, error: error.message }
    }
  })
}
