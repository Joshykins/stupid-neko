import * as PopoverPrimitive from "@radix-ui/react-popover";

import * as React from "react";

import { cn } from "../../lib/utils";

function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 8,
  children,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal container={(window as any).__stupidNekoPortalEl as HTMLElement | undefined}>
      <PopoverPrimitive.Content align={align} sideOffset={sideOffset} asChild {...props}>
        <div
          data-slot="popover-content"
          className={cn(
            "!z-[2147483647] !w-[320px] !rounded-[8px] !border-2 !border-black !bg-foreground !p-[16px] !text-black !outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-popover-content-transform-origin)",
            className,
          )}
          style={{
            zIndex: 2147483647,
            pointerEvents: 'auto',
            background: '#fff',
            color: '#000',
            border: '2px solid #000',
            borderRadius: '8px',
            padding: '16px',
            width: '320px',
            boxShadow: '4px 4px 0 0 #000',
          }}
        >
          {children}
        </div>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverTrigger, PopoverContent };
