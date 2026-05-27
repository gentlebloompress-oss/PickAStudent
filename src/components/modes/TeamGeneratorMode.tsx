import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { Klass, ClassState, Settings, Student } from '../../types';
import { formatTeamsText, splitByTeamSize, splitIntoTeams } from '../../lib/teamSplitter';

interface Props {
  klass: Klass;
  classState: ClassState;
  settings: Settings;
  onLockTeams: (teams: Student[][]) => void;
}

const TEAM_COLORS = [
  { bg: 'from-brand-500 to-brand-700', tile: 'bg-brand-500/10 dark:bg-brand-500/15 ring-brand-500/30' },
  { bg: 'from-sage-400 to-sage-600',   tile: 'bg-sage-500/10 dark:bg-sage-500/15 ring-sage-500/30' },
  { bg: 'from-amber-400 to-amber-600', tile: 'bg-amber-500/10 dark:bg-amber-500/15 ring-amber-500/30' },
  { bg: 'from-rose-400 to-rose-600',   tile: 'bg-rose-500/10 dark:bg-rose-500/15 ring-rose-500/30' },
  { bg: 'from-violet-400 to-violet-600', tile: 'bg-violet-500/10 dark:bg-violet-500/15 ring-violet-500/30' },
  { bg: 'from-cyan-400 to-cyan-600',   tile: 'bg-cyan-500/10 dark:bg-cyan-500/15 ring-cyan-500/30' },
];

type Mode = 'count' | 'size';

export function TeamGeneratorMode({ klass, classState, settings, onLockTeams }: Props) {
  const eligibleCount = klass.students.filter((s) => !s.excluded).length;
  const [mode, setMode] = useState<Mode>('count');
  const [numTeams, setNumTeams] = useState(Math.max(2, Math.min(4, Math.ceil(eligibleCount / 4))));
  const [teamSize, setTeamSize] = useState(4);
  const [avoidRecent, setAvoidRecent] = useState(true);
  const [teams, setTeams] = useState<Student[][]>([]);
  const [teamNames, setTeamNames] = useState<string[]>([]);
  const [locked, setLocked] = useState(false);

  function generate() {
    if (locked) return;
    const next = mode === 'count'
      ? splitIntoTeams(klass.students, numTeams, { avoidRecentPairings: avoidRecent, recentTeams: classState.recentTeams })
      : splitByTeamSize(klass.students, teamSize, { avoidRecentPairings: avoidRecent, recentTeams: classState.recentTeams });
    setTeams(next);
    setTeamNames((prev) => next.map((_, i) => prev[i] ?? `Team ${i + 1}`));
  }

  useEffect(() => {
    if (teams.length === 0 && eligibleCount > 0) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function copy() {
    void navigator.clipboard.writeText(formatTeamsText(teams, teamNames));
  }

  function lock() {
    setLocked(true);
    onLockTeams(teams);
  }

  const speedMult = useMemo(
    () => settings.animationSpeed === 'slow' ? 1.6 : settings.animationSpeed === 'fast' ? 0.55 : 1,
    [settings.animationSpeed]
  );

  return (
    <div className="stage px-4 sm:px-6 py-6 min-h-[420px] flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/[0.05] dark:bg-white/[0.06]">
          <button onClick={() => setMode('count')} className={`px-2.5 py-1 rounded-md text-xs font-medium ${mode === 'count' ? 'bg-white shadow-sm dark:bg-white/[0.14]' : 'opacity-60'}`}>By # teams</button>
          <button onClick={() => setMode('size')} className={`px-2.5 py-1 rounded-md text-xs font-medium ${mode === 'size' ? 'bg-white shadow-sm dark:bg-white/[0.14]' : 'opacity-60'}`}>By size</button>
        </div>

        {mode === 'count' ? (
          <Stepper label="Teams" value={numTeams} min={2} max={Math.max(2, eligibleCount)} onChange={setNumTeams} disabled={locked} />
        ) : (
          <Stepper label="Per team" value={teamSize} min={2} max={Math.max(2, eligibleCount)} onChange={setTeamSize} disabled={locked} />
        )}

        <label className="flex items-center gap-2 text-sm select-none">
          <input type="checkbox" checked={avoidRecent} onChange={(e) => setAvoidRecent(e.target.checked)} disabled={locked} />
          Avoid recent pairings
        </label>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={generate} disabled={locked} className="btn-soft text-sm">Re-shuffle</button>
          <button onClick={copy} className="btn-soft text-sm">Copy</button>
          {locked
            ? <button onClick={() => setLocked(false)} className="btn-primary text-sm">Unlock</button>
            : <button onClick={lock} className="btn-primary text-sm">Lock teams</button>}
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {teams.map((team, i) => {
          const color = TEAM_COLORS[i % TEAM_COLORS.length];
          return (
            <motion.div
              key={i}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 * speedMult, delay: i * 0.05 * speedMult }}
              className="card flex flex-col gap-2"
            >
              <div className={`-m-4 mb-0 px-4 py-2 rounded-t-2xl bg-gradient-to-br ${color.bg} text-white font-semibold flex items-center justify-between`}>
                <input
                  value={teamNames[i] ?? `Team ${i + 1}`}
                  onChange={(e) => setTeamNames((p) => p.map((n, idx) => idx === i ? e.target.value : n))}
                  className="bg-transparent outline-none w-full font-semibold placeholder-white/70"
                  placeholder={`Team ${i + 1}`}
                  disabled={locked}
                />
                <span className="text-xs font-medium opacity-90 ml-2">{team.length}</span>
              </div>
              <ul className="flex flex-col gap-1.5 mt-2">
                {team.map((s, j) => (
                  <motion.li
                    key={s.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25 * speedMult, delay: (i * 0.05 + j * 0.04) * speedMult }}
                    className={`rounded-lg px-3 py-2 text-sm ring-1 ${color.tile}`}
                  >
                    {s.name}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          );
        })}
      </div>

      {teams.length === 0 && (
        <div className="text-center opacity-60 py-12">
          Add students to this class to generate teams.
        </div>
      )}
    </div>
  );
}

function Stepper({ label, value, min, max, onChange, disabled }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="opacity-70">{label}</span>
      <button disabled={disabled} onClick={() => onChange(Math.max(min, value - 1))} className="btn-soft w-7 h-7 p-0">−</button>
      <span className="tabular-nums w-5 text-center font-semibold">{value}</span>
      <button disabled={disabled} onClick={() => onChange(Math.min(max, value + 1))} className="btn-soft w-7 h-7 p-0">+</button>
    </div>
  );
}
