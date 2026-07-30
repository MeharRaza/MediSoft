# MediSoft Pro - Auto Update System Guide (Urdu)
## کامل آٹو اپڈیٹ سسٹم گائیڈ

---

## 📋 فہرست

1. [سسٹم کیسے کام کرتا ہے](#سسٹم-کیسے-کام-کرتا-ہے)
2. [پہلی بار سیٹ اپ](#پہلی-بار-سیٹ-اپ)
3. [نئی اپڈیٹ بنانا](#نئی-اپڈیٹ-بنانا)
4. [دوسرے PC میں انسٹال اور اپڈیٹ](#دوسرے-pc-میں-انسٹال-اور-اپڈیٹ)
5. [ٹربل شوٹنگ](#ٹربل-شوٹنگ)

---

## 🎯 سسٹم کیسے کام کرتا ہے

```
[آپ کا PC - سرور]  ←→  [دوسرے PCs - کلائنٹس]
     (Update Server)        (Software Installed)
          |                         |
          |    Check for updates    |
          |←------------------------|
          |                         |
          |    Send update info     |
          |----------------------→|
          |                         |
          |    Download & Install   |
          |←------------------------|
```

### کیا ہوتا ہے:
1. آپ ایک بار **Update Server** چلاتے ہیں (آپ کے PC پر)
2. دوسرے PCs پر جب MediSoft Pro کھلتا ہے، وہ خود بخود چیک کرتا ہے
3. اگر نئی اپڈیٹ ہے، تو نوٹیفکیشن آتی ہے
4. User "Update Now" کلک کرے، سافٹ ویئر خود اپڈیٹ ہو جاتا ہے

---

## 🚀 پہلی بار سیٹ اپ

### Step 1: Update Server فولڈر تیار کریں

یہ کام **صرف ایک بار** کرنا ہے:

```powershell
# C: drive میں نیا فولڈر بنائیں
mkdir C:\MediSoftUpdates
```

یہ فولڈر آپ کے **سرور PC** پر ہونا چاہیے (جہاں سے دوسرے PCs اپڈیٹ لیں گے)

### Step 2: Network Share بنائیں (Optional - اگر آسانی چاہیں)

1. `C:\MediSoftUpdates` فولڈر پر **Right Click** → **Properties**
2. **Sharing** tab → **Advanced Sharing**
3. ✅ **Share this folder** چیک کریں
4. Share Name: `MediSoftUpdates`
5. **Permissions** → Everyone → **Read** دیں
6. **OK** کریں

اب دوسرے PCs سے `\\YOUR-PC-NAME\MediSoftUpdates` سے فائلیں کاپی کر سکتے ہیں۔

### Step 3: اپنا PC کا IP Address پتا کریں

```powershell
ipconfig
```

**IPv4 Address** نوٹ کریں، مثال: `192.168.0.110`

### Step 4: Update Server شروع کریں

**طریقہ 1: بیچ فائل استعمال کریں (آسان)**

```batch
# Double-click کریں:
start-update-server.bat
```

یہ فائل خود سے سرور شروع کر دے گی۔

**طریقہ 2: Manual Command**

```powershell
cd C:\MediSoftUpdates
python -m http.server 8080
```

✅ **یاد رکھیں:** یہ سرور **ہمیشہ چالو** رہنا چاہیے تاکہ دوسرے PCs اپڈیٹ لے سکیں!

### Step 5: چیک کریں سرور چل رہا ہے

اپنے browser میں کھولیں:
```
http://localhost:8080
```

یا دوسرے PC سے:
```
http://192.168.0.110:8080
```

اگر فائلوں کی لسٹ نظر آئے، تو **سب ٹھیک ہے!** ✅

---

## 🆕 نئی اپڈیٹ بنانا

جب بھی آپ کو سافٹ ویئر میں کچھ تبدیلی کرنی ہو:

### Step 1: Version Number بڑھائیں

`package.json` فائل کھولیں اور version بدلیں:

```json
{
  "name": "medisoft-pro",
  "version": "1.0.1",   ← یہ بڑھائیں (1.0.0 → 1.0.1)
  ...
}
```

**Version Numbering:**
- چھوٹی fix: `1.0.0` → `1.0.1`
- نئی feature: `1.0.0` → `1.1.0`
- بڑی تبدیلی: `1.0.0` → `2.0.0`

### Step 2: Build بنائیں

```powershell
npm run dist
```

یہ command **5-10 منٹ** لیتا ہے۔ انتظار کریں جب تک ختم نہ ہو۔

### Step 3: 3 فائلیں Copy کریں

Build ختم ہونے کے بعد، یہ 3 فائلیں `C:\MediSoftUpdates` میں کاپی کریں:

```powershell
# Automatic طریقہ (آسان):
.\publish-update.bat

# یا Manual:
copy "release\latest.yml" "C:\MediSoftUpdates\"
copy "release\MediSoft Pro Setup 1.0.1.exe" "C:\MediSoftUpdates\"
copy "release\MediSoft Pro Setup 1.0.1.exe.blockmap" "C:\MediSoftUpdates\"
```

### Step 4: پرانی فائلیں Delete کریں (Optional)

```powershell
# پرانے versions کی .exe فائلیں ہٹا دیں:
del "C:\MediSoftUpdates\MediSoft Pro Setup 1.0.0.exe"
del "C:\MediSoftUpdates\MediSoft Pro Setup 1.0.0.exe.blockmap"
```

**نوٹ:** `latest.yml` **ہمیشہ ایک ہی رہتی ہے** (اسے delete مت کریں!)

### Step 5: چیک کریں Update دستیاب ہے

دوسرے PC پر MediSoft Pro کھولیں → **Settings** → **Check for Updates**

اگر نوٹیفکیشن آئے تو **کامیابی!** 🎉

---

## 💻 دوسرے PC میں انسٹال اور اپڈیٹ

### پہلی بار انسٹالیشن

1. سرور PC سے installer لیں:
   - Browser میں کھولیں: `http://192.168.0.110:8080`
   - Download کریں: `MediSoft Pro Setup 1.0.0.exe`

2. Installer چلائیں اور انسٹال کریں

3. Software کھولیں → لاگن کریں (default: admin/admin)

### خودکار اپڈیٹ حاصل کرنا

1. **Software کھلنے پر خودکار چیک:**
   - جیسے ہی MediSoft Pro شروع ہو، یہ background میں چیک کرتا ہے
   - اگر نئی اپڈیٹ ہے، تو نوٹیفکیشن آئے گی

2. **Manual چیک:**
   - **Settings** → **About** سیکشن
   - **Check for Updates** بٹن کلک کریں

3. **اپڈیٹ کریں:**
   - نوٹیفکیشن میں **Update Now** کلک کریں
   - سافٹ ویئر download کرے گا (کچھ منٹ لگیں گے)
   - Install ہونے کے بعد خود سے restart ہو جائے گا

---

## 🔧 ٹربل شوٹنگ

### مسئلہ 1: "Update check failed" error

**سبب:** Update Server نہیں چل رہا یا network مسئلہ

**حل:**
1. سرور PC پر چیک کریں `start-update-server.bat` چل رہا ہے؟
2. Browser میں test کریں: `http://192.168.0.110:8080`
3. Firewall چیک کریں (port 8080 کھلا ہونا چاہیے)

### مسئلہ 2: اپڈیٹ دستیاب نہیں دکھ رہی

**حل:**
1. چیک کریں `latest.yml` فائل `C:\MediSoftUpdates` میں ہے؟
2. چیک کریں version number بڑھایا تھا `package.json` میں؟
3. چیک کریں نئی `.exe` فائل کاپی کی؟

### مسئلہ 3: Download شروع نہیں ہو رہی

**سبب:** `.blockmap` فائل غائب ہے

**حل:**
```powershell
copy "release\MediSoft Pro Setup 1.0.1.exe.blockmap" "C:\MediSoftUpdates\"
```

### مسئلہ 4: "Port 8080 already in use"

**سبب:** دوسری کوئی سروس port استعمال کر رہی ہے

**حل:**
```powershell
# دوسرا port استعمال کریں:
python -m http.server 8081

# اور electron-builder.config.js میں بھی بدلیں:
publish: {
  provider: 'generic',
  url: 'http://192.168.0.110:8081'  ← نیا port
}
```

---

## 📝 فائلوں کی تفصیل

### C:\MediSoftUpdates میں یہ فائلیں ہونی چاہیئں:

| فائل | سائز | مقصد |
|------|------|------|
| `latest.yml` | ~300 bytes | اپڈیٹ کی معلومات |
| `MediSoft Pro Setup 1.0.x.exe` | ~110 MB | Installer |
| `MediSoft Pro Setup 1.0.x.exe.blockmap` | ~120 KB | تیز download کے لیے |

### Project میں اہم فائلیں:

- `package.json` - version number یہاں ہے
- `electron-builder.config.js` - update server URL یہاں ہے
- `electron/main.js` - auto-update logic یہاں ہے
- `src/components/UpdateNotifier.jsx` - UI notification
- `publish-update.bat` - تیز publish کے لیے script

---

## ✅ Quick Checklist

### پہلی بار Setup:
- [ ] `C:\MediSoftUpdates` فولڈر بنایا
- [ ] IP address نوٹ کیا
- [ ] Update Server شروع کیا (`start-update-server.bat`)
- [ ] Browser میں test کیا (`http://localhost:8080`)

### ہر اپڈیٹ کے لیے:
- [ ] `package.json` میں version بڑھایا
- [ ] `npm run dist` چلایا
- [ ] 3 فائلیں copy کیں (`publish-update.bat`)
- [ ] دوسرے PC پر test کیا

---

## 🎓 اہم نکات

1. **Update Server ہمیشہ چالو رکھیں:**
   - Windows startup میں شامل کریں
   - یا ایک dedicated PC پر چلائیں

2. **Version ہمیشہ بڑھائیں:**
   - پرانا: `1.0.0`
   - نیا: `1.0.1` (چھوٹی fix)
   - نیا: `1.1.0` (feature)

3. **3 فائلیں ہمیشہ ساتھ:**
   - `latest.yml`
   - `.exe`
   - `.blockmap`

4. **Network ضروری ہے:**
   - تمام PCs ایک ہی LAN پر ہوں
   - Firewall port 8080 کھلا ہو

5. **پرانی `.exe` فائلیں ہٹا سکتے ہیں:**
   - صرف latest version رکھیں
   - `latest.yml` کبھی delete نہ کریں

---

## 📞 مدد کے لیے

اگر کوئی مسئلہ آئے:

1. Check logs: `release/builder-debug.yml`
2. Check server: `http://192.168.0.110:8080`
3. Check version: Settings → About

---

**تیار ہو گیا! 🎉**

اب آپ آسانی سے تمام PCs پر اپڈیٹس بھیج سکتے ہیں۔
