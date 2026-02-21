/**
 * Type declarations for shadcn/ui JSX components used in TSX files.
 * 
 * These components are written in .jsx but are imported in .tsx files.
 * Without explicit type declarations, TypeScript cannot infer that
 * React.forwardRef components accept children.
 * 
 * This file provides proper typing for all shadcn/ui JSX components
 * to prevent TS2322 "children does not exist" build errors.
 */

declare module "@/components/ui/scroll-area" {
    import { ComponentPropsWithoutRef,ForwardRefExoticComponent,RefAttributes } from "react";
    export const ScrollArea: ForwardRefExoticComponent<
        ComponentPropsWithoutRef<"div"> & { className?: string; children?: React.ReactNode } & RefAttributes<HTMLDivElement>
    >;
    export const ScrollBar: ForwardRefExoticComponent<
        ComponentPropsWithoutRef<"div"> & { className?: string; orientation?: "vertical" | "horizontal" } & RefAttributes<HTMLDivElement>
    >;
}

declare module "@/components/ui/avatar" {
    import { ForwardRefExoticComponent,RefAttributes } from "react";
    export const Avatar: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } & RefAttributes<HTMLSpanElement>
    >;
    export const AvatarImage: ForwardRefExoticComponent<
        { className?: string; src?: string; alt?: string } & RefAttributes<HTMLImageElement>
    >;
    export const AvatarFallback: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } & RefAttributes<HTMLSpanElement>
    >;
}

declare module "@/components/ui/accordion" {
    import { ForwardRefExoticComponent,RefAttributes } from "react";
    export const Accordion: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode; type?: "single" | "multiple"; collapsible?: boolean; defaultValue?: string; value?: string; onValueChange?: (v: string) => void } & RefAttributes<HTMLDivElement>
    >;
    export const AccordionItem: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode; value: string } & RefAttributes<HTMLDivElement>
    >;
    export const AccordionTrigger: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } & RefAttributes<HTMLButtonElement>
    >;
    export const AccordionContent: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } & RefAttributes<HTMLDivElement>
    >;
}

declare module "@/components/ui/alert" {
    import { ForwardRefExoticComponent,RefAttributes } from "react";
    export const Alert: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode; variant?: string } & RefAttributes<HTMLDivElement>
    >;
    export const AlertTitle: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } & RefAttributes<HTMLHeadingElement>
    >;
    export const AlertDescription: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } & RefAttributes<HTMLParagraphElement>
    >;
}

declare module "@/components/ui/alert-dialog" {
    import { ForwardRefExoticComponent,RefAttributes } from "react";
    export const AlertDialog: React.FC<{ children?: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }>;
    export const AlertDialogTrigger: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode; asChild?: boolean } & RefAttributes<HTMLButtonElement>
    >;
    export const AlertDialogContent: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } & RefAttributes<HTMLDivElement>
    >;
    export const AlertDialogHeader: React.FC<{ className?: string; children?: React.ReactNode }>;
    export const AlertDialogFooter: React.FC<{ className?: string; children?: React.ReactNode }>;
    export const AlertDialogTitle: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } & RefAttributes<HTMLHeadingElement>
    >;
    export const AlertDialogDescription: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } & RefAttributes<HTMLParagraphElement>
    >;
    export const AlertDialogAction: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode; onClick?: () => void } & RefAttributes<HTMLButtonElement>
    >;
    export const AlertDialogCancel: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode; onClick?: () => void } & RefAttributes<HTMLButtonElement>
    >;
}

declare module "@/components/ui/calendar" {
        export const Calendar: React.FC<{
        className?: string;
        mode?: "single" | "range" | "multiple";
        selected?: Date | Date[] | { from?: Date; to?: Date };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onSelect?: (date: /**/any) => void;
        disabled?: (date: Date) => boolean;
        initialFocus?: boolean;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [key: string]: /**/any;
    }>;
}

declare module "@/components/ui/carousel" {
    import { ForwardRefExoticComponent,RefAttributes } from "react";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export const Carousel: React.FC<{ className?: string; children?: React.ReactNode;[key: string]: /**/any }>;
    export const CarouselContent: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } & RefAttributes<HTMLDivElement>
    >;
    export const CarouselItem: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } & RefAttributes<HTMLDivElement>
    >;
    export const CarouselPrevious: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } & RefAttributes<HTMLButtonElement>
    >;
    export const CarouselNext: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } & RefAttributes<HTMLButtonElement>
    >;
}

