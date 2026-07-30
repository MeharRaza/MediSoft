# Database Transfer Guide - MediSoft Pro

## Problem: Data Not Showing After Database Transfer

**Issue:** When you replace the database file in production app, data doesn't show because SQLite WAL mode keeps data cached in memory.

**Root Cause:** SQLite creates 3 files:
- `medisoft.db` (main file)
- `medisoft.db-shm` (shared memory)
- `medisoft.db-wal` (write-ahead log)

If you only replace `medisoft.db` while app is running, cached data in `.wal` file is still used!

---

## Solution 1: Manual Method (Step-by-Step)

### On PC B (where you want to copy database):

**Step 1: Close App Completely**
- Close MediSoft Pro
- Open Task Manager (Ctrl+Shift+Esc)
- Check "MediSoft Pro.exe" is NOT running
- If running, right-click → End Task

**Step 2: Open Database Folder**
- Press `Win+R`
- Type: `%appdata%\medisoft-pro\data`
- Press Enter

**Step 3: Delete ALL Database Files**
- Delete: `medisoft.db`
- Delete: `medisoft.db-shm` (if exists)
- Delete: `medisoft.db-wal` (if exists)

**Step 4: Copy New Database**
- Copy `medisoft.db` from PC A (or USB/WhatsApp)
- Paste into the opened folder

**Step 5: Launch App**
- Open MediSoft Pro
- Login
- ✅ All data should appear now!

---

## Solution 2: Automated Script

We've created scripts to do this automatically!

### Option A: Batch File (Easiest)

1. Close MediSoft Pro
2. Run: `replace-database.bat`
3. Follow on-screen instructions
4. Script will:
   - Close app if running
   - Backup current database
   - Delete old files
   - Open folder for you to paste new file
   - Launch app

### Option B: PowerShell Script

1. Right-click `replace-database.ps1`
2. Select "Run with PowerShell"
3. Follow on-screen instructions

---

## Database Locations

### Development Mode:
```
d:\stitch_pharmacy_management_system\medisoft-pro\data\medisoft.db
```

### Production (Installed App):
```
C:\Users\[Username]\AppData\Roaming\medisoft-pro\data\medisoft.db
```

Quick access: Press `Win+R` → Type `%appdata%\medisoft-pro\data`

### Backups:
```
C:\Users\[Username]\AppData\Roaming\medisoft-pro\data\backups\
```

---

## Transfer Scenarios

### Scenario 1: Fresh Install on New PC

**PC A (has data):**
1. Go to: `%appdata%\medisoft-pro\data`
2. Copy: `medisoft.db`
3. Transfer via USB/WhatsApp to PC B

**PC B (new installation):**
1. Install `MediSoft Pro Setup 1.1.0.exe`
2. Launch once (creates folders + empty database)
3. Close app completely
4. Go to: `%appdata%\medisoft-pro\data`
5. Delete all 3 files (`.db`, `.db-shm`, `.db-wal`)
6. Paste PC A's `medisoft.db` file
7. Launch app → ✅ All data available!

---

### Scenario 2: Update Existing Installation

**PC B already has v1.0.7 with data:**

1. Close MediSoft Pro (if open)
2. Run: `MediSoft Pro Setup 1.1.0.exe`
3. Install (upgrades v1.0.7 → v1.1.0)
4. Launch app
5. ✅ Database auto-preserved!
6. ✅ All data safe!

**Why safe?**
- Setup only updates CODE files
- Database file NOT touched
- Same location, same data

---

### Scenario 3: Two PCs, Same Data (Daily Sync)

**Not recommended!** SQLite is single-user database. Don't use same database on 2 PCs simultaneously.

**Alternative:** 
- Use 1 PC as main
- Other PC: Fresh install with separate data
- Or: Use network database (MySQL/PostgreSQL) - requires code changes

---

## Troubleshooting

### Problem: "Data still not showing after transfer"

**Check:**
1. Did you close app BEFORE replacing file? → Task Manager check
2. Did you delete ALL 3 files (`.db`, `.db-shm`, `.db-wal`)? → Check folder
3. Did you paste correct file? → Check file size (should be > 100KB if has data)
4. Did you restart app? → Close + reopen

### Problem: "Login not working after transfer"

**Solution:**
- Default credentials: username `admin`, password `admin123`
- If PC A had different password, use that password

### Problem: "Cannot delete medisoft.db - File in use"

**Solution:**
1. Open Task Manager
2. End all "MediSoft Pro.exe" processes
3. Try deleting again
4. If still locked: Restart PC, then delete

---

## Important Notes

⚠️ **Always backup before transferring!**
- Script automatically creates backup
- Manual backup: Copy entire `data` folder to safe location

⚠️ **WAL files are temporary**
- `.db-shm` and `.db-wal` are created when app runs
- They're deleted when app closes properly
- If app crashes, these files may remain

⚠️ **Database file size**
- Empty database: ~150 KB
- With 100 products: ~200-300 KB
- With 1000+ products + sales: ~1-5 MB

✅ **Setup does NOT include database**
- Setup file only has CODE
- Database created on first launch
- This keeps your data SAFE during updates

---

## Quick Reference Commands

### Open database folder:
```
Win+R → %appdata%\medisoft-pro\data
```

### Open backups folder:
```
Win+R → %appdata%\medisoft-pro\data\backups
```

### Kill app (PowerShell):
```powershell
Get-Process "MediSoft Pro" | Stop-Process -Force
```

### Check if app is running (CMD):
```cmd
tasklist | findstr "MediSoft"
```

---

## Backup Strategy

**Automatic Backups:**
- Created on every app startup
- Last 5 backups kept
- Location: `data\backups\`

**Manual Backups:**
1. Close MediSoft Pro
2. Go to: `%appdata%\medisoft-pro\data`
3. Copy `medisoft.db` to safe location (USB/Cloud)
4. Name it with date: `medisoft_backup_2026-07-05.db`

**Recommended:**
- Daily: Automatic (already done)
- Weekly: Copy to USB
- Monthly: Copy to cloud (Google Drive/OneDrive)

---

Need help? Contact support or check app version in top-right corner.
