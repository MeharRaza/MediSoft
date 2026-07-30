# MediSoft Pro v1.3.7 - Release Notes

**Release Date:** July 21, 2026  
**Build Status:** ✅ Production Ready

---

## 🎉 MAJOR FEATURES

### 1. ✨ **Alt-Based Navigation System** (F-Keys Completely Removed)
**User Request:** Remove all F-key shortcuts and implement ergonomic Alt-based navigation

**Changes:**
- ❌ **Removed ALL F-key shortcuts** (F1, F2, F3, F4, F8, F10, F12)
- ✅ **Alt key activates sidebar** with yellow visual highlight
- ✅ **Letter-based navigation** for menus and pages
- ✅ **Hierarchical system:** Alt → Menu Letter → Page Letter

**Navigation Flow:**
```
Alt → Sidebar Active (Yellow)
  ↓
Main Menu Letters:
  D = Dashboard
  S = Sales menu
  P = Purchase menu
  I = Inventory menu
  A = Accounts menu
  H = HRM menu
  R = Reports menu
  T = Settings menu
  
  ↓
Sub-Menu Letters (examples):
  Sales (S):     F=Fast Billing, H=History, R=Return, Q=Quotations, C=Customers
  Purchase (P):  E=Entry, H=History, R=Return, S=Suppliers, O=Orders
  Inventory (I): P=Products, A=Adjustment, T=Transfer, B=Batches
```

**Priority System:**
- Sub-menu shortcuts take priority over main menu shortcuts
- Prevents conflicts (e.g., Alt → P → H opens Purchase History, NOT HRM menu)

**UI Updates:**
- Removed "(F1)" from Fast Billing search placeholder
- Removed "(F8)" from Hold buttons in Fast Billing and Purchase Entry
- Updated Quick Billing button: "Alt+S→F" instead of old F-key reference

**Files Modified:**
- `src/components/Layout.jsx` - Alt-based navigation implementation
- `src/pages/sales/FastBilling.jsx` - Removed F8, F10 shortcuts
- `src/pages/purchase/PurchaseEntry.jsx` - Removed F8 shortcut
- `src/components/KeyboardShortcutsHelp.jsx` - Complete rewrite of help documentation
- `src/App.jsx` - Removed old F-key handlers

---

### 2. 🔄 **Ctrl+Tab Cycle Navigation**
**User Request:** Browser-style tab cycling through visited pages

**Features:**
- **Ctrl+Tab** cycles backward through navigation history
- **Unlimited history** - no 20 page limit
- **Wrap-around** - cycles from first to last page
- **Smart tracking** - no duplicate consecutive pages
- **Ctrl+Tab navigation excluded** from history to prevent loops

**Example:**
```
Visit: A → B → C → D
Ctrl+Tab → C
Ctrl+Tab → B  
Ctrl+Tab → A
Ctrl+Tab → D (wrap around)
Ctrl+Tab → C (continues cycling)
```

**Files Modified:**
- `src/App.jsx` - Added NavigationHistory component with cycle logic

---

### 3. 💰 **Purchase Entry Simplified** (Payment Method Removed)
**User Request:** Remove payment method selection - all purchases are cash

**Changes:**
- ❌ **Removed Payment Method buttons** (Credit/Cash) from UI
- ✅ **Default payment_method = "cash"** set automatically
- ✅ **Cleaner interface** - one less field to manage

**Files Modified:**
- `src/pages/purchase/PurchaseEntry.jsx` - Removed Payment Method UI and set default to "cash"

---

## 🎨 USER EXPERIENCE IMPROVEMENTS

### Keyboard Shortcuts Help (Ctrl+K)
**Complete Rewrite:**
- ✅ All F-key references removed
- ✅ Alt-based navigation clearly documented
- ✅ Visual flow diagrams and examples
- ✅ "Hand-friendly navigation" tips
- ✅ Fast Billing shortcuts section (Ctrl+S, Ctrl+P, Ctrl+F, Ctrl+T)

**Sections:**
1. General (Ctrl+K, ESC)
2. Alt-Based Navigation (PRIMARY) - with "How It Works" guide
3. Sub-Menu Letters - organized by module
4. Arrow Keys (when sidebar active)
5. Fast Billing Shortcuts
6. Pro Tips

---

## 🐛 BUG FIXES

### Navigation System Fixes:
1. **Fixed:** Sub-menu letter conflicts with main menu letters
   - Example: Alt → P → H now opens Purchase History (not HRM menu)
   - Priority: Sub-menu shortcuts > Main menu shortcuts

2. **Fixed:** openMenu state not resetting after navigation
   - Navigation now properly cleans up state
   - ESC key also resets openMenu state

3. **Fixed:** Ctrl+Tab only working once
   - Added flag to exclude Ctrl+Tab navigation from history
   - Now cycles infinitely through all visited pages

