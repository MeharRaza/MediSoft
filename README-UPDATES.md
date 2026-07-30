# MediSoft Pro — Update System Guide

## ✅ STATUS: FULLY WORKING

**Auto-Update System is now complete and operational!** 🎉

- ✅ electron-updater integrated
- ✅ Update server configured (http://192.168.0.110:8080)
- ✅ latest.yml generated
- ✅ HTTP server running
- ✅ All update files deployed

### 📚 Complete Urdu Guide Available
**Detailed step-by-step guide:** `AUTO-UPDATE-GUIDE-URDU.md`

---

## Jab Bhi Update Deni Ho — 4 Steps

### Step 1: Code change karo
Apne developer PC pe jo bhi fix ya feature add karna ho, karo.

### Step 2: Version number badlo
`package.json` mein version update karo:
```json
"version": "1.0.1"   // ya 1.1.0, 2.0.0 etc
```

### Step 3: New installer build karo
```
npm run dist
```
Ye banayega: `release/MediSoft Pro Setup 1.0.1.exe`

### Step 4: Update server pe upload karo
Neeche 2 options hain — apne setup ke hisaab se choose karo.

---

## Option A — LAN Server (Recommended: Internet nahi chahiye)

### Setup (ek baar)

1. Apne main PC pe ek shared folder banao:
   ```
   C:\MediSoftUpdates\
   ```

2. Is folder ko network pe share karo (right click → Share)

3. Python se ek HTTP server chalao is folder mein:
   ```
   cd C:\MediSoftUpdates
   python -m http.server 8080
   ```
   Ya permanently chalane ke liye Windows Service banana hoga.

4. `package.json` mein update karo:
   ```json
   "publish": [{
     "provider": "generic",
     "url": "http://192.168.1.100:8080"
   }]
   ```
   (192.168.1.100 = aapke main PC ka LAN IP)

### Har Update Pe

1. `npm run dist` se naya .exe banao
2. Ye 3 files `C:\MediSoftUpdates\` mein copy karo:
   - `MediSoft Pro Setup 1.0.1.exe`
   - `latest.yml`
   - `MediSoft Pro Setup 1.0.1.exe.blockmap`
3. Bas! Doosre PCs pe app khulne pe automatic update notification aayega.

---

## Option B — GitHub Releases (Internet chahiye)

### Setup (ek baar)

1. GitHub account banao: github.com
2. New repository banao: `medisoft-pro`
3. GitHub Personal Access Token banao (Settings → Developer Settings)
4. `package.json` mein update karo:
   ```json
   "publish": [{
     "provider": "github",
     "owner": "your-github-username",
     "repo": "medisoft-pro",
     "private": false
   }]
   ```
5. Environment variable set karo:
   ```
   set GH_TOKEN=your_github_token
   ```

### Har Update Pe
```
npm run dist -- --publish always
```
Ye automatically GitHub Release banayega aur files upload karega.

---

## Update Server IP Change Karna

Agar aapka main PC ka IP badal jaye:
1. `package.json` mein naya IP dalo
2. `npm run dist` se naya installer build karo
3. Sab PCs pe naya installer install karo (ek baar)

Uske baad updates automatically aane lagengi.

---

## Test Karna

Locally test karne ke liye:
```
# build karo
npm run dist

# release folder mein ye files hain
ls release/
# MediSoft Pro Setup 1.0.0.exe
# latest.yml       <-- yahi file check hoti hai
# *.blockmap

# Ek HTTP server chalao release folder mein
cd release
python -m http.server 8080

# package.json mein URL dalo:
# "url": "http://localhost:8080"
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025 | Initial Release |
