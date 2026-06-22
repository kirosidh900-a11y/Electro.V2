# 🎨 Custom Loading Screens

Your app now has **3 professional loading screen options**. The loading screen appears when users first visit your site and disappears once the page fully loads.

## 📦 Available Loaders

### 1. **loader.ejs** - Gradient Spinner (Default)
- Blue → Purple → Red gradient background
- Classic spinner animation
- Simple and clean

### 2. **loader-minimal.ejs** - Bouncing Letters
- White background
- Each letter of "Electro" bounces individually
- Modern progress bar
- Lightweight and playful

### 3. **loader-premium.ejs** - Electronics Theme (Currently Active) ✨
- Dark gradient background with circuit patterns
- Dual spinning rings
- Glowing effects
- Floating particles
- Most premium looking

## 🔄 How to Switch Loaders

### For User Pages:
Edit `src/views/partials/user/header.ejs`:

```ejs
<!-- Change this line: -->
<%- include("../loader-premium.ejs") %>

<!-- To use a different loader: -->
<%- include("../loader.ejs") %>
<!-- OR -->
<%- include("../loader-minimal.ejs") %>
```

### For Admin Pages:
Edit `src/views/partials/head.ejs`:

```ejs
<!-- Change this line: -->
<%- include("./loader-premium.ejs") %>

<!-- To use a different loader: -->
<%- include("./loader.ejs") %>
<!-- OR -->
<%- include("./loader-minimal.ejs") %>
```

## ⚙️ Customization

### Change Colors:
Edit the loader file and update the gradient classes:
- `from-blue-600` → `from-green-600`
- `via-purple-600` → `via-teal-600`
- `to-red-600` → `to-blue-600`

### Change Duration:
Modify the timeout values in the `<script>` section:
```javascript
setTimeout(() => {
  loader.style.opacity = '0';
  setTimeout(() => loader.remove(), 600);
}, 800); // ← Change this (milliseconds)
```

### Add Custom Logo:
Replace the text logo with an image:
```html
<img src="/your-logo.png" alt="Logo" class="w-32 h-32 animate-pulse">
```

## 🚀 Testing

1. Clear browser cache (Ctrl + Shift + R)
2. Visit `http://localhost:3000`
3. The loader should appear for ~1 second
4. Page content fades in smoothly

## 📝 Notes

- ⚠️ **You CANNOT customize Render's deployment screen** (the one you showed in the screenshot) - that's Render's internal process
- ✅ **This loader only affects your actual website** once it's deployed
- Loaders auto-remove after 10-12 seconds as a safety measure
- Works on both production and localhost

## 🎯 Current Setup

- **User Pages**: `loader-premium.ejs` ✨
- **Admin Pages**: `loader-premium.ejs` ✨
