# Fast Billing - Keyboard Shortcuts Guide

## Implementation Date
July 12, 2026

---

## Overview
Complete keyboard shortcut system for Fast Billing to speed up the billing process. All shortcuts work globally within the Fast Billing page.

---

## 🎯 New Shortcuts Added

### 1. **Ctrl + S** - Save Bill (Finish Sale)
- **Function:** Completes the current sale and saves the invoice
- **Same as:** F10 key (alternative)
- **Works when:** Cart has at least one item
- **What happens:**
  - Creates invoice
  - Updates stock
  - Updates customer balance (if credit)
  - Shows success message
  - Clears cart for next sale

---

### 2. **Ctrl + P** - Toggle Payment Method
- **Function:** Switches between Cash and Credit payment methods
- **Note:** We use Ctrl+P to toggle payment instead of printing to avoid browser's print dialog
- **Display:** Payment Method buttons show current selection
- **Cycle:** Cash → Credit → Cash

---

### 3. **Ctrl + F** - Focus Flat Discount
- **Function:** Jumps cursor to Flat Discount (PKR) input field
- **Behavior:** Auto-selects existing value for quick editing
- **Label shows:** "Flat Discount (Ctrl+F)"
- **Use case:** Quickly add flat PKR discount to bill

---

### 4. **Ctrl + T** - Focus Percent Discount  
- **Function:** Jumps cursor to Percentage Discount input field
- **Behavior:** Auto-selects existing value for quick editing
- **Label shows:** "Percent Discount (Ctrl+T)"
- **Use case:** Quickly add percentage discount to bill

---

### 5. **Ctrl + H** - Item History (When in Cart Row)
- **Function:** Shows sales history popup for the current product
- **Works when:** Focus is on any field in a cart item row (Qty, Price, Disc%)
- **What it shows:**
  - **Summary Stats:**
    - Total Sales count
    - Total Quantity sold
    - Average Price
    - Maximum Price
    - Minimum Price
  - **Sales History Table:**
    - Invoice Number
    - Sale Date & Time
    - Customer Name
    - Quantity sold
    - Sale Price
    - Total Amount
    - Cashier Name
  - **Last 50 sales** for this product
- **Close with:** ESC key or click outside modal

---

## 📋 All Available Shortcuts

### Global Shortcuts (anywhere in Fast Billing)

| Shortcut | Action | Description |
|----------|--------|-------------|
| **F1** | Focus Search | Jump to product search box |
| **F8** | Hold Bill | Save current bill and start new one |
| **F10** | Finish Sale | Complete sale and save invoice |
| **Ctrl + S** | Finish Sale | Same as F10 - save invoice |
| **Ctrl + P** | Payment Method | Toggle Cash ↔ Credit |
| **Ctrl + F** | Flat Discount | Focus on flat discount input |
| **Ctrl + T** | Percent Discount | Focus on percent discount input |
| **Ctrl + ←** | Previous Bill | Navigate to previous held bill |
| **Ctrl + →** | Next Bill | Navigate to next held bill |
| **Ctrl + Shift + A** | Amount Received | Focus on paid amount input |

### Product Search Shortcuts

| Shortcut | Action | Description |
|----------|--------|-------------|
| **↑** | Navigate Up | Select previous product in search results |
| **↓** | Navigate Down | Select next product in search results |
| **Enter** | Add Product | Add selected product to cart |
| **Esc** | Close Search | Clear search and hide dropdown |

### Cart Table Shortcuts (when focused on cart item)

| Shortcut | Action | Description |
|----------|--------|-------------|
| **→** | Next Field | Move to next field in same row |
| **←** | Previous Field | Move to previous field in same row |
| **↓** | Next Row | Move to same field in next row |
| **↑** | Previous Row | Move to same field in previous row |
| **Enter** | Next Field/Row | Move right, or down to next row |
| **Tab** | Next Input | Move to next input field |
| **Shift + Tab** | Previous Input | Move to previous input field |
| **Shift + Enter** | Jump to Discount | Jump to discount input |
| **Ctrl + H** | Item History | Show sales history popup for this item |

### Modal Shortcuts

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Esc** | Close Modal | Close item history popup |

---

## 🔧 Technical Implementation

### Backend - Sales History API
**File:** `electron/ipc/sales.js`

Added new IPC handler:
```javascript
ipcMain.handle('sales:getProductHistory', (_, productId) => {
  // Returns:
  // - history: Array of last 50 sales
  // - stats: Summary statistics (total sales, qty, avg/max/min price)
})
```

