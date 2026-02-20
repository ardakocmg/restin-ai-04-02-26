// @ts-nocheck
/**
 * ♿ WCAG 2.2 Accessibility Utilities — Rule 46
 * Screen reader support, colorblind safety, focus management.
 */

/**
 * Announce a message to screen readers via aria-live region.
 * Creates the region if it doesn't exist.
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    let region = document.getElementById(`sr-announce-${priority}`);
    if (!region) {
        region = document.createElement('div');
        region.id = `sr-announce-${priority}`;
        region.setAttribute('aria-live', priority);
        region.setAttribute('aria-atomic', 'true');
        region.setAttribute('role', priority === 'assertive' ? 'alert' : 'status');
        region.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0;';
        document.body.appendChild(region);
    }
    // Clear then set to force re-announcement
    region.textContent = '';
    requestAnimationFrame(() => {
        region!.textContent = message;
    });
}

/**
 * Trap focus within a container (for modals/dialogs).
 * Returns a cleanup function to restore focus.
 */
export function trapFocus(container: HTMLElement): () => void {
    const focusableSelectors = [
        'a[href]', 'button:not([disabled])', 'input:not([disabled])',
        'select:not([disabled])', 'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])', '[contenteditable]'
    ].join(', ');

    const focusableElements = container.querySelectorAll<HTMLElement>(focusableSelectors);
    const firstEl = focusableElements[0];
    const lastEl = focusableElements[focusableElements.length - 1];
    const previousFocus = document.activeElement as HTMLElement;

    const handleKeydown = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
            if (document.activeElement === firstEl) {
                e.preventDefault();
                lastEl?.focus();
            }
        } else {
            if (document.activeElement === lastEl) {
                e.preventDefault();
                firstEl?.focus();
            }
        }
    };

    container.addEventListener('keydown', handleKeydown);
    firstEl?.focus();

    return () => {
        container.removeEventListener('keydown', handleKeydown);
        previousFocus?.focus();
    };
}

/**
 * Skip-to-content link support.
 * Call once on app mount.
 */
export function initSkipToContent(mainContentId: string = 'main-content'): void {
    const existing = document.getElementById('skip-to-content');
    if (existing) return;

    const link = document.createElement('a');
    link.id = 'skip-to-content';
    link.href = `#${mainContentId}`;
    link.textContent = 'Skip to main content';
    link.style.cssText = `
    position: fixed; top: -100px; left: 50%; transform: translateX(-50%);
    z-index: 99999; padding: 8px 16px; background: var(--primary);
    color: white; border-radius: 0 0 8px 8px; font-size: 14px;
    transition: top 0.2s; text-decoration: none;
  `;

    link.addEventListener('focus', () => { link.style.top = '0'; });
    link.addEventListener('blur', () => { link.style.top = '-100px'; });

    document.body.insertBefore(link, document.body.firstChild);
}

/**
 * Keyboard shortcut registry for accessibility.
 * Supports POS hybrid touch + keyboard (Rule 15).
 */
interface ShortcutConfig {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    description: string;
    action: () => void;
}

const shortcuts: Map<string, ShortcutConfig> = new Map();

export function registerShortcut(config: ShortcutConfig): () => void {
    const id = buildShortcutId(config);
    shortcuts.set(id, config);
    return () => shortcuts.delete(id);
}

function buildShortcutId(config: Pick<ShortcutConfig, 'key' | 'ctrl' | 'shift' | 'alt'>): string {
    const parts: string[] = [];
    if (config.ctrl) parts.push('ctrl');
    if (config.shift) parts.push('shift');
    if (config.alt) parts.push('alt');
    parts.push(config.key.toLowerCase());
    return parts.join('+');
}

export function initShortcutListener(): () => void {
    const handler = (e: KeyboardEvent) => {
        // Don't capture when typing in inputs
        const target = e.target as HTMLElement;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
        if (target.isContentEditable) return;

        const id = buildShortcutId({
            key: e.key,
            ctrl: e.ctrlKey || e.metaKey,
            shift: e.shiftKey,
            alt: e.altKey,
        });

        const shortcut = shortcuts.get(id);
        if (shortcut) {
            e.preventDefault();
            shortcut.action();
        }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
}

/**
 * Color contrast check — ensures 4.5:1 ratio for WCAG AA.
 */
export function getContrastRatio(hex1: string, hex2: string): number {
    const lum1 = getLuminance(hex1);
    const lum2 = getLuminance(hex2);
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    return (lighter + 0.05) / (darker + 0.05);
}

function getLuminance(hex: string): number {
    const rgb = hexToRgb(hex);
    if (!rgb) return 0;
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
        const sRGB = c / 255;
        return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
        : null;
}

/**
 * Reduced motion check — respect user preferences.
 */
export function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * High contrast mode check.
 */
export function prefersHighContrast(): boolean {
    return window.matchMedia('(prefers-contrast: more)').matches;
}