---

## 📦 TECHNICAL DETAILS

### Version Updates:
- `package.json` → v1.3.7
- `Layout.jsx` → Display shows "v1.3.7"

### Build Information:
- **Vite Build:** 1.81s
- **Bundle Size:** 543.86 kB (gzipped: 128.69 kB)
- **Electron Builder:** 26.15.3
- **Electron Version:** 42.5.0
- **Platform:** Windows x64
- **Installer:** `MediSoft Pro Setup 1.3.7.exe`

### Development Mode:
- ✅ Hot Module Replacement (HMR) working
- ✅ Vite dev server on port 5173
- ✅ Console logging for debugging navigation

---

## 🎯 TESTING GUIDE

### Alt-Based Navigation:
```
✓ Alt press → Yellow sidebar highlight
✓ Alt → S → F → Fast Billing opens
✓ Alt → P → H → Purchase History opens (not HRM!)
✓ Alt → I → P → Products opens
✓ ESC → Navigation exits, menu closes
```

### Ctrl+Tab Navigation:
```
✓ Visit A → B → C → D
✓ Ctrl+Tab → Goes to C
✓ Ctrl+Tab → Goes to B
✓ Ctrl+Tab → Goes to A
✓ Ctrl+Tab → Goes to D (wraps around)
✓ Continue cycling infinitely
```

### Purchase Entry:
```
✓ Payment Method section not visible
✓ Purchase saves with payment_method = "cash" automatically
```

### F-Keys Removed:
```
✓ F1, F2, F3, F4 → No action
✓ F8 → No action (Hold buttons work via click only)
✓ F10 → No action (Use Ctrl+S to save)
✓ F12 → No action
```

---

## 📊 STATISTICS

**Lines Changed:** ~400 lines
**Files Modified:** 6 files
**Features Added:** 3 major features
**Bugs Fixed:** 3 navigation bugs
**Documentation:** Complete keyboard shortcuts rewrite

---

## 🚀 UPGRADE INSTRUCTIONS

### For Users:
1. Close MediSoft Pro if running
2. Run installer: `MediSoft Pro Setup 1.3.7.exe`
3. Follow installation wizard
4. Launch MediSoft Pro
5. Press **Ctrl+K** to see new keyboard shortcuts

### What's Different:
- **F-keys don't work anymore** - use Alt-based navigation
- **Ctrl+Tab** cycles through pages like a browser
- **Purchase Entry** has no payment method buttons (always cash)

---

## 🎓 USER TRAINING NOTES

### Quick Start:
1. **Alt** = Activate navigation
2. **Letter** = Open menu (S/P/I/A/H/R/T/D)
3. **Letter** = Open page within menu
4. **ESC** = Exit navigation
5. **Ctrl+Tab** = Go to previous page

### Example Workflows:
- **Fast Billing:** Alt → S → F
- **Purchase Entry:** Alt → P → E
- **Products:** Alt → I → P
- **Go Back:** Ctrl+Tab

---

## 💡 BENEFITS

1. **Ergonomic** - Alt key near home row, no stretching
2. **Memorable** - Letter-based (F for Fast, E for Entry)
3. **Visual** - Yellow highlight shows active state
4. **Discoverable** - Ctrl+K shows all shortcuts
5. **Consistent** - Same pattern everywhere
6. **Faster** - Cycle through pages with Ctrl+Tab

---

## 🔧 DEVELOPER NOTES

### Key Files:
- `src/components/Layout.jsx` - Navigation logic (250 lines)
- `src/App.jsx` - Ctrl+Tab history tracking (70 lines)
- `src/components/KeyboardShortcutsHelp.jsx` - Help documentation (200 lines)

### State Management:
- `sidebarFocused` - Alt key activation state
- `openMenu` - Currently open menu name
- `historyRef` - Navigation history array
- `currentIndexRef` - Current position in history
- `isNavigatingWithCtrlTabRef` - Flag to prevent history pollution

### Console Logs (Development):
- 📚 History: [...] - Shows navigation history
- 🔄 Ctrl+Tab: Cycling to... - Shows Ctrl+Tab navigation
- 📍 Index: X of Y - Shows current position

---

## 📝 KNOWN ISSUES

**None reported in testing.**

---

## 🎉 SUMMARY

Version 1.3.7 is a **major UX upgrade** focused on keyboard navigation ergonomics:

✅ **F-keys completely removed** - replaced with Alt-based system  
✅ **Ctrl+Tab cycling** - browser-style page navigation  
✅ **Purchase Entry simplified** - payment method auto-set to cash  
✅ **Comprehensive help documentation** - Ctrl+K for shortcuts  
✅ **Visual feedback** - yellow highlight for active navigation  

**Production Ready** ✅ | **Build Tested** ✅ | **User Approved** ✅

---

**Built with ❤️ for Harmain Medical Store**
