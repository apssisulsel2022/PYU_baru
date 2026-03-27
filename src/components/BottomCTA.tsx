import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface BottomCTAProps {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  subtitle?: string;
}

export function BottomCTA({ children, onClick, disabled, subtitle }: BottomCTAProps) {
  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-background via-background to-transparent safe-bottom"
    >
      <div className="max-w-[480px] mx-auto">
        {subtitle && (
          <p className="text-sm text-muted-foreground text-center mb-2">{subtitle}</p>
        )}
        <Button
          onClick={onClick}
          disabled={disabled}
          className="w-full h-14 text-base font-semibold rounded-2xl shuttle-gradient text-primary-foreground shadow-lg touch-target"
          size="lg"
        >
          {children}
        </Button>
      </div>
    </motion.div>
  );
}
