# MediSoft Pro - Auto Update System Guide
### Dosre PCs Pe Install Karne Aur Update Karne Ka Complete Tareeqa

---

## 📦 STEP 1: Initial Installation (Pehli Dafa)

### PC #1 (Main Server PC) Pe:
1. **Setup File Ready Karo:**
   - Location: `d:\stitch_pharmacy_management_system\medisoft-pro\release\`
   - File: `MediSoft Pro Setup 1.0.0.exe` (108 MB)

2. **Is File Ko Copy Karo:**
   - USB drive mein copy karo
   - Ya Network/Email se share karo

### PC #2, #3, #4... (Doosre PCs) Pe:
1. Setup file ko run karo: `MediSoft Pro Setup 1.0.0.exe`
2. Installation location choose karo (default: `C:\Program Files\MediSoft Pro\`)
3. "Create Desktop Shortcut" check karo
4. Install complete hone do
5. Desktop pe shortcut se MediSoft Pro open karo

✅ **Installation Complete!** Ab software use kar sakte ho.

---

## 🔄 STEP 2: Auto-Update System Setup (Ek Baar)

### Server PC (192.168.0.110) Pe:

#### A. Update Server Folder Already Ready Hai:
```
C:\MediSoftUpdates\
├── latest.yml
├── MediSoft Pro Setup 1.0.0.exe
└── MediSoft Pro Setup 1.0.0.exe.blockmap
```

#### B. HTTP Server Chalao (Hamesha Running Rehna Chahiye):

**Option 1: Python HTTP Server (Recommended)**
```cmd
cd C:\MediSoftUpdates
python -m http.server 8080
```

**Option 2: Node.js HTTP Server**
```cmd
cd C:\MediSoftUpdates
npx http-server -p 8080
```

**Option 3: Windows IIS (Production Ke Liye Best)**
- IIS install karo
- `C:\MediSoftUpdates\` ko web directory bana do
- Port 8080 pe configure karo

**✅ CHECK:** Browser mein open karo: `http://192.168.0.110:8080/latest.yml`
- Agar file dikhe to server sahi chal raha hai ✓

---

## 🚀 STEP 3: Naya Update Publish Karna

Jab bhi aap software mein changes karo aur doosre PCs pe update bhejna ho:

### Main Development PC Pe:

#### Step 3.1: Version Number Badhao
```bash
# Open package.json
# Current: "version": "1.0.0"
# Change to: "version": "1.0.1"  (ya 1.1.0, 2.0.0, etc.)
```

#### Step 3.2: Software Build Karo
```bash
cd d:\stitch_pharmacy_management_system\medisoft-pro
npm run dist
```

Wait karo... Build complete hone mein 2-3 minutes lagenge.

#### Step 3.3: New Files Copy Karo Update Server Pe

**Manually:**
```powershell
# 1. latest.yml
Copy-Item "release\latest.yml" -Destination "C:\MediSoftUpdates\" -Force

# 2. Setup EXE file
Copy-Item "release\MediSoft Pro Setup 1.0.1.exe" -Destination "C:\MediSoftUpdates\" -Force

# 3. Blockmap file
Copy-Item "release\MediSoft Pro Setup 1.0.1.exe.blockmap" -Destination "C:\MediSoftUpdates\" -Force
```

**Automatically (Recommended):**
```bash
npm run publish-update
```
(Ye command automatically build + copy dono karta hai)

#### Step 3.4: Purane Files Delete Karo (Optional)
```powershell
# Purane version ki files delete karo space bachane ke liye
Remove-Item "C:\MediSoftUpdates\MediSoft Pro Setup 1.0.0.exe"
Remove-Item "C:\MediSoftUpdates\MediSoft Pro Setup 1.0.0.exe.blockmap"
```

---

## 📱 STEP 4: Client PCs Pe Update Kaise Milega

