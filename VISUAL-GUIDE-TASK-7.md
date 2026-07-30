# Visual Guide: Task 7 Implementation

## 📦 What Changed in Purchase Entry

---

## Change 1: Net Amount Calculation ✅

### BEFORE (Wrong) ❌
```
Purchase Price/Box: 100 PKR
Boxes: 5
pcs/pack: 20
Total Pills: 100 (5 boxes × 20 pcs)

Net Amount = 100 × 100 = 10,000 PKR ❌ WRONG!
```

### AFTER (Correct) ✅
```
Purchase Price/Box: 100 PKR
Boxes: 5
pcs/pack: 20
Total Pills: 100 (5 boxes × 20 pcs)

Net Amount = 100 × 5 = 500 PKR ✅ CORRECT!
```

**Formula Changed:**
- ❌ Old: `purchase_price × total_qty` (pills)
- ✅ New: `purchase_price × qty_in_boxes` (boxes)

---

## Change 2: Manual Category Input ✅

### UI Layout - Category Column

#### BEFORE (Only Dropdown) ❌
```
┌─────────────────────────┐
│ Category                │
├─────────────────────────┤
│ [Dropdown ▼]            │
│   - Select -            │
│   - Tablets             │
│   - Capsules            │
│   - Syrups              │
└─────────────────────────┘
```
**Problem:** Can't enter custom categories!

---

#### AFTER (Dropdown + Text Input) ✅
```
┌─────────────────────────┐
│ Category                │
├─────────────────────────┤
│ [Dropdown ▼]            │ ← Select from existing
│   - Select -            │
│   - Tablets             │
│   - Capsules            │
│                         │
│ [or type...     ]       │ ← OR type custom name
└─────────────────────────┘
```
**Solution:** Can select OR type custom category!

---

### User Flow Examples

#### Example 1: Using Dropdown (Normal Flow)
```
Step 1: User selects "Tablets" from dropdown
        ↓
Step 2: Manual input automatically clears
        ↓
Step 3: Product saved with category_id = 3 (Tablets)
```

#### Example 2: Using Manual Input (New Category)
```
Step 1: User types "IV Fluids" in text input
        ↓
Step 2: Dropdown automatically clears
        ↓
Step 3: Backend searches database for "IV Fluids"
        ↓
Step 4: Not found → Create new category
        ↓
Step 5: Product saved with new category_id = 15
        ↓
Step 6: Next time page loads, "IV Fluids" in dropdown!
```

#### Example 3: Duplicate Prevention (Case-Insensitive)
```
Purchase 1:
  User types: "antibiotics"
  → Backend creates category_id = 20

Purchase 2:
  User types: "Antibiotics" (capital A)
  → Backend finds existing: LOWER("Antibiotics") = LOWER("antibiotics")
  → Uses existing category_id = 20
  → No duplicate created! ✅
```

---

## Visual: Purchase Entry Table

### Category Column Layout
```
┌──────────┬──────────────┬──────────┬────────┐
│ Product  │  Category    │  Rack    │  ...   │
├──────────┼──────────────┼──────────┼────────┤
│ Panadol  │ [Tablets ▼]  │  A-12    │        │
│          │ [or type...] │          │        │
├──────────┼──────────────┼──────────┼────────┤
│ New Med  │ [-        ▼] │  B-05    │        │
│          │ [Surgical  ] │← User typing here │
└──────────┴──────────────┴──────────┴────────┘
```

---

## Backend Logic Flow

### When Save Button Clicked

```
┌─────────────────────────────────────┐
│  Frontend sends purchase data       │
│  item.category_id = null            │
│  item.category_name = "IV Fluids"   │
└────────────┬────────────────────────┘
             ↓
┌─────────────────────────────────────┐
│  Backend receives data              │
└────────────┬────────────────────────┘
             ↓
┌─────────────────────────────────────┐
│  Check: category_name provided?     │
└────────────┬────────────────────────┘
             ↓ YES
┌─────────────────────────────────────┐
│  Search database:                   │
│  SELECT id FROM categories          │
│  WHERE LOWER(name) = 'iv fluids'    │
└────────────┬────────────────────────┘
             ↓
        ┌────┴────┐
        │  Found? │
        └────┬────┘
     ┌───────┴────────┐
    YES              NO
     │                │
     ↓                ↓
  Use existing    Create new:
  category_id     INSERT INTO categories
                  (name) VALUES ('IV Fluids')
     │                │
     └───────┬────────┘
             ↓
┌─────────────────────────────────────┐
│  Create product with category_id    │
└─────────────────────────────────────┘
```

---

## Toggle Behavior

### Scenario A: User Selects Dropdown
```
BEFORE:
  Dropdown: [Tablets ▼]
  Manual:   [IV Fluids]  ← Has text
           
           ↓ User selects "Capsules"
           
AFTER:
  Dropdown: [Capsules ▼]
  Manual:   [         ]  ← Automatically cleared! ✅
```