declare module "@/components/ui/collapsible" {
    import { ForwardRefExoticComponent,RefAttributes } from "react";
    export const Collapsible: React.FC<{ className?: string; children?: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }>;
    export const CollapsibleTrigger: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode; asChild?: boolean } & RefAttributes<HTMLButtonElement>
    >;
    export const CollapsibleContent: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } & RefAttributes<HTMLDivElement>
    >;
}

declare module "@/components/ui/command" {
    import { ForwardRefExoticComponent,RefAttributes } from "react";
    export const Command: ForwardRefExoticComponent<
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { className?: string; children?: React.ReactNode;[key: string]: /**/any } & RefAttributes<HTMLDivElement>
    >;
    export const CommandInput: ForwardRefExoticComponent<
        { className?: string; placeholder?: string; value?: string; onValueChange?: (v: string) => void } & RefAttributes<HTMLInputElement>
    >;
    export const CommandList: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } & RefAttributes<HTMLDivElement>
    >;
    export const CommandEmpty: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } & RefAttributes<HTMLDivElement>
    >;
    export const CommandGroup: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode; heading?: string } & RefAttributes<HTMLDivElement>
    >;
    export const CommandItem: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode; value?: string; onSelect?: (value: string) => void; disabled?: boolean } & RefAttributes<HTMLDivElement>
    >;
    export const CommandSeparator: ForwardRefExoticComponent<
        { className?: string } & RefAttributes<HTMLDivElement>
    >;
}

declare module "@/components/ui/context-menu" {
    import { ForwardRefExoticComponent,RefAttributes } from "react";
    export const ContextMenu: React.FC<{ children?: React.ReactNode }>;
    export const ContextMenuTrigger: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode; asChild?: boolean } & RefAttributes<HTMLSpanElement>
    >;
    export const ContextMenuContent: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } & RefAttributes<HTMLDivElement>
    >;
    export const ContextMenuItem: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode; inset?: boolean; onSelect?: () => void } & RefAttributes<HTMLDivElement>
    >;
}

declare module "@/components/ui/drawer" {
    import { ForwardRefExoticComponent,RefAttributes } from "react";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export const Drawer: React.FC<{ children?: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void;[key: string]: /**/any }>;
    export const DrawerTrigger: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode; asChild?: boolean } & RefAttributes<HTMLButtonElement>
    >;
    export const DrawerContent: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } & RefAttributes<HTMLDivElement>
    >;
    export const DrawerHeader: React.FC<{ className?: string; children?: React.ReactNode }>;
    export const DrawerFooter: React.FC<{ className?: string; children?: React.ReactNode }>;
    export const DrawerTitle: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } & RefAttributes<HTMLHeadingElement>
    >;
    export const DrawerDescription: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } & RefAttributes<HTMLParagraphElement>
    >;
    export const DrawerClose: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode; asChild?: boolean } & RefAttributes<HTMLButtonElement>
    >;
}

declare module "@/components/ui/form" {
    import { ForwardRefExoticComponent,RefAttributes } from "react";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export const Form: React.FC<{ children?: React.ReactNode;[key: string]: /**/any }>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export const FormField: React.FC<{ children?: React.ReactNode; control?: /**/any; name: string; render: (field: /**/any) => React.ReactNode }>;
    export const FormItem: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } & RefAttributes<HTMLDivElement>
    >;
    export const FormLabel: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } & RefAttributes<HTMLLabelElement>
    >;
    export const FormControl: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } & RefAttributes<HTMLDivElement>
    >;
    export const FormDescription: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } & RefAttributes<HTMLParagraphElement>
    >;
    export const FormMessage: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } & RefAttributes<HTMLParagraphElement>
    >;
}

declare module "@/components/ui/hover-card" {
    import { ForwardRefExoticComponent,RefAttributes } from "react";
    export const HoverCard: React.FC<{ children?: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }>;
    export const HoverCardTrigger: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode; asChild?: boolean } & RefAttributes<HTMLAnchorElement>
    >;
    export const HoverCardContent: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode; align?: string; sideOffset?: number } & RefAttributes<HTMLDivElement>
    >;
}

declare module "@/components/ui/menubar" {
    import { ForwardRefExoticComponent,RefAttributes } from "react";
    export const Menubar: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } & RefAttributes<HTMLDivElement>
    >;
    export const MenubarMenu: React.FC<{ children?: React.ReactNode }>;
    export const MenubarTrigger: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } & RefAttributes<HTMLButtonElement>
    >;
    export const MenubarContent: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } & RefAttributes<HTMLDivElement>
    >;
    export const MenubarItem: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode; inset?: boolean; onSelect?: () => void } & RefAttributes<HTMLDivElement>
    >;
}

