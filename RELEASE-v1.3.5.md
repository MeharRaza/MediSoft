# MediSoft Pro v1.3.5 Release Notes

**Release Date:** July 19, 2026

---

## 🎯 Major Changes

### Fast Billing Module - Complete UI/UX Overhaul

#### Product Search Dropdown Improvements
1. **Removed Category Badge**
   - Category "TAB •" badge removed from product dropdown
   - Now shows only product name and company name for cleaner display

2. **Per-Box Pricing Display**
   - Price changed from per-pill to per-box in dropdown
   - Formula: `price × pcs_in_pack`
   - Shows as "PKR XXX.00/box"

3. **Company Name Display**
   - Product dropdown now shows company name under product name
   - Replaces generic name for better product identification

4. **Simplified Stock Display**
   - Removed "Current: X pills" section
   - Highlighted "Total: X pills" with bold font
   - Shows breakdown as "(X boxes + X loose)" when applicable
   - Stock calculation fixed to show real-time remaining stock

5. **Real-Time Stock Updates**
   - Backend now calculates boxes/loose from actual remaining pills
   - Formula: `boxes = floor(stock / pcs_in_pack)`, `loose = stock % pcs_in_pack`
   - Dropdown and cart now show matching stock values
   - Stock updates immediately after sales

#### Held Bills Navigation
6. **Text Buttons Replace Icons**
   - "Previous" and "Next" text buttons instead of chevron icons
   - "Delete" button (shown when viewing held bill)
   - "Clear All" button for clearing all held bills
   - All buttons have white background with borders and hover effects

---

## 📝 Summary of Changes

**Frontend (`FastBilling.jsx`):**
- Product dropdown: Removed category badge, added company name
- Price display: Changed to per-box pricing
- Stock display: Simplified to show only total with highlight
- Stock calculation: Real-time boxes/loose from remaining pills
- Navigation: Text buttons for held bills

**Backend (`inventory.js`):**
- Removed incorrect `total_boxes` and `total_loose` queries
- Frontend now calculates from `stock` value for accuracy
- Real-time stock: `(qty - qty_sold)` ensures live updates

---

## ✅ Fixed Issues

1. ✅ Category badge removed from Fast Billing dropdown
2. ✅ Per-box pricing displayed instead of per-pill
3. ✅ Company name shown under product name
4. ✅ Stock display mismatch fixed (dropdown vs cart)
5. ✅ Real-time stock calculation corrected
6. ✅ Held bills navigation uses text buttons

---

## 🔧 Technical Details

**Modified Files:**
- `src/pages/sales/FastBilling.jsx`
- `electron/ipc/inventory.js`
- `package.json`

**Version:** 1.3.5
**Build Date:** 2026-07-19

---

## 📦 Installation

1. Download `MediSoft Pro Setup 1.3.5.exe`
2. Run installer
3. Auto-update will apply database migrations automatically
4. All existing data preserved

---

## 🚀 Next Steps

Future improvements may include:
- Additional keyboard shortcuts
- Enhanced stock management features
- More reporting capabilities

---

**Developed by:** MediSoft Pro Team  
**Support:** Contact your system administrator
