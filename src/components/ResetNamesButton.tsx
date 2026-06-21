import { motion } from 'framer-motion';

interface Props {
  count: number;
  onClick: () => void;
}

/**
 * "Reset names" — brings removed students back into the rotation. Rendered
 * below the picker's action buttons (Standard / Wheel) so it's available in
 * both the normal and fullscreen layouts without needing the R shortcut.
 * Shown only when there's something to restore.
 */
export function ResetNamesButton({ count, onClick }: Props) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16 }}
      title="Bring all removed students back into the rotation (R)"
      className="btn h-9 px-4 text-sm font-medium bg-brand-50 text-brand-700 ring-1 ring-brand-200 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/25 dark:hover:bg-brand-500/15"
    >
      ↺ Reset names ({count})
    </motion.button>
  );
}
