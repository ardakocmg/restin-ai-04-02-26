import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.antigravity.pos',
    appName: 'Restin POS',
    webDir: '../../apps/web/out',
    server: {
        androidScheme: 'https',
        // In dev, point this to your local computer's IP
        // url: 'http://192.168.1.X:3000'
    },
    plugins: {
        Keyboard: {
            resize: 'body',
            style: 'dark',
            resizeOnFullScreen: true,
        },
        SplashScreen: {
            launchShowDuration: 2000,
            backgroundColor: "#000000"
        }
    }
};

export default config;
