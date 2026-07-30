# Box-Based Pricing System - Testing Guide

**Version:** 1.2.1  
**Date:** July 9, 2026  
**Status:** Ready for Testing

---

## 🎯 Testing Overview

This guide will help you test the complete **Box-Based Pricing System** with **GST Tax** and **Profit % Display**.

---

## ⚡ Quick Start

### Start Dev Server:
```bash
npm run dev
```

### What to Test:
1. ✅ Purchase Entry with box-based prices
2. ✅ GST Tax % calculation
3. ✅ Profit % display in Purchase Entry
4. ✅ Fast Billing shows latest prices
5. ✅ Profit % badge in Fast Billing cart
6. ✅ Stock display (current vs total)

---

## 📋 PART 1: Purchase Entry Testing

### Test Case 1: Create Purchase with Box Prices

**Steps:**

1. **Open Purchase Entry page**
   - Click "Purchase" → "Purchase Entry"

2. **Fill Header:**
   - Supplier: Select any supplier (or leave blank)
   - Invoice Number: (auto-filled or enter manually)
   - Invoice Date: Today's date
   - Payment Method: Credit or Cash

3. **Add First Product - Example 1:**
   ```
   Product Name: Nims (or type new product name)
   Category: Tablets
   Rack: A-12
   pcs/pack: 10
   Expiry Date: (select future date, e.g., 2027-12-31)
   Purchase/Box: 15
   Sale/Box: 20
   Boxes: 2
   Loose: 5
   Bonus: 0
   Disc%: 0
   ```

4. **Check Calculations:**
   - ✅ Total Qty shows: **25** (2 boxes × 10 + 5 loose)
   - ✅ Net Amount shows: **375** (15 × 25)
   - ✅ Profit% shows: **33.3%** (green) — `((20-15)/15) × 100`

5. **Add Second Product - Example 2:**
   ```
   Product Name: Panadol
   pcs/pack: 20
   Purchase/Box: 50
   Sale/Box: 65
   Boxes: 1
   Loose: 10
   ```

6. **Check Calculations:**
   - ✅ Total Qty: **30** (1 × 20 + 10)
   - ✅ Net Amount: **1500** (50 × 30)
   - ✅ Profit%: **30.0%** (green)

7. **Test Keyboard Navigation:**
   - ✅ After entering Disc%, press **Tab** or **Enter**
   - ✅ New row should auto-add
   - ✅ Focus should jump to Product Search of new row

8. **Add GST Tax:**
   - Scroll to bottom totals panel
   - Find **GST Tax %** field
   - Enter: **0.5** (for 0.5% tax)
   - Press Tab or click outside

9. **Verify Profit Adjustment:**
   - ✅ Nims profit changes: **33.3%** → **32.8%** (33.3 - 0.5)
   - ✅ Panadol profit changes: **30.0%** → **29.5%** (30 - 0.5)
   - ✅ All rows update automatically
   - ✅ Grand Total increases by 0.5% of subtotal

10. **Test Different GST Values:**
    - Change GST to **1.0%**
    - ✅ Nims: **32.3%**, Panadol: **29.0%**
    - Change GST to **2.0%**
    - ✅ Nims: **31.3%**, Panadol: **28.0%**

11. **Save Purchase:**
    - Click "Save" button (or Ctrl+S)
    - ✅ Success message appears
    - ✅ Invoice number displayed
    - ✅ New blank form loads

---

### Test Case 2: Multiple Purchases with Different Prices

**Purpose:** Test that Fast Billing uses LATEST prices

**Steps:**

1. **First Purchase - Day 1 (Old Price):**
   ```
   Product: Brufen
   pcs/pack: 10
   Purchase/Box: 30
   Sale/Box: 40
   Boxes: 1
   GST: 0.5%
   ```
   - Save this purchase
   - Note: Profit = 32.8% (33.3 - 0.5)

2. **Second Purchase - Day 2 (New Price):**
   ```
   Product: Brufen (same product)
   pcs/pack: 10
   Purchase/Box: 35 (increased)
   Sale/Box: 50 (increased)
   Boxes: 1
   GST: 0.5%
   ```
   - Save this purchase
   - Note: Profit = 42.4% (42.9 - 0.5)

3. **Expected Result:**
   - Fast Billing should show **Rs. 5 per pill** (50÷10)
   - Not Rs. 4 per pill (old price)
   - Profit should show **+42.4%**

