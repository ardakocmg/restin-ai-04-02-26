import { Button } from '@/components/ui/button';
import { Sheet,SheetContent,SheetHeader,SheetTitle } from '@/components/ui/sheet';
import { X } from 'lucide-react';

export default function Drawer({ open, onClose, title, children, width = "lg" }) {
  const widths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full'
  };

  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className={`${widths[width]} w-full overflow-y-auto`}>
        <SheetHeader className="mb-4">
          <div className="flex items-center justify-between">
            <SheetTitle>{title}</SheetTitle>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Action">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>
        <div className="pb-6">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
