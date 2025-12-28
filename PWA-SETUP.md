# PWA Setup & Offline Usage Guide

## What's Been Added

Your GymApp is now a **Progressive Web App (PWA)**! This means:
- ✅ Works offline on your phone
- ✅ Can be installed on your home screen
- ✅ Automatically syncs when you reconnect
- ✅ Caches data locally using localStorage
- ✅ Service worker caches app files for offline use

## Creating App Icons

You need to create two PNG icons from the SVG file:

### Option 1: Online Tool (Easiest)
1. Go to https://realfavicongenerator.net/ or https://www.favicon-generator.org/
2. Upload `public/icon.svg`
3. Download the generated 192x192 and 512x512 PNG files
4. Save them as:
   - `public/icon-192x192.png`
   - `public/icon-512x512.png`

### Option 2: Using ImageMagick (Command Line)
```bash
# Install ImageMagick first: https://imagemagick.org/script/download.php
magick public/icon.svg -resize 192x192 public/icon-192x192.png
magick public/icon.svg -resize 512x512 public/icon-512x512.png
```

### Option 3: Custom Icon
Create your own 192x192 and 512x512 PNG icons and place them in the `public/` folder.

## Building for Production

```bash
npm run build
```

This creates an optimized `dist/` folder with all the PWA files.

## Deploying Your App

### Option 1: Vercel (Recommended - Free & Easy)
1. Install Vercel CLI: `npm install -g vercel`
2. Run: `vercel`
3. Follow the prompts
4. Your app will be live at: `https://your-app.vercel.app`

### Option 2: Netlify (Free)
1. Go to https://app.netlify.com/
2. Drag and drop the `dist/` folder
3. Your app will be live instantly

### Option 3: GitHub Pages
1. Add to `package.json`:
   ```json
   "homepage": "https://yourusername.github.io/GymApp",
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
   }
   ```
2. Install: `npm install -D gh-pages`
3. Run: `npm run deploy`

## Installing on Your Phone

### iOS (iPhone/iPad)
1. Open your deployed app in Safari
2. Tap the Share button (box with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add"
5. The app icon will appear on your home screen

### Android
1. Open your deployed app in Chrome
2. Tap the three dots menu (⋮)
3. Tap "Add to Home Screen" or "Install App"
4. Tap "Add"
5. The app icon will appear on your home screen

## How Offline Mode Works

### What's Cached
- All HTML, CSS, JavaScript files
- Images and fonts
- Supabase API responses (24 hours)

### What Happens Offline
1. **Viewing workouts**: Works completely offline using localStorage
2. **Adding workouts**: Saved to localStorage, marked as "⏳ Pending Sync"
3. **Editing workouts**: Same as adding - saved locally first
4. **When back online**: Automatically syncs all pending changes to Supabase

### Testing Offline Mode
1. Open your app
2. Open DevTools (F12)
3. Go to Network tab
4. Select "Offline" from the throttling dropdown
5. Try using the app - it should work!

## Troubleshooting

### App Not Installing
- Make sure icons exist in `public/` folder
- Clear browser cache and reload
- Check browser console for errors

### Service Worker Not Working
- Service workers only work over HTTPS or on localhost
- Make sure your deployment uses HTTPS (Vercel/Netlify do this automatically)

### Offline Mode Not Working
- Check DevTools → Application → Service Workers
- Make sure the service worker is activated
- Clear cache and reload

## File Structure
```
GymApp/
├── public/
│   ├── icon-192x192.png   (you need to create this)
│   ├── icon-512x512.png   (you need to create this)
│   └── icon.svg           (template provided)
├── vite.config.js         (PWA configuration)
└── index.html            (PWA meta tags added)
```

## Next Steps
1. Create the PNG icons (see "Creating App Icons" above)
2. Build: `npm run build`
3. Deploy to Vercel/Netlify
4. Install on your phone
5. Enjoy offline workout tracking!
