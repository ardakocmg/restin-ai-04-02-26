import { ExternalLink } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import {
Sheet,
SheetContent,
SheetDescription,
SheetHeader,
SheetTitle,
} from '../ui/sheet';
import { Tabs,TabsContent,TabsList,TabsTrigger } from '../ui/tabs';

/**
 * DetailDrawer - Slide-out drawer for showing entity details
 * 
 * Props:
 * - open: boolean
 * - onOpenChange: (open) => void
 * - title: string
 * - subtitle: string
 * - badge: { text, variant }
 * - tabs: Array of { key, label, icon?, content: React.Node }
 * - actions: Array of { label, onClick, variant, icon }
 * - width: 'default' | 'lg' | 'xl' | 'full'
 */
export default function DetailDrawer({
  open,
  onOpenChange,
  title,
  subtitle,
  badge,
  tabs = [],
  actions = [],
  width = 'lg',
  children
}) {
  const widthClasses = {
    default: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    full: 'sm:max-w-full'
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={`${widthClasses[width]} p-0 flex flex-col`}
      >
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-2 mb-1">
                <SheetTitle className="text-xl font-semibold truncate">
                  {title}
                </SheetTitle>
                {badge && (
                  <Badge variant={badge.variant || 'default'}>
                    {badge.text}
                  </Badge>
                )}
              </div>
              {subtitle && (
                <SheetDescription className="text-sm text-muted-foreground">
                  {subtitle}
                </SheetDescription>
              )}
            </div>
          </div>

          {/* Actions */}
          {actions.length > 0 && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {actions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={index}
                    variant={action.variant || 'outline'}
                    size="sm"
                    onClick={action.onClick}
                    disabled={action.disabled}
                  >
                    {Icon && <Icon className="h-4 w-4 mr-2" />}
                    {action.label}
                  </Button>
                );
              })}
            </div>
          )}
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {tabs.length > 0 ? (
            <Tabs defaultValue={tabs[0].key} className="h-full flex flex-col">
              <div className="px-6 pt-4">
                <TabsList className="w-full">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <TabsTrigger key={tab.key} value={tab.key} className="flex-1">
                        {Icon && <Icon className="h-4 w-4 mr-2" />}
                        {tab.label}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>

              <ScrollArea className="flex-1">
                {tabs.map((tab) => (
                  <TabsContent key={tab.key} value={tab.key} className="m-0 p-6">
                    {tab.content}
                  </TabsContent>
                ))}
              </ScrollArea>
            </Tabs>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-6">
                {children}
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * InfoRow - Reusable component for displaying key-value pairs in drawer
 */
export function InfoRow({ label, value, copyable = false }) {
  const handleCopy = () => {
    if (copyable && value) {
      navigator.clipboard.writeText(value);
    }
  };

  return (
    <div className="flex items-start justify-between py-3">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-right">{value || '—'}</span>
        {copyable && value && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleCopy}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * InfoSection - Grouped info rows with header
 */
export function InfoSection({ title, children }) {
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      <div className="space-y-0 divide-y">
        {children}
      </div>
    </div>
  );
}
