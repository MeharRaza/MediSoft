# MediSoft Pro - Version 1.3.6 Summary (Urdu)

**Release Date:** 20 July 2026  
**Version:** 1.3.6

---

## 🎯 KIYA NAYA HAI?

### 1. Supplier-Company-Products System
**Pehle:** Supplier select karte the, sari products dikh jati thi  
**Ab:** Supplier → Company → Products (step-by-step)

**Example:**
```
Supplier: Alqadir Medicose
  ↓
Companies: SAMI, Ferozsons, Abbott, GSK
  ↓
SAMI select karo → Sirf SAMI ki medicines dikhegi
```

**Faida:**
- Medicines jaldi mil jati hain
- Company wise organize
- Old data bhi kaam karega

---

## 📦 PURCHASE ENTRY PAGE

### Kya Badla:

#### 1. Company Selection Buttons
- Supplier select karne ke baad companies ke buttons dikhte hain
- Jis company ko select karo, us ki rang blue ho jati hai
- Products us company ki automatically load ho jati hain

#### 2. Product Name Column Bara Hua
- Pehle: 320px
- Ab: 350px
- Medicine ke lambe naam ab ache se dikh jate hain

#### 3. Stock Information
- Jab product search karo, stock bhi dikhai deta hai
- Example: "Stock: 20 pcs"

---

## 📋 PURCHASE ORDERS PAGE

### Naye Features:

#### 1. Current Stock Column **[NAYA]**
- Har product ke saath current stock dikhai deta hai
- **Green badge:** Stock available hai
- **Red badge:** Stock khatam hai (0)
- Format: "20 pcs"

#### 2. Decimal Values Support **[NAYA]**
- **Order Qty:** Ab decimal enter kar sakte hain
  - Example: 0.5, 1.75, 2.25
- **Est. Price:** Decimal prices
  - Example: 335.75, 450.50
- Pehle sirf integer values allow thi

#### 3. Company Products Quick List
- Company select karo → Products buttons dikhte hain
- Har button pe:
  - Medicine ka naam
  - Current stock (green badge)
- Ek click mein order mein add ho jati hai

---

## 👥 SUPPLIERS PAGE

### Naye Features:

#### Companies Field
- Har supplier ke saath companies add kar sakte hain
- **Kaise Add Karen:**
  1. Input field mein company name likho (e.g., "SAMI")
  2. Enter press karo ya Add button click karo
  3. Company pill ban jati hai
  4. X button se remove kar sakte hain

**Example:**
```
Supplier: Alqadir Medicose
Companies: [SAMI ✕] [Ferozsons ✕] [Abbott ✕]
```

---

## 🗄️ DATABASE CHANGES

### Naya Table: `supplier_companies`

**Kaam:**
- Supplier aur company ka relation store karta hai
- Ek supplier ke paas multiple companies ho sakti hain

**Automatic:**
- App start hote hi table ban jata hai
- Koi manual kaam nahi karna

---

## 🐛 BUG FIXES

### 1. Stock 0 Show Ho Raha Tha
**Problem:** 20 pieces stock hai, lekin 0 dikha raha tha  
**Fix:** Stock calculation query fix kar di  
**Status:** ✅ Theek ho gaya

### 2. Decimal Values Nahi Le Raha Tha
**Problem:** 335.75 enter karne pe error aa raha tha  
**Fix:** Input fields mein decimal support add kar diya  
**Status:** ✅ Theek ho gaya

---

## 📊 KAISE USE KAREN?

### Step 1: Suppliers Page Setup

1. **Suppliers** page kholo
2. Supplier add/edit karo
3. **Companies** section mein:
   - Company name likho (SAMI, Abbott, etc.)
   - Enter press karo
   - Aur companies add karo
4. Save karo

### Step 2: Purchase Entry

1. **Purchase Entry** page kholo
2. **Supplier** select karo (e.g., Alqadir Medicose)
3. Neeche companies ke buttons dikhenge
4. Company button click karo (e.g., SAMI)
5. Products ki list aa jayegi
6. Product button click karo → Row mein add ho jayegi
7. Quantity, price waghaira bharo
8. Save karo

### Step 3: Purchase Order

1. **Purchase Orders** page kholo
2. **Supplier** select karo
3. **Company** select karo
4. Products dikhenge with **stock info**
5. **Current Stock** column dekho (green/red)
6. Product click karo → Order mein add
7. **Order Qty** bharo (decimal bhi chalega: 0.5, 1.75)
8. **Est. Price** bharo (decimal allowed)
9. Create PO karo

