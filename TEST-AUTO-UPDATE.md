# Auto-Update Testing Instructions

## Summary of Changes Made
✅ Fixed IP address mismatch: `192.168.0.110` → `192.168.1.21`
✅ Built new version 1.0.9 with correct update server URL
✅ Copied files to update server: `C:\MediSoftUpdates\`
✅ Update server running on port 8080 (Process #13)

---

## STEP 1: Test Network Connectivity from PC B (Dosra)

### On PC B, open Command Prompt and run:
```cmd
ping 192.168.1.21
```

**Expected Result:** Should reply with bytes, time, TTL (NOT "Request timed out")

### If ping works, test the update server:
Open browser on PC B and go to:
```
http://192.168.1.21:8080/latest.yml
```

**Expected Result:** Should show YAML file with version 1.0.9

---

## STEP 2: Test Auto-Update on PC B

1. **Current Status on PC B:** MediSoft Pro version 1.0.7 installed
2. **Launch the app** on PC B
3. **Wait 5 minutes** (electron-updater checks every 5 minutes)
4. **Expected Notification:**
   - "Update Available — Version 1.0.9 is now available!"
   - Two buttons: "Download & Install" | "Later"

5. **Click "Download & Install"**
6. **Wait for download** (progress bar should appear)
7. **Click "Restart & Update"** when prompted
8. **Verify:** App restarts and shows version 1.0.9 in Settings

---

## STEP 3: If Auto-Update Notification Doesn't Appear

### Check PC A (Dev machine):
```cmd
ipconfig
```
Verify IP is `192.168.1.21` in the "IPv4 Address" line

### Check Update Server Logs (PC A):
Look at the terminal running the update server (Process #13)
- Should show GET requests from PC B's IP when update check happens
- Example: `::ffff:192.168.x.x - - [date] "GET /latest.yml?noCache=..."`

### Manual Update Check:
On PC B, close and reopen the app (triggers immediate update check)

---

## STEP 4: If Network Connection Fails

### Windows Firewall Issue:
On PC A, allow Python through firewall:
1. Windows Security → Firewall & Network Protection
2. Allow an app through firewall
3. Find "Python" → Check both Private & Public
4. Click OK

### Alternative: Create Firewall Rule:
On PC A, run as Administrator:
```cmd
netsh advfirewall firewall add rule name="MediSoft Update Server" dir=in action=allow protocol=TCP localport=8080
```

---

## Files Ready for Distribution

### PC A → USB/Email → PC B:
```
📁 MediSoft Pro Setup 1.0.9.exe (114 MB)
```

### Update Server Files (Already in C:\MediSoftUpdates\):
- ✅ MediSoft Pro Setup 1.0.9.exe
- ✅ MediSoft Pro Setup 1.0.9.exe.blockmap
- ✅ latest.yml (version: 1.0.9)

---

## Current Network Info

**PC A (Dev Machine):**
- IP: 192.168.1.21
- Update Server: http://192.168.1.21:8080
- Running: Python HTTP server on port 8080

**PC B (Dosra System):**
- Currently: MediSoft Pro v1.0.7
- Should update to: v1.0.9 (via auto-update)

---

## What to Report Back

Please test and let me know:
1. ✅/❌ Ping from PC B to `192.168.1.21` works?
2. ✅/❌ Browser on PC B can access `http://192.168.1.21:8080/latest.yml`?
3. ✅/❌ Update notification appeared in the app?
4. ✅/❌ Download & install worked successfully?
5. ✅/❌ App shows version 1.0.9 after restart?

---

## Database Transfer (If Needed)

If you want to copy database from PC A to PC B:

**PC A:**
1. Go to: `C:\Users\[Username]\AppData\Roaming\medisoft-pro\data\`
2. Copy: `medisoft.db`

**PC B:**
1. Install MediSoft Pro 1.0.9
2. Launch once (creates folders)
3. Close app
4. Go to: `C:\Users\[Username]\AppData\Roaming\medisoft-pro\data\`
5. Replace `medisoft.db` with PC A's file
6. Launch app → All data available! ✅

---

## Next Steps After Successful Test

Once auto-update works:
- Future updates only need: Build → Copy to `C:\MediSoftUpdates\`
- All PCs on same WiFi will auto-update
- No need to manually install on each PC