---

## 📋 PART 2: Fast Billing Testing

### Test Case 3: Verify Latest Price Display

**Steps:**

1. **Open Fast Billing:**
   - Click "Sales" → "Fast Billing"
   - Focus should be on search box

2. **Search for Nims:**
   - Type "Nims" in search box
   - ✅ Dropdown appears with products

3. **Check Search Results:**
   - ✅ Price shown: **PKR 2.00** (20÷10 per piece)
   - ✅ Stock shown: Current batch quantity
   - ✅ Expiry date displayed

4. **Add to Cart:**
   - Press **Enter** or click product
   - Product added to cart

5. **Verify Cart Display:**
   - ✅ Product Name: Nims
   - ✅ Qty: 1
   - ✅ Price: **2** (per piece)
   - ✅ **Profit Badge:** **+32.8%** (green badge next to price)
   - ✅ Total: 2

6. **Add More Products:**
   - Search "Panadol"
   - Add to cart
   - ✅ Check profit badge shows: **+29.5%**

7. **Check Profit Badge Colors:**
   - ✅ Positive profit: Green background, green text
   - ✅ Format: **+XX.X%**

---

### Test Case 4: Stock Display Testing

**Steps:**

1. **In Fast Billing search results:**
   - ✅ **Current:** Shows active batch stock (FIFO - oldest)
   - ✅ **Total:** Shows all batches combined
   - ✅ Format: "Current: 25 pills" and "Total: 55 pills"

2. **Add Product with Multiple Batches:**
   - If Nims has 2 purchases (25 + 30 = 55 total)
   - ✅ Current should show: **25 pills** (oldest batch)
   - ✅ Total should show: **55 pills**

3. **Sell Stock to Test FIFO:**
   - Add 25 units of Nims to cart
   - Complete sale
   - Search Nims again
   - ✅ Current should now show: **30 pills** (next batch)
   - ✅ Total should show: **30 pills**

---

### Test Case 5: Price Update Testing

**Purpose:** Verify Fast Billing uses LATEST prices

**Steps:**

1. **Search Brufen (from Test Case 2):**
   - ✅ Price shows: **PKR 5.00** (latest: 50÷10)
   - ✅ NOT **PKR 4.00** (old price)
   - ✅ Profit shows: **+42.4%**

2. **Add to Cart:**
   - ✅ Cart shows: Price **5**, Profit **+42.4%**

---

## 📋 PART 3: Edge Cases & Error Testing

### Test Case 6: Negative Profit

**Steps:**

1. **Create Purchase with Loss:**
   ```
   Product: TestMed
   pcs/pack: 10
   Purchase/Box: 100
   Sale/Box: 80 (selling at loss)
   Boxes: 1
   GST: 0.5%
   ```

2. **Verify Display:**
   - ✅ Purchase Entry shows: **-20.5%** (red)
   - Base: ((80-100)/100)×100 = -20%
   - After GST: -20 - 0.5 = **-20.5%**

3. **In Fast Billing:**
   - Search TestMed
   - Add to cart
   - ✅ Profit badge shows: **-20.5%** (red badge)

---

### Test Case 7: Zero Profit

**Steps:**

1. **Create Purchase with Zero Margin:**
   ```
   Product: NoProfit
   pcs/pack: 10
   Purchase/Box: 50
   Sale/Box: 50 (no markup)
   Boxes: 1
   GST: 0.5%
   ```

2. **Verify:**
   - ✅ Purchase Entry: **-0.5%** (red) — GST eats into it
   - ✅ Fast Billing: **-0.5%** (red badge)

---

### Test Case 8: High GST Tax

**Steps:**

1. **Create Purchase:**
   ```
   Product: HighTax
   Purchase/Box: 100
   Sale/Box: 120
   GST: 15% (high tax)
   ```

2. **Verify:**
   - Base profit: 20%
   - After GST: 20 - 15 = **5%**
   - ✅ Shows: **+5.0%** (green)

---

## 📋 PART 4: Keyboard Shortcuts Testing

### Purchase Entry Shortcuts:

| Shortcut | Action | Test |
|----------|--------|------|
| **Tab/Enter** (on last field) | Add new row | ✅ Press Tab on Disc% field |
| **F8** | Hold Purchase | ✅ Fill items, press F8 |
| **Ctrl + ←** | Previous held purchase | ✅ Navigate held bills |
| **Ctrl + →** | Next held purchase | ✅ Navigate held bills |
| **Ctrl + S** | Save purchase | ✅ Save shortcut |

