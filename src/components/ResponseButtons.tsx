import { motion } from 'framer-motion';

interface Props {
  onRemove: () => void;
  disabled?: boolean;
}

/**
 * The post-pick action button. Picking a name now auto-records the call, so
 * the only explicit action a teacher needs is "Remove student" — exclude this
 * student so they aren't picked again until "Reset names". Pressing the picker
 * trigger again (Pick / Spin / another card) advances without confirmation.
 *
 * Component name kept as ResponseButtons for import stability across modes.
 */
export function ResponseButtons({ onRemove, disabled }: Props) {
  return (
    <motion.button
      type="button"
      onClick={onRemove}
      disabled={disabled}
      title={disabled ? 'Already removed' : 'Exclude this student from being picked again'}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16 }}
      className="btn h-11 px-5 text-sm font-medium bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 dark:bg-rose-500/10 dark:text-rose-200 dark:border-rose-500/25 dark:hover:bg-rose-500/15 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      ✕ Remove student <kbd className="kbd ml-1.5">X</kbd>
    </motion.button>
  );
}
