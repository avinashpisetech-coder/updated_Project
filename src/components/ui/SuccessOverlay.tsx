"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Trash2, Save, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { animate, motion, AnimatePresence } from "framer-motion";

export type SuccessActivity = "submit" | "update" | "delete" | "save" | "resolve";

interface SuccessOverlayProps {
  isVisible: boolean;
  activity: SuccessActivity;
  message?: string;
  onClose: () => void;
}

const activityConfig = {
  submit: {
    icon: Send,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    defaultMessage: "Submitted Successfully"
  },
  resolve: {
    icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    defaultMessage: "Resolution Confirmed"
  },
  update: {
    icon: CheckCircle2,
    color: "text-indigo-600",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
    defaultMessage: "Update Complete"
  },
  delete: {
    icon: Trash2,
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/20",
    defaultMessage: "Deleted Successfully"
  },
  save: {
    icon: Save,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
    defaultMessage: "Saved Successfully"
  }
};

export function SuccessOverlay({ isVisible, activity, message, onClose }: SuccessOverlayProps) {
  const config = activityConfig[activity];
  const Icon = config.icon;

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/40 backdrop-blur-md px-4"
        >
          <motion.div
            initial={{ scale: 0.8, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 10, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className={cn(
              "relative max-w-sm w-full p-8 rounded-3xl border shadow-2xl flex flex-col items-center justify-center text-center gap-4",
              config.bg,
              config.border
            )}
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 to-transparent pointer-none" />
            
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", damping: 12, stiffness: 200 }}
              className={cn("h-20 w-20 rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-background", config.bg, config.color)}
            >
              <Icon className="h-10 w-10" />
            </motion.div>

            <div className="space-y-1 relative z-10">
              <h3 className="text-2xl font-bold tracking-tight text-slate-900 leading-none">
                {message || config.defaultMessage}
              </h3>
              <p className="text-[12px] font-bold tracking-tight text-slate-500 opacity-80">
                Process confirmed · redirecting
              </p>
            </div>

            <div className="w-full max-w-[120px] h-1 bg-slate-100 rounded-full overflow-hidden mt-2">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.6, ease: "linear" }}
                className={cn("h-full", config.color.replace("text-", "bg-"))}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
