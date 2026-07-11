# Prostalk Safaris — Contact Capture App
## Install Instructions

---

## What's in this folder

```
prostalk-app/
├── index.html       ← The app itself
├── app.js           ← App logic
├── styles.css       ← Styling
├── manifest.json    ← Home Screen settings
├── icon.svg         ← App icon (placeholder — swap for real logo)
└── INSTALL.md       ← This file
```

---

## Installing on an iPad (one-off, takes 2 minutes)

1. **Transfer the folder to the iPad**
   - On your Mac, AirDrop the entire `prostalk-app` folder to the iPad, OR
   - Email it as a zip attachment and open it on the iPad, OR
   - Copy it via a USB cable using Finder

2. **Save it to Files → iCloud Drive**
   - When prompted, save the folder into **Files → iCloud Drive**
   - Suggested location: `iCloud Drive / Prostalk Safaris`

3. **Open the app in Safari**
   - Open the **Files** app on the iPad
   - Navigate to where you saved the folder
   - Tap **index.html** — it will open in Safari

4. **Add to Home Screen**
   - In Safari, tap the **Share** button (the box with an arrow pointing up)
   - Scroll down and tap **"Add to Home Screen"**
   - The name will show as "Prostalk Safaris" — tap **Add**

5. **Done.** You'll now see the Prostalk Safaris icon on your iPad Home Screen.
   Tap it to launch the app — it opens full screen, no address bar, just like a native app.

> **Note:** You only need to do steps 1–4 once. After that, just tap the Home Screen icon to launch.

---

## Using on a MacBook

No installation needed. Just:

1. Open the **prostalk-app** folder in Finder
2. Double-click **index.html** — it will open in Safari
3. Use it exactly as you would on the iPad

When saving, the file will appear in your normal Downloads folder (or wherever Safari saves downloads). Move it to iCloud Drive afterwards if you want it to sync to your iPad.

---

## How to use the app

### Starting a new session
- Tap **New Session**
- Enter the show/event name (e.g. "CLA Game Fair 2026") — a date-based default is suggested
- The form opens ready for your first contact

### Capturing a contact
- Fill in the contact details and tick any interests
- Tap **✓ Add Contact**
- The form clears and the contact count goes up — ready for the next person

### Reviewing contacts
- Tap the **Contacts** tab to see everyone captured so far
- Tap any contact to edit or delete them
- Use the search box to find someone quickly

### Saving
- Tap the **💾 Save** button at any time
- On iPad: Safari will show a "Save to Files" prompt — save to iCloud Drive to keep it backed up
- On Mac: it saves as a normal file download

> The app also auto-saves to the browser after every contact, so nothing is lost if the browser closes unexpectedly. You'll be prompted to continue where you left off next time you open the app.

### Starting a new show
- Tap the **⌂** (home) button to go back to the start screen
- Tap **New Session** to begin a fresh file for the new event
- Previous sessions can be re-opened at any time using **Open Existing Session**

---

## Swapping in the real logo

When the real Prostalk Safaris logo is ready:

1. Save it as **icon.svg** (or **icon.png**) in the `prostalk-app` folder
2. If using a PNG, update the two references in **index.html** and **manifest.json**:
   - `<link rel="apple-touch-icon" href="./icon.png" />`
   - `"src": "./icon.png"` in manifest.json
3. Re-transfer the updated folder to the iPad and repeat step 4 (Add to Home Screen) to refresh the icon

---

## Questions or problems

Contact Les or refer to the technical spec:
`Prostalk_Safaris_Contact_Capture_Spec_v1.2.docx`
