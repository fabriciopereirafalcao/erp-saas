import { Info, HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { ReactNode } from "react";

interface FeatureInfoBadgeProps {
  title: string;
  children: ReactNode;
  icon?: "info" | "help";
  variant?: "blue" | "green" | "purple" | "orange";
  position?: "top-right" | "top-left" | "inline";
}

export function FeatureInfoBadge({ 
  title, 
  children, 
  icon = "info",
  variant = "blue",
  position = "top-right"
}: FeatureInfoBadgeProps) {
  
  const variantStyles = {
    blue: {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      hover: "hover:bg-blue-200 dark:hover:bg-blue-800/50",
      icon: "text-blue-600 dark:text-blue-400",
      border: "border-blue-200 dark:border-blue-800"
    },
    green: {
      bg: "bg-green-100 dark:bg-green-900/30",
      hover: "hover:bg-green-200 dark:hover:bg-green-800/50",
      icon: "text-green-600 dark:text-green-400",
      border: "border-green-200 dark:border-green-800"
    },
    purple: {
      bg: "bg-purple-100 dark:bg-purple-900/30",
      hover: "hover:bg-purple-200 dark:hover:bg-purple-800/50",
      icon: "text-purple-600 dark:text-purple-400",
      border: "border-purple-200 dark:border-purple-800"
    },
    orange: {
      bg: "bg-orange-100 dark:bg-orange-900/30",
      hover: "hover:bg-orange-200 dark:hover:bg-orange-800/50",
      icon: "text-orange-600 dark:text-orange-400",
      border: "border-orange-200 dark:border-orange-800"
    }
  };

  const positionStyles = {
    "top-right": "absolute top-4 right-4 z-10",
    "top-left": "absolute top-4 left-4 z-10",
    "inline": "inline-flex"
  };

  const IconComponent = icon === "help" ? HelpCircle : Info;
  const styles = variantStyles[variant];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`
            ${positionStyles[position]}
            flex items-center justify-center
            w-9 h-9 rounded-full
            ${styles.bg} ${styles.hover}
            border ${styles.border}
            transition-all duration-200
            shadow-sm hover:shadow-md
            group
          `}
          aria-label="Informações sobre funcionalidade"
        >
          <IconComponent className={`w-5 h-5 ${styles.icon} group-hover:scale-110 transition-transform`} />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-96 p-0 overflow-hidden"
        align="end"
        sideOffset={8}
      >
        <div className={`p-4 ${styles.bg} border-b ${styles.border}`}>
          <div className="flex items-center gap-2">
            <IconComponent className={`w-5 h-5 ${styles.icon}`} />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800">
          {children}
        </div>
      </PopoverContent>
    </Popover>
  );
}
