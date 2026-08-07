# Task Switcher - Windows Alt+Tab Style ✅

## Feature Description
Windows jaisa task switcher ab software ke andar! Ctrl+Tab press karo aur visual popup mein sab open screens dikhengi.

## How It Works

### Opening Task Switcher:
**Ctrl+Tab** → Task switcher popup open hoga (Windows Alt+Tab ki tarah)

### Navigation:
1. **Tab key** → Next screen pe move karo (cycle through)
2. **Enter** → Selected screen pe jump karo
3. **Esc** → Cancel (current screen pe hi raho)
4. **Release Ctrl** → Auto-switch to selected screen

### Closing Pages:
- Har screen ke upper-right corner mein **Cross (X) button**
- Click karo to wo screen close ho jayegi
- ⚠️ **Data safe rahega** - Fast Billing aur Purchase Entry ka kaam save rehta hai background mein

## Features

### Visual Design:
✅ **Beautiful grid layout** - 3 columns mein screens show hoti hain
✅ **Color-coded icons** - Har module ka apna color:
   - 🔵 Sales - Green
   - 🟣 Purchase - Purple
   - 🟠 Inventory - Orange
   - 🔵 Accounts - Blue
   - 🟢 HRM - Green
   - 🔴 Reports - Red
   - ⚫ Settings - Gray

✅ **Current page badge** - "Current" label dikhta hai jis page pe ho
✅ **Selection indicator** - Blue border selected screen ke around
✅ **Hover effects** - Mouse hover pe highlight
✅ **Close buttons** - Har screen band kar sakte ho

### Keyboard Shortcuts:
| Shortcut | Action |
|----------|--------|
| **Ctrl+Tab** | Open task switcher |
| **Tab** | Navigate to next screen |
| **Enter** | Jump to selected screen |
| **Esc** | Cancel and stay on current screen |
| **Release Ctrl** | Auto-jump to selected screen |

### Smart Features:
✅ **History tracking** - Jitne pages visit karo, sab list mein aate hain
✅ **No duplicates** - Ek hi page ek baar show hota hai
✅ **Persist data** - Fast Billing ka cart aur Purchase Entry ka data save rehta hai
✅ **Auto-close on Ctrl release** - Windows ki tarah natural feel

## Use Cases

### Scenario 1: Fast Multitasking
```
1. Fast Billing page pe kaam kar rahe ho
2. Purchase Entry check karni hai
3. Ctrl+Tab press karo → Popup open
4. Tab Tab Tab → Purchase Entry select
5. Enter → Jump to Purchase Entry
6. Wapis Fast Billing: Ctrl+Tab → Tab → Enter
```

### Scenario 2: Multiple Tasks
```
1. Fast Billing mein customer ka bill bana rahe ho
2. Beech mein Product search karni hai
3. Ctrl+Tab → Products select → Enter
4. Product info check karo
5. Ctrl+Tab → Fast Billing wapis
6. Bill complete karo (data saved tha!)
```

### Scenario 3: Closing Unwanted Pages
```
1. Ctrl+Tab press karo
2. Jis screen ko band karna hai, uske X button pe click
3. Wo screen close, but data saved
4. Cleaner workspace!
```

## Technical Details

### Page Tracking:
- React Router's `useLocation` hook se current page track hota hai
- State mein visited pages ka array maintain hota hai
- Duplicates automatically filter hote hain

### Navigation:
- React Router's `useNavigate` hook se navigation
- Flag-based tracking to prevent duplicate history entries
- Smooth transitions

### Data Persistence:
- React component state automatically preserve hoti hai
- Fast Billing cart data lost nahi hota
- Purchase Entry items safe rehte hain

## Files Created/Modified

### New Files:
1. `src/components/TaskSwitcher.jsx` - Main task switcher component

### Modified Files:
1. `src/App.jsx` - Integrated TaskSwitcher component

## Page Icons & Colors

| Module | Icon | Color |
|--------|------|-------|
| Dashboard | dashboard | #003c90 |
| Fast Billing | point_of_sale | #00796b |
| Sales History | receipt_long | #00796b |
| Sales Return | keyboard_return | #c62828 |
| Purchase Entry | shopping_cart | #6a1b9a |
| Products | inventory_2 | #e65100 |
| Suppliers | store | #6a1b9a |
| Reports | bar_chart | #bf360c |

## Benefits

✅ **Faster workflow** - Quick navigation between pages
✅ **Visual feedback** - Dekh ke select kar sakte ho
✅ **Data safe** - Background tasks save rehte hain
✅ **Professional feel** - Windows-style modern UX
✅ **Easy to use** - Natural keyboard shortcuts
✅ **Clean workspace** - Unwanted pages close kar sakte ho

---
**Status**: ✅ **IMPLEMENTED & READY**
**Build**: Complete
**Electron**: Running with feature enabled

**Try it now:** Ctrl+Tab press karo! 🚀
