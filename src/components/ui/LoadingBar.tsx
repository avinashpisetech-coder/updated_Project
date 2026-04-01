"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function LoadingBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Show loading bar on any route change
    setIsLoading(true);
    
    // Simulate initial progress
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600); // Quick pulse for fast routes

    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[10000] h-[3px] pointer-events-none"
        >
          {/* Main Progress Bar */}
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ 
              duration: 0.8, 
              ease: "easeInOut",
              times: [0, 0.4, 1] 
            }}
            className="h-full bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]"
          />
          
          {/* Scanning Glow Effect */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ 
              duration: 1.2, 
              repeat: Infinity, 
              ease: "linear" 
            }}
            className="absolute top-0 bottom-0 w-32 bg-gradient-to-r from-transparent via-white/40 to-transparent blur-sm"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
