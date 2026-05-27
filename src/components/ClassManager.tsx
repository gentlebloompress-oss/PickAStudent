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
  onSetClassDefaultTimer: (classId: string, seconds: number) => void;
  onImport: (data: { classes: PersistedState['classes']; classStates?: PersistedState['classStates'] }) => void;
  fullState: PersistedState;
}

export function ClassManager(props: Props) {
  const { open, onClose, classes, currentId, fullState } = props;
  const klass = classes.find((c) => c.id === currentId) ?? classes[0];
  const [pasting, setPasting] = useState('');
  const [newName, setNewName] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !klass) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const names = parseStudentNames(text);
      if (names.length > 0) props.onAddStudents(klass.id, names);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handlePaste() {
    if (!klass) return;
    const names = parseStudentNames(pasting);
    if (names.length > 0) props.onAddStudents(klass.id, names);
    setPasting('');
  }

  function handleAddOne() {
    if (!klass || !newName.trim()) return;
    props.onAddStudents(klass.id, [newName.trim()]);
    setNewName('');
  }

  function exportClassJSON() {
    if (!klass) return;
    const blob = new Blob([exportJSON({ classes: [klass], classStates: { [klass.id]: fullState.classStates[klass.id] } })], { type: 'application/json' });
    download(blob, `${klass.name.replace(/\s+/g, '_')}.json`);
  }

  function exportClassCSV() {
    if (!klass) return;
    const blob = new Blob([toCSV(klass.students.map((s) => s.name))], { type: 'text/csv' });
    download(blob, `${klass.name.replace(/\s+/g, '_')}.csv`);
  }

  function exportAllJSON() {
    const blob = new Blob([exportJSON({ classes: fullState.classes, classStates: fullState.classStates })], { type: 'application/json' });
    download(blob, `pickastudent_backup.json`);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      // JSON first, fall back to CSV → adds names to current class.
      const parsed = importJSON(text);
      if (parsed) {
        props.onImport(parsed);
      } else if (klass) {
        const names = parseStudentNames(text);
        if (names.length > 0) props.onAddStudents(klass.id, names);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <Modal open={open} onClose={onClose} title="Classes & students" wide>
      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        {/* Class list */}
        <aside className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              placeholder="New class name"
              className="flex-1 px-3 py-2 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] outline-none text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const v = (e.target as HTMLInputElement).value.trim();
                  if (v) { props.onAddClass(v); (e.target as HTMLInputElement).value = ''; }
                }
              }}
            />
          </div>
          <ul className="flex flex-col gap-1">
            {classes.map((c) => (
              <li key={c.id} className={`group flex items-center gap-1 rounded-lg ${c.id === klass?.id ? 'bg-brand-600/10 ring-1 ring-brand-500/30' : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}`}>
                <button onClick={() => props.onSelectClass(c.id)} className="flex-1 text-left px-3 py-2 text-sm">
                  <div className="font-medium truncate">{c.name}</div>
                  <div className="text-[11px] opacity-60">{c.students.length} students</div>
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete class "${c.name}"? This can't be undone.`)) props.onDeleteClass(c.id);
                  }}
                  className="opacity-0 group-hover:opacity-60 hover:opacity-100 px-2 text-xs"
                  title="Delete class"
                >✕</button>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-1 mt-2">
            <button onClick={exportAllJSON} className="btn-soft text-xs">Export all (JSON)</button>
            <button onClick={() => importRef.current?.click()} className="btn-soft text-xs">Import file…</button>
            <input ref={importRef} type="file" accept=".json,.csv,.txt" className="hidden" onChange={handleImport} />
          </div>
        </aside>

        {/* Active class detail */}
        <section className="flex flex-col gap-3 min-w-0">
          {klass ? (
            <>
              <div className="flex items-center gap-2">
                <input
                  value={klass.name}
                  onChange={(e) => props.onRenameClass(klass.id, e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] outline-none font-display font-semibold"
                />
                <select
                  value={klass.defaultTimerSeconds ?? 30}
                  onChange={(e) => props.onSetClassDefaultTimer(klass.id, Number(e.target.value))}
                  className="px-2 py-2 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] text-sm"
                  title="Default response timer for this class"
                >
                  <option value={10}>10s</option>
                  <option value={30}>30s</option>
                  <option value={60}>60s</option>
                  <option value={90}>90s</option>
                </select>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <div className="card p-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider opacity-60 mb-2">Add one</h4>
                  <div className="flex gap-2">
                    <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddOne()}
                      placeholder="Student name"
                      className="flex-1 px-3 py-2 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] outline-none text-sm" />
                    <button onClick={handleAddOne} className="btn-primary text-sm">Add</button>
                  </div>
                </div>
                <div className="card p-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider opacity-60 mb-2">Paste a list</h4>
                  <textarea value={pasting} onChange={(e) => setPasting(e.target.value)}
                    placeholder="Names — one per line or comma separated"
                    className="w-full h-16 px-3 py-2 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] outline-none text-sm resize-none" />
                  <button onClick={handlePaste} className="btn-soft text-xs mt-2 w-full">Add pasted names</button>
                </div>
                <div className="card p-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider opacity-60 mb-2">Upload</h4>
                  <button onClick={() => fileRef.current?.click()} className="btn-soft text-xs w-full">Choose .csv / .txt…</button>
                  <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
                  <div className="flex gap-1 mt-2">
                    <button onClick={exportClassJSON} className="btn-ghost text-xs flex-1">Export JSON</button>
                    <button onClick={exportClassCSV} className="btn-ghost text-xs flex-1">Export CSV</button>
                  </div>
                </div>
              </div>

              <div className="card flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">{klass.students.length} students</h4>
                  <div className="flex items-center gap-2 text-xs">
                    <button onClick={() => props.onSetAllIncluded(klass.id, true)} className="opacity-70 hover:opacity-100 underline-offset-2 hover:underline">All in</button>
                    <span className="opacity-30">·</span>
                    <button onClick={() => props.onSetAllIncluded(klass.id, false)} className="opacity-70 hover:opacity-100 underline-offset-2 hover:underline">All out</button>
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
                          className={`flex-1 px-2 py-1 rounded bg-transparent outline-none text-sm ${s.excluded ? 'opacity-50 line-through' : ''}`}
                        />
                        <button
                          onClick={() => {
                            if (confirm(`Remove ${s.name}?`)) props.onRemoveStudent(klass.id, s.id);
                          }}
                          className="opacity-0 group-hover:opacity-60 hover:opacity-100 px-2 text-xs"
                          title="Remove student"
                        >✕</button>
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
