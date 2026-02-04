import * as React from "react"
import { cn } from "../../lib/utils"

const Dialog = ({ open, onOpenChange, children }: any) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            {children}
            <div className="fixed inset-0 -z-10" onClick={() => onOpenChange(false)}></div>
        </div>
    );
}

const DialogContent = ({ className, children }: any) => (
    <div className={cn("bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg w-full", className)}>
        {children}
    </div>
)

const DialogHeader = ({ className, children }: any) => (
    <div className={cn("p-6 pb-4 border-b border-zinc-800", className)}>
        {children}
    </div>
)

const DialogTitle = ({ className, children }: any) => (
    <h3 className={cn("text-lg font-semibold leading-none tracking-tight", className)}>
        {children}
    </h3>
)

export { Dialog, DialogContent, DialogHeader, DialogTitle }
