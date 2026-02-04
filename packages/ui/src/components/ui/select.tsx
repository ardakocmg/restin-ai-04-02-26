import * as React from "react"
import { cn } from "../../lib/utils"

const Select = (props: any) => <div>{props.children}</div>
const SelectGroup = (props: any) => <div>{props.children}</div>
const SelectValue = (props: any) => <span>{props.placeholder}</span>

const SelectTrigger = ({ className, children, ...props }: any) => (
    <button
        className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm ring-offset-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
        )}
        {...props}
    >
        {children}
    </button>
)

const SelectContent = ({ className, children, ...props }: any) => (
    <div
        className={cn(
            "relative z-50 min-w-[8rem] overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 text-zinc-950 shadow-md",
            className
        )}
        {...props}
    >
        <div className="p-1">{children}</div>
    </div>
)

const SelectItem = ({ className, children, ...props }: any) => (
    <div
        className={cn(
            "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-zinc-100 focus:text-zinc-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
            className
        )}
        {...props}
    >
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
            {/* Check Icon would go here */}
        </span>
        <span className="text-zinc-200">{children}</span>
    </div>
)

export {
    Select,
    SelectGroup,
    SelectValue,
    SelectTrigger,
    SelectContent,
    SelectItem,
}