### Scenario B: User Types Manual
```
BEFORE:
  Dropdown: [Tablets ▼]  ← Has selection
  Manual:   [        ]
           
           ↓ User types "Surgical"
           
AFTER:
  Dropdown: [-       ▼]  ← Automatically cleared! ✅
  Manual:   [Surgical ]
```

---

## Code Changes Summary

### Frontend (`PurchaseEntry.jsx`)

#### 1. Item State - Added field
```javascript
const emptyItem = () => ({
  // ... existing fields ...
  category_id: null,
  category_name: '',  // ← NEW FIELD
  // ... existing fields ...
})
```

#### 2. UI - Category Column
```javascript
{/* Category */}
<td className="px-3 py-2">
  <div className="flex flex-col gap-1">
    
    {/* Dropdown */}
    <select 
      value={item.category_id||''} 
      onChange={e => {
        updateItem(idx,'category_id',e.target.value)
        if (e.target.value) {
          updateItem(idx,'category_name','')  // Clear manual
        }
      }}
    >
      <option value="">-</option>
      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
    
    {/* Manual Input */}
    <input 
      type="text" 
      value={item.category_name||''} 
      onChange={e => {
        updateItem(idx,'category_name',e.target.value)
        if (e.target.value) {
          updateItem(idx,'category_id','')  // Clear dropdown
        }
      }}
      placeholder="or type..." 
    />
    
  </div>
</td>
```

#### 3. Save Function - Send to backend
```javascript
items: validItems.map(i => ({ 
  // ... existing fields ...
  category_id: i.category_id,
  category_name: i.category_name,  // ← NEW FIELD
  // ... existing fields ...
}))
```

---

### Backend (`purchase.js`)

#### Handle Manual Category
```javascript
for (const item of data.items) {
  let categoryId = item.category_id
  
  // Handle manual category name
  if (!categoryId && item.category_name && item.category_name.trim()) {
    
    // Check if exists (case-insensitive)
    const existing = db.prepare(
      'SELECT id FROM categories WHERE LOWER(name) = LOWER(?)'
    ).get(item.category_name.trim())
    
    if (existing) {
      categoryId = existing.id  // Use existing
    } else {
      // Create new
      const result = db.prepare(
        'INSERT INTO categories (name) VALUES (?)'
      ).run(item.category_name.trim())
      categoryId = result.lastInsertRowid
    }
  }
  
  // Use categoryId for product...
}
```

---

## Database Impact

### Categories Table
```sql
-- BEFORE manual entry:
id | name
---|----------
1  | Tablets
2  | Capsules
3  | Syrups

-- User manually enters "IV Fluids", "Surgical Supplies"

-- AFTER manual entry:
id | name
---|-------------------
1  | Tablets
2  | Capsules
3  | Syrups
4  | IV Fluids         ← NEW (auto-created)
5  | Surgical Supplies ← NEW (auto-created)

-- Next page load: Both appear in dropdown! ✅
```

---

## Real-World Example

### Use Case: Pharmacy receiving mixed items

```
Invoice from Supplier:
  1. Panadol 500mg (Category: Tablets) ← Use dropdown
  2. Cough Syrup (Category: Syrups) ← Use dropdown
  3. IV Drip Set (Category: ???) ← Not in dropdown! Use manual: "IV Equipment"
  4. Surgical Gloves (Category: ???) ← Not in dropdown! Use manual: "Surgical Supplies"
  5. Face Masks (Category: ???) ← Could also use "Surgical Supplies"

Result:
  - Items 1-2: Use existing categories from dropdown
  - Item 3: New category "IV Equipment" created
  - Item 4: New category "Surgical Supplies" created
  - Item 5: Uses same "Surgical Supplies" (no duplicate)
  
Next purchase:
  - "IV Equipment" now appears in dropdown! ✅
  - "Surgical Supplies" now appears in dropdown! ✅
```

---

## Testing Quick Reference

### ✅ Test Net Amount
1. Purchase Price/Box = 50
2. Boxes = 10
3. pcs/pack = 100 (1000 pills total)
4. **Expected Net Amount:** 500 PKR (not 50,000)

### ✅ Test Manual Category
1. Type "Test Cat 123" in manual input
2. Dropdown should clear automatically
3. Save purchase
4. Reload page
5. "Test Cat 123" should be in dropdown

### ✅ Test Case-Insensitive
1. Create with "antibiotics"
2. Create with "Antibiotics"
3. Both should have same category ID

### ✅ Test Toggle
1. Select dropdown → Manual clears
2. Type manual → Dropdown clears

---

## Summary

✅ **Net Amount:** Fixed calculation (boxes not pills)  
✅ **Manual Category:** Two fields (dropdown + text input)  
✅ **Smart Toggle:** Clear opposite field automatically  
✅ **Auto-Create:** New categories created on-the-fly  
✅ **No Duplicates:** Case-insensitive matching  
✅ **User-Friendly:** Intuitive "or type..." placeholder  
✅ **Backward Compatible:** Existing dropdown still works  

**Ready for testing!** 🚀
