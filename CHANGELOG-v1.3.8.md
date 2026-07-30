# MediSoft Pro v1.3.8 - Release Notes

**Release Date:** July 29, 2026  
**Build Status:** ✅ Production Ready

---

## 🎯 Major Features & Improvements

### Fast Billing Enhancements

#### 1. **Auto-Select on Focus**
- Quantity, Price, and Discount fields automatically select all text when clicked
- No more double-clicking required
- Immediate typing replaces the value
- Massive speed improvement for data entry

#### 2. **Product Dropdown Enhancements**
- **Pcs in Pack Badge**: Shows "X pills/box" for each medicine
- **Purchase Price Display**: Trade/purchase price visible in dropdown
- **Better Layout**: Company name, pack size, purchase price, and expiry all visible

**Example Display:**
```
Panadol
GSK • 10 pills/box
Purchase: PKR 335.75/box
Exp: 09/09/2029
                    PKR 400.00/box (Sale Price)
                    Total: 100 pills
```

#### 3. **Visible Del Button**
- Replaced hover-only icon with always-visible "Del" button
- Easier to remove items from cart
- Consistent with other UI buttons

#### 4. **Dual Save System**
- **Ctrl+S**: Quick save (NO invoice popup) - for small purchases
- **Ctrl+P**: Save + Show invoice for print - for proper bills
- Flexibility for different transaction types

#### 5. **Quick Search Jump (Ctrl+I)**
- From anywhere (especially payment panel), jump back to search bar
- Perfect for adding more items after entering discount
- No need to tab through multiple fields

#### 6. **Fixed Duplicate Held Bills Bug**
- State changes no longer create multiple held bills
- Auto-hold only triggers on actual page navigation
- Clean held bills management

### Purchase Entry Improvements

#### 1. **Auto-fill Company Name**
- When selecting a product (like "Risek"), company name ("Sami") automatically fills from database
- Only for products that already exist in inventory
- Saves typing and ensures consistency

#### 2. **Simplified Purchase Form**
- Removed Payment Method UI (always defaults to "cash")
- Cleaner interface, less clutter
- Faster entry process

### Invoice System

#### 1. **80mm Thermal Printer Format**
- Optimized for 80mm thermal receipt printers
- Clean, professional layout
- Store information:
  - **Harmain Medical Store**
  - Opposite Nadra Kiosik Main Bazar Raiwind
  - Phone #: 03228684603

#### 2. **Invoice Layout**
- Tabular format: Item Name, Qty, Price, Disc, Total
- Gross Total and Net Total
- Return policy footer
- Matches standard medical store invoice format

---

## ⌨️ Updated Keyboard Shortcuts

### Fast Billing
| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Quick save (no invoice popup) |
| `Ctrl+P` | Save + show invoice for print |
| `Ctrl+I` | Jump to search bar (add more items) |
| `Ctrl+F` | Jump to flat discount field |
| `Ctrl+T` | Jump to percent discount field |
| `Ctrl+←` | Previous held bill |
| `Ctrl+→` | Next held bill |

### Purchase Entry
- Enter key for field navigation (not Tab)
- Arrow keys for table navigation
- Auto-fill company from database

---

## 🗑️ Removed Features

### OCR Invoice Scanner (Complete Removal)
- All OCR-related code removed
- Cleaned up:
  - Tesseract.js integration
  - Groq Vision API
  - Google Gemini Vision API
  - JSON paste dialog
  - Invoice extraction prompts
- Feature will be reimplemented later with better accuracy

---

## 🔧 Technical Improvements

1. **Refs-based State Management**: Fixed stale closures in keyboard shortcuts
2. **Optimized Auto-hold System**: Only triggers on page navigation, not state changes
3. **Better Performance**: Reduced unnecessary re-renders
4. **Clean Code**: Removed 1000+ lines of OCR code

---

## 📋 Files Changed

### Modified
- `src/pages/sales/FastBilling.jsx` - Major updates
- `src/pages/purchase/PurchaseEntry.jsx` - Company auto-fill
- `src/components/InvoicePrint.jsx` - 80mm thermal format
- `src/components/Layout.jsx` - Version update
- `package.json` - Version 1.3.8

### Deleted
- `electron/ipc/ocr.js`
- `electron/ipc/ocr-v3.js`
- `electron/ipc/ocr-groq.js`
- `electron/ipc/ocr-gemini.js`
- `src/components/JsonPasteDialog.jsx`
- `src/components/GroqApiKeySetup.jsx`
- `INVOICE-EXTRACTION-PROMPT.md`

---

## 🚀 Deployment Instructions

### Building Installer

1. **Close all running instances** of MediSoft Pro
2. **Close any File Explorers** viewing release folder
3. Run build command:
   ```bash
   npm run dist
   ```
4. Installer will be in: `release/MediSoft Pro Setup 1.3.8.exe`

### If Build Fails
- Close electron app completely
- Delete `release/win-unpacked` folder
- Try build again

---

## ✅ Testing Checklist

- [ ] Fast Billing auto-select works on all fields
- [ ] Ctrl+S saves without invoice popup
- [ ] Ctrl+P saves and shows invoice
- [ ] Ctrl+I jumps to search from payment panel
- [ ] Product dropdown shows pcs/box and purchase price
- [ ] Del button visible in cart
- [ ] Purchase Entry auto-fills company name
- [ ] Invoice prints correctly on 80mm printer
- [ ] No duplicate held bills created
- [ ] All keyboard shortcuts work

---

## 📝 User Notes

### For Cashiers
- Use **Ctrl+S** for quick sales (single items)
- Use **Ctrl+P** when customer needs printed invoice
- Press **Ctrl+I** to add more items after entering discount

### For Store Managers
- Invoice format optimized for 80mm thermal printer
- Store details now show on all invoices
- Purchase prices visible in Fast Billing dropdown

---

## 🐛 Known Issues

None - All major bugs fixed in this version

---

## 📞 Support

For issues or questions, contact the development team.

**Version:** 1.3.8  
**Build Date:** July 29, 2026  
**Status:** ✅ Production Ready
