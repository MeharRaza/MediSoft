/**
 * Automatically copies built files to C:\MediSoftUpdates
 * Run: npm run publish-update
 */
const fs   = require('fs')
const path = require('path')

const RELEASE_DIR = path.join(__dirname, '..', 'release')
const UPDATE_DIR  = 'C:\\MediSoftUpdates'

// Create update dir if not exists
if (!fs.existsSync(UPDATE_DIR)) {
  fs.mkdirSync(UPDATE_DIR, { recursive: true })
  console.log(`✓ Created: ${UPDATE_DIR}`)
}

// Files to copy
const files = fs.readdirSync(RELEASE_DIR).filter(f =>
  f === 'latest.yml' ||
  (f.endsWith('.exe') && f.includes('Setup') && !f.includes('uninstaller')) ||
  (f.endsWith('.blockmap'))
)

if (files.length === 0) {
  console.error('✗ No release files found. Run npm run dist first.')
  process.exit(1)
}

files.forEach(file => {
  const src  = path.join(RELEASE_DIR, file)
  const dest = path.join(UPDATE_DIR, file)
  fs.copyFileSync(src, dest)
  const size = (fs.statSync(dest).size / 1024 / 1024).toFixed(1)
  console.log(`✓ Copied: ${file} (${size} MB)`)
})

console.log('\n✅ Update server ready!')
console.log(`   URL: http://192.168.0.110:8080`)
console.log(`   All PCs will auto-update on next app launch.\n`)
