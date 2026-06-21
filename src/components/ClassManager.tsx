import { useRef, useState } from 'react';
import type { Klass, PersistedState } from '../types';
import { Modal } from './Modal';
import { parseStudentNames, toCSV } from '../lib/parseStudents';
import { exportJSON, importJSON } from '../lib/storage';

interface Props {
  open: boolean;
  onClose: () => void;
  classes: Klass[];
  currentId: string | null;
  onSelectClass: (id: string) => void;
  onAddClass: (name: string) => void;
  onRenameClass: (id: string, name: string) => void;
  onDeleteClass: (id: string) => void;
  onAddStudents: (id: string, names: string[]) => void;
  onRemoveStudent: (classId: string, studentId: string) => void;
  onRenameStudent: (classId: string, studentId: string, name: string) => void;
  onToggleExclude: (classId: string, studentId: string) => void;
  onSetAllIncluded: (classId: string, included: boolean) => void;
  onImport: (data: { classes: PersistedState['classes']; classStates?: PersistedState['classStates'] }) => void;
  fullState: PersistedState;
  isPremium: boolean;
  classLimit: number;
  onRequireUpgrade: (reason: 'classes' | 'sync') => void;
}

/**
 * Classes & students modal.
 *
 *   Sidebar  ┃ Main
 *   ─────────╂─────────────────────────────────────
 *   add new  ┃ active class header (rename + timer)
 *   class    ┃
 *   list of  ┃ Add students  ─ one combined panel
 *   classes  ┃   • textarea (one name or paste many)
 *            ┃   • upload .csv / .txt (secondary)
 *   Backup & ┃
 *   sync     ┃ Students list (with All in / All out
 *   (premium)┃                 / Download names CSV)
 */
