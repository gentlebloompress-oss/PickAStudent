interface Props {
  onCreate: () => void;
}

export function EmptyState({ onCreate }: Props) {
  return (
    <div className="stage flex flex-col items-center justify-center text-center gap-3 py-16 px-6">
      <div className="text-5xl">🎒</div>
      <h2 className="font-display text-2xl font-bold">No class selected</h2>
      <p className="opacity-60 max-w-md">Create your first class, paste a roster, or use the sample class to try a mode in seconds.</p>
      <button onClick={onCreate} className="btn-primary mt-2">+ Create a class</button>
    </div>
  );
}
