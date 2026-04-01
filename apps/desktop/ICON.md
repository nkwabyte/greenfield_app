# App Icon Configuration

The desktop app icon is configured to use the icon from the web app.

## Icon Location
- **Source**: `apps/web/public/app_icon.ico`
- **Format**: ICO (works for all platforms)

## Configuration
The icon is configured in `apps/desktop/package.json` under the `build` section:

```json
{
  "build": {
    "mac": {
      "icon": "../web/public/app_icon.ico"
    },
    "win": {
      "icon": "../web/public/app_icon.ico"
    },
    "linux": {
      "icon": "../web/public/app_icon.ico"
    }
  }
}
```

## Platform-Specific Icons (Optional)

For better quality, you can create platform-specific icons:

- **macOS**: `.icns` file (512x512, 256x256, 128x128, etc.)
- **Windows**: `.ico` file (256x256, 128x128, 64x64, 32x32, 16x16)
- **Linux**: `.png` file (512x512 recommended)

Place them in `apps/desktop/build/` and update the paths in `package.json`.

## Icon Requirements

- **macOS**: 512x512px minimum (1024x1024px recommended)
- **Windows**: 256x256px minimum
- **Linux**: 512x512px recommended

The current `.ico` file will be automatically converted by electron-builder for each platform.