export function ClassManager(props: Props) {
  const { open, onClose, classes, currentId, fullState, isPremium, classLimit, onRequireUpgrade } = props;
  const klass = classes.find((c) => c.id === currentId) ?? classes[0];
  const atClassLimit = !isPremium && classes.length >= classLimit;

  // Single combined input for both "type one" and "paste many" — parseStudentNames
  // auto-detects newline / comma / tab separators, so there's no UX reason to have
  // distinct inputs for the two cases.
  const [addInput, setAddInput] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !klass) return;
    const reader = new FileReader();
    reader.onload = () => {
      const names = parseStudentNames(String(reader.result ?? ''));
      if (names.length > 0) props.onAddStudents(klass.id, names);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleAddStudents() {
    if (!klass) return;
    const names = parseStudentNames(addInput);
    if (names.length > 0) {
      props.onAddStudents(klass.id, names);
      setAddInput('');
    }
  }

  function downloadCurrentClassCSV() {
    if (!klass) return;
    const blob = new Blob([toCSV(klass.students.map((s) => s.name))], { type: 'text/csv' });
    download(blob, `${klass.name.replace(/\s+/g, '_')}_names.csv`);
  }

  function saveAllToFile() {
    if (!isPremium) { onRequireUpgrade('sync'); return; }
    const blob = new Blob(
      [exportJSON({ classes: fullState.classes, classStates: fullState.classStates })],
      { type: 'application/json' }
    );
    download(blob, 'pickastudent_backup.json');
  }

  function triggerLoad() {
    if (!isPremium) { onRequireUpgrade('sync'); return; }
    importRef.current?.click();
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const parsed = importJSON(text);
      if (parsed) {
        // It's a backup file — restore classes wholesale.
        props.onImport(parsed);
      } else if (klass) {
        // Not JSON — fall back to treating it as a names list for the current class.
        const names = parseStudentNames(text);
        if (names.length > 0) props.onAddStudents(klass.id, names);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <Modal open={open} onClose={onClose} title="Classes & students" wide>
      <div className="grid gap-4 md:grid-cols-[240px_1fr]">
        {/* ─── SIDEBAR ─── */}
        <aside className="flex flex-col gap-3">
          {atClassLimit ? (
            <button
              onClick={() => onRequireUpgrade('classes')}
              className="px-3 py-2 rounded-lg text-sm text-left bg-brand-600/10 ring-1 ring-brand-500/30 text-brand-700 dark:text-brand-300 hover:bg-brand-600/15"
            >
              + New class <span className="opacity-70">— upgrade to add more</span>
            </button>
          ) : (
            <input
              placeholder="New class name…"
              className="px-3 py-2 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] outline-none text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const v = (e.target as HTMLInputElement).value.trim();
                  if (v) { props.onAddClass(v); (e.target as HTMLInputElement).value = ''; }
                }
              }}
            />
          )}

          <ul className="flex flex-col gap-1">
            {classes.map((c) => (
              <li
                key={c.id}
                className={`group flex items-center gap-1 rounded-lg ${
                  c.id === klass?.id
                    ? 'bg-brand-600/10 ring-1 ring-brand-500/30'
                    : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                }`}
              >
                <button
                  onClick={() => props.onSelectClass(c.id)}
                  className="flex-1 text-left px-3 py-2 text-sm"
                >
                  <div className="font-medium truncate">{c.name}</div>
                  <div className="text-[11px] opacity-60">{c.students.length} students</div>
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete class "${c.name}"? This can't be undone.`))
                      props.onDeleteClass(c.id);
                  }}
                  className="opacity-0 group-hover:opacity-60 hover:opacity-100 px-2 text-xs"
                  title="Delete class"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>

          {/* Backup & sync — premium feature, visually distinct from the rest. */}
          <div className="mt-2 p-3 rounded-xl bg-gradient-to-br from-brand-500/[0.07] to-sage-500/[0.07] ring-1 ring-brand-500/20">
            <div className="flex items-center gap-1.5 mb-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">
                Backup &amp; sync
              </h3>
              {isPremium ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sage-500/20 text-sage-600 dark:text-sage-400 font-bold uppercase tracking-wider">
                  Active
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-600/15 text-brand-700 dark:text-brand-300 font-bold uppercase tracking-wider">
                  Premium
                </span>
              )}
            </div>
            <p className="text-xs opacity-70 mb-3 leading-snug">
              Save your classes to a file. Open the file on another device or
              browser to bring them with you.
            </p>
            <div className="flex flex-col gap-1.5">
              <button onClick={saveAllToFile} className="btn-soft text-xs w-full">
                💾 Save my classes
              </button>
              <button onClick={triggerLoad} className="btn-soft text-xs w-full">
                📂 Load from file
              </button>
              <input
                ref={importRef}
                type="file"
                accept=".json,.csv,.txt"
                className="hidden"
                onChange={handleImport}
              />
            </div>
          </div>
        </aside>

        {/* ─── MAIN ─── */}
        <section className="flex flex-col gap-3 min-w-0">
          {klass ? (
            <>
              {/* Class header — rename */}
              <input
                value={klass.name}
                onChange={(e) => props.onRenameClass(klass.id, e.target.value)}
                className="px-3 py-2 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] outline-none font-display font-semibold"
              />

              {/* Add students — single panel, primary action via the Add button. */}
              <div className="card flex flex-col gap-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider opacity-60">
                  Add students
                </h4>
                <textarea
                  value={addInput}
                  onChange={(e) => setAddInput(e.target.value)}
                  placeholder="Type a name, or paste many (one per line or comma-separated)"
                  className="w-full min-h-[88px] px-3 py-2 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] outline-none text-sm resize-y"
                />
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <button onClick={() => fileRef.current?.click()} className="btn-soft text-xs">
                    📎 Or upload .csv / .txt
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,.txt"
                    className="hidden"
                    onChange={handleFile}
                  />
                  <button
                    onClick={handleAddStudents}
                    disabled={!addInput.trim()}
                    className="btn-primary text-sm"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Student list */}
              <div className="card flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h4 className="text-sm font-semibold">{klass.students.length} students</h4>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      onClick={() => props.onSetAllIncluded(klass.id, true)}
                      className="opacity-70 hover:opacity-100 underline-offset-2 hover:underline"
                    >
                      All in
                    </button>
                    <span className="opacity-30">·</span>
                    <button
                      onClick={() => props.onSetAllIncluded(klass.id, false)}
                      className="opacity-70 hover:opacity-100 underline-offset-2 hover:underline"
                    >
                      All out
                    </button>
                    <span className="opacity-30">·</span>
                    <button
                      onClick={downloadCurrentClassCSV}
                      title="Download just the names of this class as a spreadsheet"
                      className="opacity-70 hover:opacity-100 underline-offset-2 hover:underline"
                    >
                      Download as spreadsheet
                    </button>
                  </div>
                </div>
                {klass.students.length === 0 ? (
                  <p className="text-sm opacity-60 py-3">No students yet — add some above.</p>
                ) : (
                  <ul className="grid sm:grid-cols-2 gap-1">
                    {klass.students.map((s) => (
                      <li key={s.id} className="flex items-center gap-2 group">
                        <input
                          type="checkbox"
                          checked={!s.excluded}
                          onChange={() => props.onToggleExclude(klass.id, s.id)}
                          title="Include in picks"
                        />
                        <input
                          value={s.name}
                          onChange={(e) => props.onRenameStudent(klass.id, s.id, e.target.value)}
                          className={`flex-1 px-2 py-1 rounded bg-transparent outline-none text-sm ${
                            s.excluded ? 'opacity-50 line-through' : ''
                          }`}
                        />
                        <button
                          onClick={() => {
                            if (confirm(`Remove ${s.name}?`)) props.onRemoveStudent(klass.id, s.id);
                          }}
                          className="opacity-0 group-hover:opacity-60 hover:opacity-100 px-2 text-xs"
                          title="Remove student"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm opacity-60">Create a class to get started.</p>
          )}
        </section>
      </div>
    </Modal>
  );
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
