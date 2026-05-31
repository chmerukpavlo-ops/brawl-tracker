import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

interface TopProgressBarProps {
  isActive: boolean;
}

export default function TopProgressBar({ isActive }: TopProgressBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isActive) {
      setVisible(true);
      return;
    }
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), 250);
    return () => clearTimeout(t);
  }, [isActive, visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="top-progress"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="pointer-events-none fixed left-1/2 top-0 z-50 h-0.5 w-full max-w-[430px] -translate-x-1/2 overflow-hidden"
          style={{ marginTop: "env(safe-area-inset-top)" }}
        >
          <motion.div
            initial={{ width: "0%" }}
            animate={{
              width: isActive ? ["0%", "70%", "85%", "90%"] : "100%",
            }}
            transition={
              isActive
                ? { duration: 4, times: [0, 0.4, 0.75, 1], ease: "easeOut" }
                : { duration: 0.2, ease: "easeOut" }
            }
            className="h-full rounded-r-full bg-[#facc15] shadow-[0_0_8px_rgba(250,204,21,0.6)]"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
