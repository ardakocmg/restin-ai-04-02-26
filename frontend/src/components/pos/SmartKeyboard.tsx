import React, { useMemo } from 'react';
import { Delete, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface SmartKeyboardProps {
    value: string;
    onChange: (value: string) => void;
    onClose: () => void;
    items: { name: string; short_name?: string }[];
    isOpen: boolean;
}

const KEYBOARD_LAYOUT = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Ğ', 'Ü'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'İ'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Ö', 'Ç'],
    [' ', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
];

export default function SmartKeyboard({
    value,
    onChange,
    onClose,
    items,
    isOpen
}: SmartKeyboardProps) {
    // Determine which characters are valid next inputs based on the current value.
    const validNextChars = useMemo(() => {
        const validChars = new Set<string>();
        const lowerValue = (value || '').toLowerCase();

        // If no items, allow everything (or nothing, but everything is safer)
        if (!items || items.length === 0) return null;

        items.forEach(item => {
            // Check against full name
            const itemName = (item.name || '').toLowerCase();
            if (itemName.includes(lowerValue)) {
                // Find all occurrences of the search substring
                let index = itemName.indexOf(lowerValue);
                while (index !== -1) {
                    const nextCharIndex = index + lowerValue.length;
                    if (nextCharIndex < itemName.length) {
                        validChars.add(itemName[nextCharIndex].toUpperCase());
                    }
                    index = itemName.indexOf(lowerValue, index + 1);
                }
            }

            // Check against short name if it exists
            if (item.short_name) {
                const shortName = item.short_name.toLowerCase();
                if (shortName.includes(lowerValue)) {
                    let index = shortName.indexOf(lowerValue);
                    while (index !== -1) {
                        const nextCharIndex = index + lowerValue.length;
                        if (nextCharIndex < shortName.length) {
                            validChars.add(shortName[nextCharIndex].toUpperCase());
                        }
                        index = shortName.indexOf(lowerValue, index + 1);
                    }
                }
            }
        });

        // Always allow space if space is a valid next char, handled by set natively.
        return validChars;
    }, [value, items]);

    if (!isOpen) return null;

    const handleKeyPress = (key: string) => {
        onChange(value + key);
    };

    const handleDelete = () => {
        onChange(value.slice(0, -1));
    };

    const handleClear = () => {
        onChange('');
    };

    const isKeyEnabled = (key: string) => {
        if (!validNextChars) return true; // If calculation failed, allow all.
        // If the current search value is empty, all first letters of words should be allowed.
        // Or actually, if it's empty, we might want to allow any character that starts any word.
        if (value.length === 0) {
            // Recalculate just for empty string: union of all first characters
            const firstChars = new Set<string>();
            items.forEach(item => {
                if (item.name) firstChars.add(item.name[0].toUpperCase());
                if (item.short_name) firstChars.add(item.short_name[0].toUpperCase());
            });
            return firstChars.has(key.toUpperCase());
        }

        return validNextChars.has(key.toUpperCase());
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.3)] z-50 p-4 pb-8 animate-in slide-in-from-bottom duration-300">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex-1 flex items-center justify-center relative">
                        <div className="bg-background border border-border rounded-xl px-4 py-3 min-w-[300px] text-center text-xl font-mono relative">
                            {value || <span className="text-muted-foreground">Search...</span>}
                            {value && (
                                <button
                                    onClick={handleClear}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-sm transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="text-muted-foreground hover:bg-secondary/80 absolute right-4 top-4 rounded-xl h-12 px-4"
                    >
                        <span className="font-bold">Close</span>
                    </Button>
                </div>

                <div className="flex flex-col gap-2.5 items-center">
                    {KEYBOARD_LAYOUT.map((row, rowIndex) => (
                        <div key={rowIndex} className="flex gap-2.5 justify-center w-full">
                            {rowIndex === 2 && (
                                <div className="w-8 shrink-0" /> // Spacer for row 3 offset
                            )}
                            {row.map((key) => {
                                const enabled = isKeyEnabled(key);
                                const isSpace = key === ' ';

                                return (
                                    <button
                                        key={key}
                                        onClick={() => handleKeyPress(key === ' ' ? ' ' : key)}
                                        disabled={!enabled}
                                        className={`
                                            h-14 md:h-16 rounded-xl font-bold text-xl md:text-2xl transition-all select-none
                                            flex items-center justify-center shrink-0 uppercase
                                            ${isSpace ? 'w-48 md:w-64' : 'w-12 sm:w-14 md:w-16'}
                                            ${enabled
                                                ? 'bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground shadow-md active:scale-95 border border-border/50'
                                                : 'bg-muted/30 text-muted-foreground/30 border border-border/10 cursor-not-allowed'
                                            }
                                        `}
                                    >
                                        {key === ' ' ? 'SPACE' : key}
                                    </button>
                                );
                            })}
                            {rowIndex === 2 && (
                                <button
                                    onClick={handleDelete}
                                    className="h-14 md:h-16 px-6 rounded-xl font-bold bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all shadow-md active:scale-95 flex items-center justify-center border border-destructive/20 ml-2"
                                >
                                    <Delete className="w-6 h-6" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
