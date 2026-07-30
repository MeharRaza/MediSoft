# Manual Category Input Feature

## Overview
Added the ability to manually enter category names in Purchase Entry, allowing users to handle items with multiple or custom categories that are not in the predefined dropdown list.

## Implementation Date
July 12, 2026

---

## What Was Added

### 1. Frontend (Purchase Entry UI)
**File:** `src/pages/purchase/PurchaseEntry.jsx`

**Changes:**
- Added `category_name` field to item state (for manual text input)
- Category column now shows **TWO fields**:
  - **Dropdown (top)**: Select from existing categories
  - **Text input (bottom)**: Type custom category name
  
**Behavior:**
- When dropdown is selected → Manual text input is cleared
- When manual text is entered → Dropdown selection is cleared
- Both fields cannot be active at the same time
- Manual text input shows placeholder "or type..."

**Code Location:**
```jsx
{/* Category */}
<td className="px-3 py-2">
  <div className="flex flex-col gap-1">
    <select value={item.category_id||''} onChange={...}>
      <option value="">-</option>
      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
    <input 
      type="text" 
      value={item.category_name||''} 
      onChange={...}
      placeholder="or type..." 
    />
  </div>
</td>
```

---

### 2. Backend (Purchase Entry Processing)
**File:** `electron/ipc/purchase.js`

**Changes:**
When processing purchase items:

1. **Check if manual category name provided** (`item.category_name`)
2. **Search for existing category** (case-insensitive):
   ```sql
   SELECT id FROM categories WHERE LOWER(name) = LOWER(?)
   ```
3. **If category exists** → Use existing category ID
4. **If category doesn't exist** → Create new category:
   ```sql
   INSERT INTO categories (name) VALUES (?)
   ```
5. **Use the category ID** when creating/updating product

**Code Location:**
```javascript
// Handle manual category name - create category if needed
if (!categoryId && item.category_name && item.category_name.trim()) {
  const existingCategory = db.prepare('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)').get(item.category_name.trim())
  if (existingCategory) {
    categoryId = existingCategory.id
  } else {
    const categoryResult = db.prepare('INSERT INTO categories (name) VALUES (?)').run(item.category_name.trim())
    categoryId = categoryResult.lastInsertRowid
  }
}
```

---

## How It Works

### Scenario 1: Using Dropdown
1. User selects category from dropdown (e.g., "Tablets")
2. Manual text input is automatically cleared
3. Product saved with `category_id` from dropdown

### Scenario 2: Using Manual Input
1. User types custom category name (e.g., "IV Fluids")
2. Dropdown selection is automatically cleared
3. Backend checks if "IV Fluids" category exists:
   - **Exists** → Uses existing category ID
   - **Doesn't exist** → Creates new category, uses new ID
4. Product saved with the category ID

### Scenario 3: Multiple Items with Same Custom Category
1. First item: User types "Surgical Supplies"
   - Backend creates new category "Surgical Supplies"
2. Second item: User types "Surgical Supplies" again
   - Backend finds existing category (case-insensitive match)
   - Uses existing category ID (no duplicate created)

---

## Benefits

1. **Flexibility**: Users can handle items with unique categories
2. **No duplicates**: Case-insensitive matching prevents duplicate categories
3. **Backward compatible**: Existing dropdown still works normally
4. **Auto-cleanup**: Clearing one field when the other is used prevents confusion
5. **Database growth**: New categories automatically added to database and appear in dropdown on next load

---

## Testing Guide

### Test 1: Manual Category Creation
1. Open Purchase Entry
2. Add a product with manual category "Test Category 123"
3. Save purchase
4. Verify category was created in database
5. Reload page - "Test Category 123" should appear in dropdown

### Test 2: Case-Insensitive Matching
1. Create item with manual category "antibiotics"
2. Create another item with "Antibiotics" (capital A)
3. Both should use the same category ID (no duplicate)

### Test 3: Toggle Behavior
1. Select category from dropdown
2. Start typing in manual input
3. Dropdown should clear automatically
4. Select dropdown again
5. Manual input should clear automatically

---

## Database Impact

**Table:** `categories`
- New categories are added automatically via `INSERT INTO categories (name) VALUES (?)`
- Case-insensitive check prevents duplicates: `LOWER(name) = LOWER(?)`
- New categories have auto-incremented IDs
- New categories appear in dropdown after page reload

**Table:** `products`
- Products created with manual categories get valid `category_id`
- No schema changes required

---

## Files Modified

1. **Frontend:**
   - `src/pages/purchase/PurchaseEntry.jsx` (UI changes + state handling)

2. **Backend:**
   - `electron/ipc/purchase.js` (category creation logic)

3. **Documentation:**
   - This file: `MANUAL-CATEGORY-FEATURE.md`

---

## Notes

- Manual category names are **trimmed** (leading/trailing spaces removed)
- Empty category name is treated as no category (skipped)
- Manual input styled with italic gray text and "or type..." placeholder
- Both fields are small to fit in table column (w-24 = 6rem = 96px width)
