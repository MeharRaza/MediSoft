# CHANGELOG - Version 1.4.0

**Release Date**: August 5, 2026  
**Build Status**: ✅ Ready for Testing

---

## 🔧 CRITICAL BUG FIXES

### 1. Sales Return with Manual Discount Control ⭐ **MAJOR UPDATE**
**Problem**: Sales returns needed flexible discount handling - sometimes same as original invoice, sometimes different based on return conditions.

**NEW Flexible Approach**:
- ✅ **Original invoice discount displayed** as reference
- ✅ **Auto-suggests same discount percentage** from original invoice
- ✅ **User can manually adjust discount** (increase/decrease as needed)
- ✅ **Return amount = Items total - User's discount**

**Example Scenario**:

**Original Invoice:**
- 10 items @ Rs. 100 each = Rs. 1000
- Discount: 20% (Rs. 200)
- Customer Paid: Rs. 800

**Return Scenario 1 - Full Return with Same Discount:**
- Return: All 10 items (Rs. 1000)
- Discount field: **20%** (auto-suggested, keep as-is)
- Final Return: Rs. 800 ✅

**Return Scenario 2 - Partial Return with Same %:**
- Return: 3 items (Rs. 300)
- Discount field: **20%** (auto-suggested, keep as-is)
- Final Return: Rs. 240 ✅

**Return Scenario 3 - Partial Return with Different Discount:**
- Return: 5 items (Rs. 500)
- Original had 20%, but user changes to **10%**
- Final Return: Rs. 450 ✅

**Return Scenario 4 - No Discount on Return:**
- Return: 2 items (Rs. 200)
- User changes discount to **0%**
- Final Return: Rs. 200 ✅

**Files Modified**:
- `src/pages/sales/SalesReturn.jsx` - Added discount input field with auto-suggestion
- `electron/ipc/sales.js` - Simplified to use frontend-calculated total

**UI Improvements**:
- ✅ Shows original invoice discount info (amount & percentage)
- ✅ Discount % field (0-100, can use decimals like 5.5%)
- ✅ Real-time calculation: Sub-total - Discount = Final Return
- ✅ Clear breakdown in table footer showing all calculations

---

## 📊 DASHBOARD IMPROVEMENTS

### 2. Sales Return Tracking
**Changes**:
- ✅ Added "Sales Returns" stat card showing today's return amount
- ✅ Changed "Today's Sales" to "Today's Net Sales" for clarity
- ✅ Dashboard now shows: **Gross Sales - Returns = Net Sales**
- ✅ Return count displayed alongside return amount

**Files Modified**:
- `src/pages/Dashboard.jsx` - Added return stats display

---

## 📈 SALES HISTORY IMPROVEMENTS

### 3. Returns Breakdown Display
**Changes**:
- ✅ Added separate "Sales Returns" card showing total returns for period
- ✅ Added "Net Sales" card showing: Gross Sales - Returns
- ✅ Returns data now fetched alongside invoices
- ✅ Clear visual breakdown: Gross Sales | Returns | Net Sales

**Files Modified**:
- `src/pages/sales/SalesHistory.jsx` - Added returns display section

---

## 🧪 TESTING CHECKLIST

### Before Release Testing:
- [ ] Test return with original invoice discount (auto-suggested)
- [ ] Test return with user changing discount to different %
- [ ] Test return with 0% discount (full amount refund)
- [ ] Test partial return with adjusted discount
- [ ] Verify dashboard reflects correct return amount
- [ ] Check sales history shows proper net sales
- [ ] Verify customer balance adjustment is correct
- [ ] Test with decimal discount percentages (e.g., 5.5%)

### Test Scenarios:

**Scenario 1: Same Discount as Original**
1. Create invoice: Rs. 1000, 20% discount = Rs. 800 paid
2. Return all items
3. Keep discount at 20% (auto-suggested)
4. **Expected**: Return Rs. 800

**Scenario 2: Different Discount on Return**
1. Create invoice: Rs. 500, 10% discount = Rs. 450 paid
2. Return 2 items worth Rs. 200
3. Change discount to 5%
4. **Expected**: Return Rs. 190 (200 - 5%)

**Scenario 3: No Discount on Return**
1. Create invoice: Rs. 300, 15% discount = Rs. 255 paid
2. Return 1 item worth Rs. 100
3. Change discount to 0%
4. **Expected**: Return Rs. 100 (full price)

**Scenario 4: Partial Return, Higher Discount**
1. Create invoice: Rs. 600, no discount = Rs. 600 paid
2. Return items worth Rs. 200
3. Add 20% discount on return (goodwill/damaged)
4. **Expected**: Return Rs. 160

---

## 📝 KNOWN ISSUES
None at this time.

---

## 🔄 UPGRADE NOTES

### Database Changes:
- ✅ **No schema changes** - existing data structure supports this fix
- ✅ Existing returns will continue using old calculation method
- ✅ **NEW returns** from this version will use correct discount calculation

### Backwards Compatibility:
- ✅ Fully compatible with existing database
- ✅ No migration required
- ✅ Old return records remain unchanged
- ⚠️ Historical return amounts may be incorrect (were not accounting for discounts)

---

## 🎯 NEXT VERSION GOALS

### Planned for v1.4.1:
- [ ] Historical return data recalculation tool (optional)
- [ ] Return reason tracking (damaged, expired, customer request, etc.)
- [ ] Return receipt printing
- [ ] Return approval workflow for high-value returns

---

## 👨‍💻 DEVELOPER NOTES

### Key Implementation Details:

1. **Discount Auto-Suggestion**:
   - Calculates original invoice discount: `(sub_total - grand_total) / sub_total × 100`
   - Pre-fills discount field when invoice is selected
   - User can freely modify (0-100%)

2. **Flexible Discount Application**:
   - Frontend calculates: `returnSubTotal × (discount% / 100)`
   - User has full control - can match original or adjust
   - Backend stores final calculated amount

3. **Real-time Calculation**:
   ```javascript
   returnSubTotal = Σ(item.qty × item.price)
   discountAmount = returnSubTotal × (discount% / 100)
   finalReturn = returnSubTotal - discountAmount
   ```

4. **Customer Balance**:
   - Balance adjustment uses final return amount
   - Matches exact amount refunded to customer

---

### Why This Approach?

**Previous approach** (automatic proportional discount):
- ❌ Inflexible - always uses same % as original
- ❌ Doesn't account for damaged/expired items
- ❌ No goodwill discount option

**New approach** (manual discount control):
- ✅ Flexible - user decides discount per return
- ✅ Can adjust for item condition
- ✅ Can add goodwill discount
- ✅ Can remove discount if policy changed
- ✅ Shows original as reference but doesn't force it

---

## 📞 SUPPORT

If you encounter issues with this update:
1. Check console logs for return transaction details
2. Verify original invoice has discount applied
3. Compare return amount with expected discounted value
4. Contact developer if calculations still incorrect

---

**Built with ❤️ for MediSoft Pro**
