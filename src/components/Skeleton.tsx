import { motion } from "motion/react";
import type { CSSProperties } from "react";

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
  shimmer?: boolean;
  rounded?: string;
}

export default function Skeleton({
  className = "",
  style,
  shimmer = true,
  rounded = "rounded-xl",
}: SkeletonProps) {
  return (
    <div
      className={`relative overflow-hidden border border-white/5 bg-white/[0.04] ${rounded} ${className}`}
      style={style}
      aria-busy
      aria-live="polite"
    >
      <motion.div
        animate={{ opacity: [0.35, 0.7, 0.35] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 bg-white/5"
      />
      {shimmer && (
        <motion.div
          aria-hidden
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: "easeInOut",
            repeatDelay: 0.2,
          }}
          className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        />
      )}
    </div>
  );
}
