// Device Profile Detection for Cross-Device UI

interface DeviceProfileData {
  isTouch: boolean;
  supportsHover: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isMac: boolean;
  isWindows: boolean;
  isDesktop: boolean;
  sizeClass: 'mobile' | 'tablet' | 'desktop';
  orientation: 'portrait' | 'landscape';
}

type POSLayout = '1-column' | '2-column' | '3-column';

class DeviceProfile {
  static detect(): DeviceProfileData {
    const ua = navigator.userAgent;

    return {
      isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      supportsHover: window.matchMedia('(hover: hover)').matches,
      isIOS: /iPad|iPhone|iPod/.test(ua),
      isAndroid: /Android/.test(ua),
      isMac: /Macintosh/.test(ua),
      isWindows: /Windows/.test(ua),
      isDesktop: !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
      sizeClass: this.getSizeClass(),
      orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
    };
  }

  static getSizeClass(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  static hasSafeArea(): boolean {
    return CSS.supports('padding-top', 'env(safe-area-inset-top)');
  }

  static getOptimalPOSLayout(profile: DeviceProfileData): POSLayout {
    if (profile.sizeClass === 'mobile' && profile.orientation === 'portrait') {
      return '1-column'; // Vertical stack
    }
    if (profile.sizeClass === 'tablet') {
      return '2-column'; // Categories + Items, Order in drawer
    }
    return '3-column'; // Full Lightspeed layout
  }
}

export default DeviceProfile;