---

## ✅ TESTING CHECKLIST

### Suppliers Page:
- [x] Company add ho rahi hai
- [x] Multiple companies add ho sakti hain
- [x] Company remove ho rahi hai (X button)
- [x] Save pe companies save ho rahi hain
- [x] Edit pe companies load ho rahi hain

### Purchase Entry:
- [x] Supplier select karne pe companies aa rahi hain
- [x] Company button kaam kar rahe hain
- [x] Products filter ho rahi hain company se
- [x] Product buttons add kar rahe hain
- [x] Stock dikhai de raha hai search mein
- [x] Clear selection button kaam kar raha hai

### Purchase Orders:
- [x] Company selection kaam kar raha hai
- [x] Current Stock column dikhai de raha hai
- [x] Stock ka color sahi hai (green/red)
- [x] Order Qty mein decimal enter ho raha hai (0.5, 1.75)
- [x] Est. Price mein decimal enter ho raha hai (335.75)
- [x] Stock calculation sahi hai (0 nahi aa raha)

---

## 🎨 UI CHANGES

### Colors:
- **Blue:** Company selection, selected state
- **Green:** Stock available, positive
- **Red:** Out of stock, delete
- **White:** Unselected, normal state

### Layout:
```
┌─────────────────────────┐
│ Supplier Selection      │ ← Dropdown
└─────────────────────────┘
           ↓
┌─────────────────────────┐
│ [SAMI] [Ferozsons] ...  │ ← Buttons (Blue theme)
└─────────────────────────┘
           ↓
┌─────────────────────────┐
│ SAMI Products:          │
│ [Nims] [Panadol] ...    │ ← Product buttons
└─────────────────────────┘
```

---

## 📁 KON SI FILES BADLI?

### Backend (Electron):
1. `electron/database.js` - Naya table
2. `electron/ipc/purchase.js` - Naye APIs + stock fix
3. `electron/preload.js` - IPC bindings

### Frontend (React):
1. `src/lib/api.js` - API endpoints
2. `src/pages/purchase/Suppliers.jsx` - Companies field
3. `src/pages/purchase/PurchaseEntry.jsx` - Company system
4. `src/pages/purchase/PurchaseOrders.jsx` - Stock + decimals
5. `package.json` - Version 1.3.6

---

## ⚠️ IMPORTANT NOTES

### 1. Company Name Exact Match Chahiye:
- Product ka `generic_name` = Company name
- Case sensitive: "SAMI" ≠ "Sami"
- Exact spelling: "SAMI" ≠ "SAMII"

### 2. Old Data:
- Agar products mein sahi company name hai
- To automatically kaam karega
- Koi naya data entry nahi karni

### 3. Stock Calculation:
- Real-time database se aati hai
- Formula: Total Purchased - Total Sold
- Har purchase/sale pe update hoti hai

---

## 🚀 KAISE CHALAYE?

### Development Mode:
```bash
npm run electron:dev
```

### Installer Banane Ke Liye:
```bash
npm run dist
```

### Update Publish Karne Ke Liye:
```bash
npm run publish-update
```

**Output File:**
- `release/MediSoft Pro Setup 1.3.6.exe`

---

## 📊 VERSION COMPARISON

| Feature | v1.3.5 | v1.3.6 |
|---------|--------|--------|
| Company Selection | ❌ | ✅ |
| Stock Display in PO | ❌ | ✅ |
| Decimal Qty/Price | ❌ | ✅ |
| Product Filtering | Basic | Company-wise |
| Product Column Width | 320px | 350px |
| Stock in Dropdown | ❌ | ✅ |

---

## 🎯 SUMMARY

**Version 1.3.6 Mein:**

1. ✅ **Supplier-Company System** - Medicines company ke hisab se organize
2. ✅ **Stock Dikhai Deta Hai** - Purchase Order mein current stock
3. ✅ **Decimal Values** - 0.5, 1.75 jaise quantities enter kar sakte hain
4. ✅ **Better Filtering** - Company select karo, sirf us ki products
5. ✅ **Bara Column** - Product name ke liye zyada space
6. ✅ **Bugs Fixed** - Stock 0 nahi dikhai dega, decimals kaam karenge

**Faida:**
- Purchase entry jaldi ho jayegi
- Products dhundna asaan
- Stock pata chal jayegi
- Flexible quantities
- Better organization

---

**VERSION 1.3.6 - READY TO USE! 🎉**
