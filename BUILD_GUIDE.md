# DukaBook - Multi-Platform Build Guide

Build DukaBook for Android, iOS, Windows, macOS, and Linux.

## 📱 Prerequisites

### For Android (APK)
- **Android Studio** (download from https://developer.android.com/studio)
- **Java JDK 17+** (comes with Android Studio)
- Set `ANDROID_HOME` environment variable

### For iOS (IPA)
- **macOS** with **Xcode 14+** (from Mac App Store)
- **Apple Developer Account** (for distribution)
- **CocoaPods**: `sudo gem install cocoapods`

### For Desktop (Windows/macOS/Linux)
- **Node.js 18+** ✅ (already have)
- No additional requirements!

---

## 🚀 Quick Build Commands

### Web Build (Required First)
```bash
npm run build
```

### Android APK
```bash
# Open in Android Studio
npx cap open android

# Or build directly (requires Gradle)
cd android && ./gradlew assembleDebug
# APK will be in: android/app/build/outputs/apk/debug/
```

### iOS App
```bash
# Must be on macOS with Xcode
npx cap open ios
# Then build from Xcode (Cmd+B)
```

### Windows EXE
```bash
npm run electron:build:win
# Installer: release/DukaBook-1.0.0-win-x64.exe
# Portable: release/DukaBook-1.0.0-win-x64-portable.exe
```

### macOS App
```bash
npm run electron:build:mac
# DMG: release/DukaBook-1.0.0-mac-x64.dmg
# ZIP: release/DukaBook-1.0.0-mac-arm64.zip (M1/M2)
```

### Linux App
```bash
npm run electron:build:linux
# AppImage: release/DukaBook-1.0.0-linux-x64.AppImage
# DEB: release/DukaBook-1.0.0-linux-x64.deb
# RPM: release/DukaBook-1.0.0-linux-x64.rpm
```

---

## 📲 Step-by-Step: Android APK

### Method 1: Using Android Studio (Recommended)

1. **Build web assets first:**
   ```bash
   npm run build
   npx cap sync android
   ```

2. **Open in Android Studio:**
   ```bash
   npx cap open android
   ```

3. **Wait for Gradle sync** (first time takes 5-10 mins)

4. **Build APK:**
   - Menu: `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
   - APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

5. **For Release APK (signed):**
   - Menu: `Build` → `Generate Signed Bundle / APK`
   - Select `APK`
   - Create or select keystore
   - Build!

### Method 2: Command Line

```bash
# Navigate to android folder
cd android

# Debug APK
./gradlew assembleDebug

# Release APK (needs signing config)
./gradlew assembleRelease

# APK locations:
# Debug: android/app/build/outputs/apk/debug/app-debug.apk
# Release: android/app/build/outputs/apk/release/app-release.apk
```

---

## 🍎 Step-by-Step: iOS App

**Requirements:** macOS with Xcode

1. **Build and sync:**
   ```bash
   npm run build
   npx cap sync ios
   ```

2. **Install CocoaPods dependencies:**
   ```bash
   cd ios/App && pod install && cd ../..
   ```

3. **Open in Xcode:**
   ```bash
   npx cap open ios
   ```

4. **Configure signing:**
   - Select the "App" target
   - Go to "Signing & Capabilities"
   - Select your Team
   - Update Bundle Identifier if needed

5. **Build and run:**
   - Select a simulator or connected device
   - Press `Cmd+R` to run
   - Press `Cmd+B` to just build

6. **Archive for App Store:**
   - `Product` → `Archive`
   - Upload to App Store Connect

---

## 🖥️ Step-by-Step: Desktop Apps

### Windows

1. **Build:**
   ```bash
   npm run electron:build:win
   ```

2. **Output files in `/release`:**
   - `DukaBook-1.0.0-win-x64.exe` - Installer
   - `DukaBook-1.0.0-win-x64-portable.exe` - No install needed

### macOS

1. **Build:**
   ```bash
   npm run electron:build:mac
   ```

2. **Output files in `/release`:**
   - `DukaBook-1.0.0-mac-x64.dmg` - Intel Macs
   - `DukaBook-1.0.0-mac-arm64.dmg` - Apple Silicon (M1/M2)

### Linux

1. **Build:**
   ```bash
   npm run electron:build:linux
   ```

2. **Output files in `/release`:**
   - `.AppImage` - Universal, run anywhere
   - `.deb` - Ubuntu/Debian
   - `.rpm` - Fedora/RHEL

---

## 🌐 PWA (Already Works!)

Your app is already a Progressive Web App. Users can:

1. **On Mobile:** Visit the URL → "Add to Home Screen"
2. **On Desktop Chrome:** Look for install icon in address bar
3. **Works offline** after first load!

---

## 📦 File Structure After Setup

```
dukabook/
├── android/               # Android Studio project
│   └── app/
│       └── build/
│           └── outputs/
│               └── apk/   # APK files here
├── ios/                   # Xcode project
│   └── App/
├── dist/                  # Built web files
├── release/               # Desktop installers
├── capacitor.config.ts    # Mobile app config
├── electron.js            # Desktop app entry
└── electron-builder.json  # Desktop build config
```

---

## 🔑 Signing for Release

### Android Release Signing

1. Generate keystore:
   ```bash
   keytool -genkey -v -keystore dukabook.keystore -alias dukabook -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Add to `android/app/build.gradle`:
   ```gradle
   signingConfigs {
       release {
           storeFile file('dukabook.keystore')
           storePassword 'your-password'
           keyAlias 'dukabook'
           keyPassword 'your-password'
       }
   }
   ```

### iOS Code Signing
- Requires Apple Developer Program ($99/year)
- Configure in Xcode → Signing & Capabilities

---

## ⚡ Quick Reference

| Platform | Command | Output |
|----------|---------|--------|
| Web | `npm run build` | `dist/` |
| Android | `npx cap open android` | APK in Android Studio |
| iOS | `npx cap open ios` | IPA in Xcode |
| Windows | `npm run electron:build:win` | `release/*.exe` |
| macOS | `npm run electron:build:mac` | `release/*.dmg` |
| Linux | `npm run electron:build:linux` | `release/*.AppImage` |

---

## 🆘 Troubleshooting

### Android Build Fails
```bash
# Clean and rebuild
cd android && ./gradlew clean && cd ..
npx cap sync android
```

### iOS Pod Install Fails
```bash
cd ios/App
pod deintegrate
pod install
```

### Electron Build Fails
```bash
# Clear cache
rm -rf node_modules/.cache
npm run build
npm run electron:build:win
```

---

## 📞 Support

Having issues? Check:
- [Capacitor Docs](https://capacitorjs.com/docs)
- [Electron Docs](https://www.electronjs.org/docs)
- [Android Studio Guide](https://developer.android.com/studio/build)