declare module "@/components/ui/navigation-menu" {
    import { ForwardRefExoticComponent,RefAttributes } from "react";
    export const NavigationMenu: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } & RefAttributes<HTMLElement>
    >;
    export const NavigationMenuList: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } & RefAttributes<HTMLUListElement>
    >;
    export const NavigationMenuItem: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } & RefAttributes<HTMLLIElement>
    >;
    export const NavigationMenuTrigger: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } & RefAttributes<HTMLButtonElement>
    >;
    export const NavigationMenuContent: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } & RefAttributes<HTMLDivElement>
    >;
    export const NavigationMenuLink: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode; asChild?: boolean; href?: string } & RefAttributes<HTMLAnchorElement>
    >;
    export const navigationMenuTriggerStyle: () => string;
}

declare module "@/components/ui/pagination" {
    import { ForwardRefExoticComponent,RefAttributes } from "react";
    export const Pagination: React.FC<{ className?: string; children?: React.ReactNode }>;
    export const PaginationContent: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } & RefAttributes<HTMLUListElement>
    >;
    export const PaginationItem: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } & RefAttributes<HTMLLIElement>
    >;
    export const PaginationLink: React.FC<{ className?: string; children?: React.ReactNode; isActive?: boolean; href?: string; size?: string }>;
    export const PaginationPrevious: React.FC<{ className?: string; href?: string; onClick?: () => void }>;
    export const PaginationNext: React.FC<{ className?: string; href?: string; onClick?: () => void }>;
    export const PaginationEllipsis: React.FC<{ className?: string }>;
}

declare module "@/components/ui/radio-group" {
    import { ForwardRefExoticComponent,RefAttributes } from "react";
    export const RadioGroup: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode; value?: string; onValueChange?: (v: string) => void; defaultValue?: string } & RefAttributes<HTMLDivElement>
    >;
    export const RadioGroupItem: ForwardRefExoticComponent<
        { className?: string; value: string; id?: string } & RefAttributes<HTMLButtonElement>
    >;
}

declare module "@/components/ui/resizable" {
        export const ResizablePanelGroup: React.FC<{ className?: string; children?: React.ReactNode; direction?: "horizontal" | "vertical" }>;
    export const ResizablePanel: React.FC<{ className?: string; children?: React.ReactNode; defaultSize?: number; minSize?: number; maxSize?: number }>;
    export const ResizableHandle: React.FC<{ className?: string; withHandle?: boolean }>;
}

declare module "@/components/ui/separator" {
    import { ForwardRefExoticComponent,RefAttributes } from "react";
    export const Separator: ForwardRefExoticComponent<
        { className?: string; orientation?: "horizontal" | "vertical"; decorative?: boolean } & RefAttributes<HTMLDivElement>
    >;
}

declare module "@/components/ui/skeleton" {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export const Skeleton: React.FC<{ className?: string;[key: string]: /**/any }>;
}

declare module "@/components/ui/sonner" {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export const Toaster: React.FC<{ [key: string]: /**/any }>;
}

declare module "@/components/ui/textarea" {
    import { ForwardRefExoticComponent,RefAttributes,TextareaHTMLAttributes } from "react";
    export const Textarea: ForwardRefExoticComponent<
        TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string } & RefAttributes<HTMLTextAreaElement>
    >;
}

declare module "@/components/ui/toggle" {
    import { ForwardRefExoticComponent,RefAttributes } from "react";
    export const Toggle: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode; variant?: string; size?: string; pressed?: boolean; onPressedChange?: (pressed: boolean) => void } & RefAttributes<HTMLButtonElement>
    >;
}

declare module "@/components/ui/toggle-group" {
    import { ForwardRefExoticComponent,RefAttributes } from "react";
    export const ToggleGroup: ForwardRefExoticComponent<
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { className?: string; children?: React.ReactNode; type?: "single" | "multiple"; value?: string | string[]; onValueChange?: (v: /**/any) => void; variant?: string; size?: string } & RefAttributes<HTMLDivElement>
    >;
    export const ToggleGroupItem: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode; value: string } & RefAttributes<HTMLButtonElement>
    >;
}

declare module "@/components/ui/tooltip" {
    import { ForwardRefExoticComponent,RefAttributes } from "react";
    export const Tooltip: React.FC<{ children?: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void; delayDuration?: number }>;
    export const TooltipTrigger: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode; asChild?: boolean } & RefAttributes<HTMLButtonElement>
    >;
    export const TooltipContent: ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode; side?: string; sideOffset?: number; align?: string } & RefAttributes<HTMLDivElement>
    >;
    export const TooltipProvider: React.FC<{ children?: React.ReactNode; delayDuration?: number }>;
}