**Query Details:**
- Joins `sale_items`, `sales`, `customers`, and `users` tables
- Excludes voided sales
- Orders by date (newest first)
- Limits to 50 most recent sales
- Calculates aggregate stats (count, sum, avg, max, min)

---

### Frontend - Fast Billing Component
**File:** `src/pages/sales/FastBilling.jsx`

**New State Variables:**
```javascript
const [historyModal, setHistoryModal] = useState(null) // { productId, productName }
const [historyData, setHistoryData] = useState(null)   // { history: [], stats: {} }
const [loadingHistory, setLoadingHistory] = useState(false)
```

**New Functions:**
- `showItemHistory(item)` - Loads and displays history for a product
- `closeHistoryModal()` - Closes the history popup
- `formatDate(dateStr)` - Formats date for display

**Keyboard Event Handlers:**
- Added Ctrl+S, Ctrl+F, Ctrl+T handlers in main `useEffect`
- Added Ctrl+H handler in `handleCartKeyDown`
- Added ESC handler for closing modal
- Auto-selects text when focusing discount fields

---

## 🎨 UI Components

### Item History Modal
- **Full-screen overlay** with semi-transparent black background
- **Centered modal** (max-width: 4xl, max-height: 80vh)
- **Header Section:**
  - Product name
  - Close button (×)
- **Body Section:**
  - 5-column summary stats cards
  - Scrollable table with sales history
  - Empty state if no history
  - Loading spinner while fetching
- **Footer Section:**
  - ESC hint
  - Close button
- **Click outside to close**
- **ESC key to close**

---

## 📊 Item History Data

### Summary Stats
```
┌─────────────┬──────────────┬───────────┬───────────┬───────────┐
│ Total Sales │ Total Qty    │ Avg Price │ Max Price │ Min Price │
├─────────────┼──────────────┼───────────┼───────────┼───────────┤
│     245     │    1,230     │ PKR 12.50 │ PKR 15.00 │ PKR 10.00 │
└─────────────┴──────────────┴───────────┴───────────┴───────────┘
```

### Sales History Table
```
┌──────────┬─────────────────┬─────────────┬─────┬───────┬─────────┬──────────┐
│ Invoice  │ Date            │ Customer    │ Qty │ Price │ Total   │ Cashier  │
├──────────┼─────────────────┼─────────────┼─────┼───────┼─────────┼──────────┤
│ INV-1234 │ Jul 12, 02:30PM │ Walk-in     │  5  │ 12.50 │  62.50  │ Admin    │
│ INV-1233 │ Jul 12, 01:15PM │ John Doe    │ 10  │ 12.50 │ 125.00  │ Admin    │
│ INV-1232 │ Jul 11, 05:45PM │ ABC Pharma  │ 50  │ 10.00 │ 500.00  │ Cashier1 │
└──────────┴─────────────────┴─────────────┴─────┴───────┴─────────┴──────────┘
```

---

## 🎯 Use Cases & Workflows

### Workflow 1: Quick Sale with Discounts
```
1. F1 → Focus search
2. Type product name → Enter (add to cart)
3. Type another product → Enter
4. Ctrl + T → Enter percentage discount (e.g., 10%)
5. Ctrl + F → Enter flat discount (e.g., 5 PKR)
6. Ctrl + S → Complete sale
```

### Workflow 2: Check Item History Before Pricing
```
1. Add product to cart
2. Focus on product's Qty field (Tab to it)
3. Ctrl + H → View sales history popup
4. Review avg/max/min prices from history
5. ESC → Close modal
6. Adjust sale price based on history
7. Continue with sale
```

### Workflow 3: Multiple Bills (Hold & Navigate)
```
1. Create Bill #1, add items
2. F8 → Hold Bill #1
3. Create Bill #2, add items
4. Ctrl + ← → Go back to Bill #1
5. Ctrl + S → Complete Bill #1
6. Automatically returns to Bill #2
7. Ctrl + S → Complete Bill #2
```

---

## 🔍 How Item History Helps

### Pricing Decisions
- See **average price** to maintain consistency
- See **max price** to know upper limit
- See **min price** to avoid underpricing
- Compare current price with historical range

### Sales Patterns
- Identify **frequent customers** for this item
- See **purchase quantities** (bulk vs retail)
- Track **when** item sells most
- Analyze **who** (which cashier) sells most

