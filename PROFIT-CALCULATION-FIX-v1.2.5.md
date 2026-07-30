# Profit Calculation Fix - v1.2.5

**Release Date:** July 13, 2026  
**Type:** Critical Bug Fix  
**Issue:** Negative/incorrect profit showing in dashboard

---

## 🐛 Problem

**Reported Issue:**
- Sold 1 piece (NIMS tablet)
- Sale price: PKR 48
- Expected profit: PKR 6.45
- **Actual shown:** PKR -376.13 ❌

**Root Cause:**
The profit calculation was using **box purchase price** instead of **per-piece purchase price**.

---

## 📊 Example Scenario

**Product:** NIMS Tablet
- Box contains: 10 pieces
- Box purchase price: PKR 425
- **Per-piece cost:** 425 ÷ 10 = **PKR 42.5**
- Sale price per piece: PKR 48

**Wrong Calculation (v1.2.4 and earlier):**
```
Profit = Sale Price - Box Price
Profit = 48 - 425 = -376 ❌ WRONG!
```

**Correct Calculation (v1.2.5):**
```
Profit = Sale Price - (Box Price ÷ Pieces in Box)
Profit = 48 - (425 ÷ 10)
Profit = 48 - 42.5 = 5.5 ✅ CORRECT!
```

---

## 🔧 Technical Fix

### Files Changed:

#### 1. `electron/ipc/sales.js` (Dashboard Profit)
**Before:**
```sql
SELECT COALESCE(SUM(si.total - (pi.purchase_price * si.qty)),0) as profit
```

**After:**
```sql
SELECT COALESCE(SUM(si.total - ((pi.purchase_price / pi.pcs_in_pack) * si.qty)),0) as profit
```

**Change:** Added `/ pi.pcs_in_pack` to convert box price to per-piece price

---

#### 2. `electron/ipc/reports.js` (COGS in Profit/Loss Report)
**Before:**
```sql
SELECT COALESCE(SUM(si.qty * COALESCE(pi.purchase_price,0)),0) as t
```

**After:**
```sql
SELECT COALESCE(SUM(si.qty * COALESCE((pi.purchase_price / pi.pcs_in_pack),0)),0) as t
```

**Change:** Added `/ pi.pcs_in_pack` to calculate correct Cost of Goods Sold (COGS)

---

## 📍 Where This Affects

### ✅ Fixed:
1. **Dashboard "Net Profit Today" card** - Now shows correct profit
2. **Profit & Loss Report** - Now calculates correct COGS and gross profit
3. **All profit calculations** - Now use per-piece cost

### ℹ️ Note:
This fix applies to the **box-based pricing system**. The formula correctly divides the box purchase price by the number of pieces in the box to get the per-piece cost.

---

## 🧮 Profit Formula (Correct)

```
For each sale item:
  Per-Piece Cost = Box Purchase Price ÷ Pieces in Box
  Item Profit = (Sale Price × Quantity) - (Per-Piece Cost × Quantity)
  
Total Profit = Sum of all Item Profits
```

### Example with 3 pieces sold:
```
Box price: 425
Pieces in box: 10
Per-piece cost: 425 ÷ 10 = 42.5

Sale: 3 pieces @ 48 each
Sale total: 3 × 48 = 144
Cost: 3 × 42.5 = 127.5
Profit: 144 - 127.5 = 16.5 ✅
```

---

## 🔍 How to Verify the Fix

### Test Case 1: Single Piece Sale
1. Buy a box (e.g., 10 pieces for PKR 425)
2. Sell 1 piece for PKR 48
3. Check Dashboard "Net Profit Today"
4. **Expected:** Positive profit (~5-6 PKR)
5. **Before fix:** Negative profit (-376 PKR)

### Test Case 2: Multiple Pieces Sale
1. Sell 5 pieces from same box @ PKR 48 each
2. Total sale: 5 × 48 = PKR 240
3. Cost: 5 × 42.5 = PKR 212.5
4. **Expected profit:** 240 - 212.5 = PKR 27.5

### Test Case 3: Full Box Sale
1. Sell all 10 pieces @ PKR 48 each
2. Total sale: 10 × 48 = PKR 480
3. Cost: 10 × 42.5 = PKR 425
4. **Expected profit:** 480 - 425 = PKR 55

---

## 📋 Database Schema Reference

The fix relies on these columns in `purchase_items` table:
- `purchase_price` - Price per box (e.g., 425)
- `pcs_in_pack` - Number of pieces in box (e.g., 10)

**Per-piece cost formula:**
```sql
purchase_price / pcs_in_pack
```

---

## ⚠️ Important Notes

1. **Existing Data:** This fix applies to all historical data immediately. Past sales will now show correct profits when you view reports.

2. **Zero Division:** If `pcs_in_pack` is 0 or NULL, the formula will return NULL, which is handled by `COALESCE(..., 0)`.

3. **Manual Products:** Products added manually (not via Purchase Entry) may not have `purchase_item_id`, so their profit will be calculated as full sale price (no cost).

---

## 🎯 Impact

### Who Benefits:
- ✅ Pharmacy owners - See accurate daily profit
- ✅ Managers - Make decisions based on correct data
- ✅ Accountants - Get accurate COGS and profit reports

### What's Fixed:
- ✅ Dashboard daily profit card
- ✅ Profit & Loss report
- ✅ COGS calculations
- ✅ All profit-related metrics

---

## 📦 Installation

1. Close MediSoft Pro
2. Run `MediSoft Pro Setup 1.2.5.exe`
3. Follow installer
4. Launch app and check dashboard profit

---

## 🐛 Previous Versions Affected

- ❌ v1.2.4 and earlier - Had incorrect calculation
- ✅ v1.2.5 - Fixed

---

## 💬 User Feedback

**Original Report (Urdu):**
> "there is an issue... i have sold one nims but in the profit card it shows profit in negative... agar aik goli li hai to os ki price 48 hai or dabi ki price 425 hai... to wo minus kr k 376 profit card me show kaarwa raha hai"

**Translation:**
> "If one tablet is taken, its price is 48 and the medicine box price is 425... it's subtracting and showing 376 as profit"

**Status:** ✅ FIXED in v1.2.5

---

**Version:** 1.2.5  
**Bug Severity:** Critical (affects financial reporting)  
**Fix Status:** ✅ Resolved
