# Restin Mobile (iPad POS)

This directory contains the Native Wrapper for iOS and Android, using Capacitor.

## Setup

1. **Install Dependencies:**

    ```bash
    cd apps/mobile
    npm install
    ```

2. **Add Platforms:**

    ```bash
    npx cap add ios
    npx cap add android
    ```

3. **Sync Web Assets:**
    First, build the web app:

    ```bash
    cd ../web
    npm run build
    ```

    Then sync:

    ```bash
    cd ../mobile
    npx cap sync
    ```

## Development

To run on a real device with Live Reload:

1. Find your computer's IP address.
2. Update `capacitor.config.ts`:

    ```typescript
    server: {
      url: 'http://YOUR_IP:3000',
      cleartext: true
    }
    ```

3. Run `npx cap open ios` or `npx cap open android`.

## Plugins Configured

- **Camera:** QR Code scanning for loyalty/inventory.
- **Haptics:** Tactile feedback on POS buttons.
- **Thermal Printer:** Bluetooth printing via `printer-service.ts`.