### Fast Billing Shortcuts:

| Shortcut | Action | Test |
|----------|--------|------|
| **F1** | Focus search | ✅ Press F1 from anywhere |
| **↑ ↓** | Navigate search results | ✅ Use arrows in dropdown |
| **Enter** | Select product | ✅ Press on highlighted item |
| **F8** | Hold bill | ✅ Hold current bill |
| **Ctrl + ←/→** | Navigate held bills | ✅ Switch between bills |
| **Shift + Enter** | Jump to payment panel | ✅ From cart to discount |

---

## 📋 PART 5: Visual Verification Checklist

### Purchase Entry UI:

- ✅ Column headers show: "Purchase/Box" and "Sale/Box"
- ✅ "Profit%" column visible
- ✅ Profit values show 1 decimal place (e.g., 32.8%)
- ✅ Green color for positive profit
- ✅ Red color for negative profit
- ✅ GST Tax % field in totals panel
- ✅ "Add Row" button at bottom (not top)
- ✅ All rows update when GST changes

### Fast Billing UI:

- ✅ Profit badge appears next to price input
- ✅ Badge has background color (green or red)
- ✅ Format: "+32.8%" or "-5.0%"
- ✅ Font size is small (10px)
- ✅ Badge is rounded with padding
- ✅ Doesn't interfere with price input

---

## 🐛 Common Issues to Check

### Issue 1: Profit % Not Showing
**Check:**
- Backend returns `profit_percent` in search results
- Frontend captures it in `addItem()` function
- Badge render condition: `{item.profit_percent !== undefined && ...}`

**Debug:**
- Open browser console (F12)
- Look for: "✅ Item added to cart:" log
- Verify `profit_percent` field exists

### Issue 2: Wrong Profit Calculation
**Check:**
- Calculation uses **box prices**, not per-piece
- Formula: `((sale_box - purchase_box) / purchase_box) × 100`
- GST is subtracted: `base_profit - gst_tax_percent`

### Issue 3: Old Price Showing
**Check:**
- Backend query uses: `ORDER BY pu.created_at DESC`
- Not: `ORDER BY pu.created_at ASC`
- Latest entry should be first

### Issue 4: Stock Display Wrong
**Check:**
- "Current" uses FIFO (ASC) for stock management
- "Total" sums all batches
- Filter: `WHERE pi.qty > pi.qty_sold`

---

## ✅ Final Verification

After all tests, verify:

1. **Database:**
   - ✅ Check `purchases` table has `gst_tax_percent` column
   - ✅ Check stored prices are per-box values

2. **Functionality:**
   - ✅ Purchase Entry saves with GST tax
   - ✅ Profit % adjusts when GST changes
   - ✅ Fast Billing shows latest prices
   - ✅ Profit badge displays correctly
   - ✅ Stock FIFO works properly

3. **UI/UX:**
   - ✅ Keyboard shortcuts work
   - ✅ Auto-add row works
   - ✅ Colors are appropriate
   - ✅ No console errors

---

## 📝 Test Results Template

**Tester:** _______________  
**Date:** _______________  
**Version:** 1.2.1

| Test Case | Status | Notes |
|-----------|--------|-------|
| Purchase Entry - Box Prices | ⬜ Pass / ⬜ Fail | |
| GST Tax Calculation | ⬜ Pass / ⬜ Fail | |
| Profit % Display | ⬜ Pass / ⬜ Fail | |
| Fast Billing - Latest Price | ⬜ Pass / ⬜ Fail | |
| Profit Badge Display | ⬜ Pass / ⬜ Fail | |
| Stock Display | ⬜ Pass / ⬜ Fail | |
| Keyboard Navigation | ⬜ Pass / ⬜ Fail | |
| Negative Profit | ⬜ Pass / ⬜ Fail | |
| Multiple Prices | ⬜ Pass / ⬜ Fail | |

**Overall Status:** ⬜ Pass / ⬜ Fail

**Issues Found:**
_______________________________________________
_______________________________________________

---

## 🎯 Next Steps After Testing

If all tests pass:
1. Build production version: `npm run build`
2. Test installer
3. Deploy to production
4. Monitor user feedback

If issues found:
1. Document issues with screenshots
2. Share with developer
3. Fix and retest

---

**Happy Testing! 🚀**