### Automatic (Default):
1. Software kholo
2. 5 seconds ke andar notification aayega: **"Update Available!"**
3. "Download Update" button pe click karo
4. Download complete hone do (background mein hoga)
5. "Restart & Install" button pe click karo
6. Software restart hoga aur automatically update install ho jayega

### Manual Check:
1. Settings > Company Info pe jao
2. Neeche "Check for Updates" button hai
3. Click karo
4. Agar update hai to notification milega

---

## 🔧 Troubleshooting

### Problem 1: "No Updates Available" dikha raha hai
**Solution:**
- Check karo HTTP server chal raha hai ya nahi
- Browser mein check karo: `http://192.168.0.110:8080/latest.yml`
- Network connectivity check karo
- Firewall settings check karo (Port 8080 open hona chahiye)

### Problem 2: Download fail ho raha hai
**Solution:**
- Internet/Network connection check karo
- Server PC on hai aur HTTP server running hai check karo
- Antivirus temporarily disable kar ke try karo

### Problem 3: Update install nahi ho raha
**Solution:**
- Admin rights se software run karo
- Antivirus temporarily disable karo
- Manually installer download kar ke install karo

### Problem 4: Version number update nahi dikha raha
**Solution:**
- About section mein current version check karo
- Clear karo aur restart karo software

---

## 📋 Quick Reference Commands

### Development PC:
```bash
# Build software
npm run dist

# Build + Publish to update server
npm run publish-update
```

### Server PC:
```cmd
# Start HTTP server
cd C:\MediSoftUpdates
python -m http.server 8080

# Check server status
netstat -ano | findstr "8080"
```

### Check Files:
```powershell
# List files in update server
Get-ChildItem C:\MediSoftUpdates
```

---

## 📖 Important Notes

1. **Version Numbering:**
   - Bug fixes: `1.0.0` → `1.0.1`
   - New features: `1.0.0` → `1.1.0`
   - Major changes: `1.0.0` → `2.0.0`

2. **Server Requirements:**
   - HTTP server hamesha running rehna chahiye
   - Server PC hamesha on rehna chahiye (update check karne ke liye)
   - Port 8080 firewall mein open hona chahiye

3. **Network Requirements:**
   - Saare PCs same network (LAN) pe hone chahiye
   - Server IP: `192.168.0.110` (change kar sakte ho `package.json` mein)

4. **File Size:**
   - Har update ki size ~100-120 MB hai
   - Fast internet/LAN recommended

5. **Backup:**
   - Database automatically backup hota hai (`data/medisoft.db`)
   - Purane versions ki backup maintain karo

---

## 🎯 Summary: Daily Workflow

### Ek Baar Setup (One-time):
1. ✅ Update server folder banao
2. ✅ HTTP server start karo
3. ✅ Software install karo client PCs pe

### Har Update Ke Liye (Regular):
1. Code mein changes karo
2. Version number badhao
3. `npm run publish-update` chalao
4. Client PCs automatically notification paayenge

### Client PCs (Automatic):
- Kuch nahi karna! 
- Software automatic check karega
- Notification aayega
- "Download & Install" pe click karo
- Done! ✅

---

## 💡 Pro Tips

1. **Test Updates:**
   - Pehle ek test PC pe update test karo
   - Sab kuch sahi ho tab production PCs pe push karo

2. **Schedule Updates:**
   - Raat ko ya off-hours mein updates push karo
   - Users ko pehle inform kar do

3. **Backup Strategy:**
   - Har update se pehle database backup lo
   - Purane version ka installer backup rakho

4. **Documentation:**
   - Release notes maintain karo
   - Changelog maintain karo (`CHANGELOG.md`)

---

## 📞 Support

Koi problem ho to:
1. `README-UPDATES.md` check karo
2. Logs check karo: `AppData\Roaming\MediSoft Pro\logs\`
3. GitHub issues create karo

---

**Last Updated:** June 25, 2025  
**Version:** 1.0.0  
**Author:** Stitch Pharmacy Management System Team
