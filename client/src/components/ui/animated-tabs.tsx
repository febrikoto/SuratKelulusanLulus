import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { motion } from "framer-motion"
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Clone the cn function from utils to avoid import issues
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const AnimatedTabs = TabsPrimitive.Root

const AnimatedTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex w-full h-12 items-center justify-center rounded-md bg-background p-1 text-foreground shadow-sm",
      className
    )}
    {...props}
  />
))
AnimatedTabsList.displayName = "AnimatedTabsList"

interface AnimatedTabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  icon?: React.ReactNode;
  activeColor?: string;
  inactiveColor?: string;
}

const AnimatedTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  AnimatedTabsTriggerProps
>(({ className, children, icon, activeColor = "bg-primary", inactiveColor = "bg-muted", ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden group w-full h-full",
      className
    )}
    {...props}
  >
    <div className="relative z-10 flex items-center justify-center gap-2">
      {icon && <span className="h-4 w-4">{icon}</span>}
      <span>{children}</span>
    </div>
    
    {/* Colored background that fades in on hover and active states */}
    <motion.div 
      className={cn("absolute inset-0 opacity-0 group-hover:opacity-10 group-data-[state=active]:opacity-20", inactiveColor)}
      layoutId={`tab-bg-${props.value}`}
      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
    />
    
    {/* Animated underline for active state */}
    {props["data-state"] === "active" && (
      <motion.div 
        className={cn("absolute bottom-0 left-0 right-0 h-1 rounded-t-full", activeColor)}
        layoutId="active-tab-indicator"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
      />
    )}
    
    {/* Shimmer effect on hover */}
    <motion.div 
      className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-transparent via-white to-transparent"
      style={{ 
        width: "30%",
        left: "-30%",
      }}
      animate={{
        left: ["0%", "130%"],
      }}
      transition={{ 
        repeat: Infinity, 
        repeatType: "loop", 
        duration: 1.5,
        ease: "linear",
        repeatDelay: 0.5,
      }}
    />
  </TabsPrimitive.Trigger>
))
AnimatedTabsTrigger.displayName = "AnimatedTabsTrigger"

const AnimatedTabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  >
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      {props.children}
    </motion.div>
  </TabsPrimitive.Content>
))
AnimatedTabsContent.displayName = "AnimatedTabsContent"

export { AnimatedTabs, AnimatedTabsList, AnimatedTabsTrigger, AnimatedTabsContent }