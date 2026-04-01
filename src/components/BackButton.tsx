"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  className?: string;
  variant?: "ghost" | "outline" | "secondary" | "default";
  size?: "sm" | "icon" | "default";
  showLabel?: boolean;
}

export function BackButton({ 
  className, 
  variant = "ghost", 
  size = "icon",
  showLabel = false 
}: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    // If we have history, go back. 
    // We could add more complex logic here if needed.
    router.back();
  };

  return (
    <Button
      onClick={handleBack}
      variant={variant}
      size={size}
      className={cn(
        "rounded-xl transition-all duration-300 group hover:bg-primary/5 hover:text-primary",
        showLabel ? "px-3 gap-2 h-9" : "h-9 w-9",
        className
      )}
      title="Navigate Back"
    >
      <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
      {showLabel && (
        <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Back</span>
      )}
    </Button>
  );
}
