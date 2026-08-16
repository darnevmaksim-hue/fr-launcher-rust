import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLauncherStore } from "../store/launcherStore";

export function StatusToast() {
  const error = useLauncherStore((s) => s.error);
  const statusMessage = useLauncherStore((s) => s.statusMessage);
  const clearError = useLauncherStore((s) => s.clearError);
  const clearStatusMessage = useLauncherStore((s) => s.clearStatusMessage);

  useEffect(() => {
    if (!statusMessage && !error) return;
    const timer = setTimeout(() => {
      clearError();
      clearStatusMessage();
    }, 5000);
    return () => clearTimeout(timer);
  }, [statusMessage, error, clearError, clearStatusMessage]);

  const dismiss = () => {
    clearError();
    clearStatusMessage();
  };

  const visible = error || statusMessage;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={`status-toast ${error ? "error" : "info"}`}
          initial={{ opacity: 0, y: 16, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: 16, x: "-50%" }}
          onClick={dismiss}
        >
          {error ?? statusMessage}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