### Inventory Planning
- **Total quantity sold** helps forecast demand
- **Total sales count** shows popularity
- **Recent sales** show current demand trend

---

## 💡 Tips & Best Practices

### Speed Tips
1. **Use Ctrl+S instead of clicking** - Faster to save
2. **Use Ctrl+T and Ctrl+F** instead of scrolling to discount fields
3. **Check history with Ctrl+H** before pricing expensive items
4. **Use Tab/Enter** to navigate cart instead of mouse

### Common Shortcuts Combo
```
Quick discount:
  Ctrl+T → Type 5 → Enter → Ctrl+S

Quick flat discount:
  Ctrl+F → Type 10 → Enter → Ctrl+S

Price check:
  Tab to product → Ctrl+H → Review → ESC → Adjust price → Ctrl+S
```

### Keyboard-Only Workflow
```
1. F1 (search)
2. Type product, Enter (add)
3. Tab (to qty)
4. Type qty, Enter
5. Enter (to price)
6. Type price, Enter
7. Ctrl+T (percent discount)
8. Type discount, Enter
9. Ctrl+S (complete sale)
```

---

## 🐛 Troubleshooting

### Ctrl+H not working?
- Make sure you're focused on a cart item field (Qty, Price, or Disc%)
- Cart must have at least one item
- Try clicking on the qty field first, then press Ctrl+H

### Ctrl+S saving browser page?
- The shortcut properly prevents browser's save dialog
- If it still happens, refresh the page

### Ctrl+P opening print dialog?
- We prevent the default browser print
- If it still happens, use the Payment Method buttons instead

### History modal not closing with ESC?
- Make sure modal is actually open (visible)
- Click outside the modal to close
- Use the Close button as alternative

---

## 📝 Files Modified

### Backend
- ✅ `electron/ipc/sales.js` - Added `sales:getProductHistory` handler

### Frontend
- ✅ `src/pages/sales/FastBilling.jsx` - Added all shortcuts and history modal

### Documentation
- ✅ `FAST-BILLING-SHORTCUTS.md` (this file)

---

## ✅ Testing Checklist

### Basic Shortcuts
- [ ] Ctrl+S completes sale
- [ ] Ctrl+P toggles payment method
- [ ] Ctrl+F focuses flat discount
- [ ] Ctrl+T focuses percent discount
- [ ] F8 holds bill
- [ ] F10 completes sale (alternative to Ctrl+S)

### Item History
- [ ] Ctrl+H opens history modal from cart row
- [ ] History shows summary stats correctly
- [ ] History shows sales table
- [ ] ESC closes modal
- [ ] Click outside closes modal
- [ ] Close button works
- [ ] Loading state shows while fetching
- [ ] Empty state shows when no history

### Edge Cases
- [ ] Ctrl+H when cart is empty (should do nothing)
- [ ] Ctrl+S when cart is empty (should do nothing)
- [ ] History for product with no sales (shows empty state)
- [ ] History for product with 100+ sales (shows last 50)

---

## 🚀 Future Enhancements

### Possible Additions
1. **Export history to PDF/Excel** from modal
2. **Filter history by date range** in modal
3. **Ctrl+Print** for actual printing (after completing sale)
4. **Ctrl+Q** for quick quotation
5. **Ctrl+R** for sale returns
6. **F2** to edit customer
7. **F3** to add new customer

---

## 📱 Quick Reference Card

```
╔══════════════════════════════════════════════════════════════╗
║           FAST BILLING - KEYBOARD SHORTCUTS                  ║
╠══════════════════════════════════════════════════════════════╣
║  Ctrl + S  →  Save Bill (Finish Sale)                       ║
║  Ctrl + P  →  Toggle Payment Method (Cash/Credit)           ║
║  Ctrl + F  →  Focus Flat Discount                           ║
║  Ctrl + T  →  Focus Percent Discount                        ║
║  Ctrl + H  →  Item History (when in cart row)              ║
║  ─────────────────────────────────────────────────────────  ║
║  F1        →  Search Products                                ║
║  F8        →  Hold Bill                                      ║
║  F10       →  Finish Sale                                    ║
║  ─────────────────────────────────────────────────────────  ║
║  ESC       →  Close Modal / Clear Search                    ║
║  Enter     →  Add Product / Next Field                      ║
║  Tab       →  Next Input Field                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

**Enjoy faster billing!** 🚀
