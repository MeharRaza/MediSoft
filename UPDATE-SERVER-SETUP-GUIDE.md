# Update Server Setup Guide - MediSoft Pro

## 🎯 Teen Tareeqe Update Server Setup Karne Ke

Jab bhi aap apne software ko update karenge, aapko **3 files** upload karni hongi:
1. `latest.yml`
2. `MediSoft Pro Setup 1.0.0.exe`
3. `MediSoft Pro Setup 1.0.0.exe.blockmap`

Ye files `release/` folder mein milti hain jab aap `npm run dist` chalate hain.

---

## ✅ **Option 1: GitHub Releases (RECOMMENDED - FREE)**

### **Fayde:**
- ✅ Bilkul FREE
- ✅ Fast aur reliable
- ✅ Automatic download handling
- ✅ Bandwidth limit nahi
- ✅ Setup aasan hai

### **Setup Steps:**

#### 1. GitHub Account Banao
- https://github.com pe jao aur signup karo (agar account nahi hai)

#### 2. New Repository Banao
```
Repository Name: medisoft-pro-updates
Description: Update server for MediSoft Pro
Visibility: Public (zaroori hai automatic updates ke liye)
```

#### 3. Release Banao
1. GitHub repository mein jao
2. **"Releases"** tab pe click karo
3. **"Create a new release"** button dabao
4. Ye information bharo:
   ```
   Tag version: v1.0.0
   Release title: MediSoft Pro v1.0.0
   Description: First stable release
   ```
5. **3 files drag & drop** karo:
   - `latest.yml`
   - `MediSoft Pro Setup 1.0.0.exe`
   - `MediSoft Pro Setup 1.0.0.exe.blockmap`
6. **"Publish release"** pe click karo

#### 4. Package.json Update Karo

**Apna GitHub username** aur **repository name** se replace karo:

```json
"publish": [
  {
    "provider": "github",
    "owner": "YOUR_GITHUB_USERNAME",
    "repo": "medisoft-pro-updates"
  }
],
```

**Example:**
Agar aapka username `ali123` hai:
```json
"publish": [
  {
    "provider": "github",
    "owner": "ali123",
    "repo": "medisoft-pro-updates"
  }
],
```

#### 5. Next Update Kaise Kare

Jab bhi naya update banana ho:

1. **Version badhaao** `package.json` mein:
   ```json
   "version": "1.1.0"  // Pehle tha 1.0.0
   ```

2. **Build banao:**
   ```cmd
   npm run dist
   ```

3. **GitHub pe naya release banao:**
   - Tag: `v1.1.0`
   - Title: `MediSoft Pro v1.1.0`
   - 3 files upload karo (`release/` folder se)

4. **Done!** Sabhi installed apps ko automatic update mil jayega.

---

## 🌐 **Option 2: Local Network Server (LAN)**

### **Fayde:**
- ✅ Internet ki zaroorat nahi
- ✅ Fast local network speed
- ✅ Complete control

### **Nuqsaan:**
- ❌ Sirf local network pe kaam karega
- ❌ Server hamesha ON rehna chahiye

### **Setup Steps:**

#### 1. Update Server Folder Banao
```cmd
mkdir D:\medisoft-update-server
```

#### 2. Files Copy Karo
Har update ke baad ye 3 files copy karo:
```cmd
copy release\latest.yml D:\medisoft-update-server\
copy "release\MediSoft Pro Setup 1.0.0.exe" D:\medisoft-update-server\
copy "release\MediSoft Pro Setup 1.0.0.exe.blockmap" D:\medisoft-update-server\
```

#### 3. Simple HTTP Server Chalao

**Python method** (agar Python installed hai):
```cmd
cd D:\medisoft-update-server
python -m http.server 8080
```

**Node.js method** (agar Node installed hai):
```cmd
npm install -g http-server
cd D:\medisoft-update-server
http-server -p 8080
```

#### 4. Server IP Pata Karo
```cmd
ipconfig
```
IPv4 Address dekho, e.g., `192.168.1.100`

#### 5. Package.json Update Karo
```json
"publish": [
  {
    "provider": "generic",
    "url": "http://192.168.1.100:8080",
    "channel": "latest"
  }
],
```

#### 6. Network Ke Saare Computers Pe Install Karo
Ab aap installer ko kisi bhi computer pe install kar sakte hain. Updates automatic mil jayenge jab server ON hoga.

---

## ☁️ **Option 3: Cloud Storage (Google Drive / Dropbox)**

### **Fayde:**
- ✅ Accessible from anywhere
- ✅ Free storage available

### **Nuqsaan:**
- ❌ Direct links chahiye (tricky ho sakta hai)
- ❌ Bandwidth limits ho sakte hain

### **Setup (Advanced - Not Recommended for Beginners)**

GitHub Releases hi behtar option hai. Cloud storage direct download links ke saath complicated hai.

---

## 📋 Update Process Summary

### Har Naye Update Ke Liye:

1. **Code changes karo** apne project mein

2. **Version update karo** `package.json` mein:
   ```json
   "version": "1.1.0"
   ```

3. **Build banao:**
   ```cmd
   npm run dist
   ```

4. **3 Files upload karo** update server pe:
   - GitHub: New release banao
   - Local Server: Files copy karo
   - Cloud: Upload karo

5. **Done!** Installed apps ko automatic notification milega.

---

## 🔍 Testing Auto Updates

### Test Karne Ke Liye:

1. **Current version install karo** (v1.0.0)

2. **Version badhaao aur naya build banao** (v1.1.0)

3. **Update files upload karo** server pe

4. **App kholo** - Settings mein "Check for Updates" pe click karo

5. **Update download hoga** aur install ke liye prompt karega

---

## ⚠️ Important Notes

1. **Version number hamesha badhao** - electron-updater sirf higher versions detect karta hai

2. **Teen files zaroori hain:**
   - `latest.yml` - Update information
   - `.exe` - Installer file
   - `.exe.blockmap` - Download optimization

3. **Internet required** hai users ke liye (GitHub/Cloud ke case mein)

4. **Local network server** sirf tab kaam karta hai jab computer network se connected ho

---

## 🎓 Recommended Approach

**Beginners ke liye:** GitHub Releases (Option 1)
- Sabse aasan
- FREE aur reliable
- Professional solution

**Local business ke liye:** LAN Server (Option 2)
- Agar sirf office/shop mein use ho
- Internet ka kharcha nahi

**Current setup:** Aapki `package.json` mein abhi local server configured hai (`http://192.168.0.110:8080`)

---

## 🚀 Quick Start Command

GitHub pe switch karne ke liye ye command chalao:

```cmd
# Package.json edit karo aur GitHub settings add karo
```

Mujhe bataao aap konsa option use karna chahte hain, main setup mein madad karunga! 🎉
