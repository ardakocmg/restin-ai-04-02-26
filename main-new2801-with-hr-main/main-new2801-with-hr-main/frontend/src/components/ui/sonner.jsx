import { Toaster as Sonner, toast } from "sonner"

const Toaster = ({
  ...props
}) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        style: {
          background: '#18181B',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#F5F5F7',
        },
        classNames: {
          toast:
            "group toast group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          error: "group-[.toast]:border-red-500/30 group-[.toast]:bg-red-950/50",
          success: "group-[.toast]:border-green-500/30 group-[.toast]:bg-green-950/50",
          warning: "group-[.toast]:border-yellow-500/30 group-[.toast]:bg-yellow-950/50",
          info: "group-[.toast]:border-blue-500/30 group-[.toast]:bg-blue-950/50",
        },
      }}
      {...props} />
  );
}

export { Toaster, toast }
