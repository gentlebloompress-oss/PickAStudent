import { useState } from 'react';
import { Header } from './components/Header';
import { ClassSwitcher } from './components/ClassSwitcher';
import { ModeTabs } from './components/ModeTabs';
import { SettingsPanel } from './components/SettingsPanel';
import { ClassManager } from './components/ClassManager';
import { HeatMap, HeatMapLocked } from './components/HeatMap';
import { RecentlyPicked } from './components/RecentlyPicked';
import { EmptyState } from './components/EmptyState';
import { PWAToasts } from './components/PWAToasts';

import { StandardMode } from './components/modes/StandardMode';
import { WheelMode } from './components/modes/WheelMode';
import { MysteryCardMode } from './components/modes/MysteryCardMode';
import { TeamGeneratorMode } from './components/modes/TeamGeneratorMode';

import { UpgradeModal, type UpgradeReason } from './components/UpgradeModal';

import { useAppState } from './hooks/useAppState';
import { useKey } from './hooks/useKeyboard';
import { useFullscreen } from './hooks/useFullscreen';
import { usePremium } from './hooks/usePremium';
import { useCoarsePointer } from './hooks/useCoarsePointer';

import type { Klass, PersistedState } from './types';
import { freshClassState } from './lib/pickerEngine';
import { FREE_CLASS_LIMIT, FREE_STUDENT_LIMIT } from './lib/premium';

/**
 * Root layout. The four picker modes share a thin contract:
 *   onPicked(studentIds)   → fired right after a name is revealed (no count change yet)
 *   onOutcome(ids, kind)   → fired when the teacher hits Answered / Pass / Come back
 *
 * To add a new mode (bingo, slot machine, bracket, etc.):
 *   1. Add its id to PickerMode in types.ts.
 *   2. Add a tab entry in ModeTabs.tsx.
 *   3. Drop a new component under src/components/modes that calls pickNext()
 *      from pickerEngine.ts and uses ResponseButtons for outcomes.
 *   4. Render it in the switch below.
 */
export default function App() {
  const { state, currentClass, currentClassState, actions } = useAppState();
  const { isPremium, license, deactivate } = usePremium();
  const coarsePointer = useCoarsePointer();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [upgrade, setUpgrade] = useState<{ open: boolean; reason: UpgradeReason }>({ open: false, reason: 'general' });
  const fullscreen = useFullscreen();

  function requireUpgrade(reason: UpgradeReason) {
    setUpgrade({ open: true, reason });
  }

  /** Gate: free users can create up to FREE_CLASS_LIMIT classes. */
  function handleAddClass(name: string) {
    if (!isPremium && state.classes.length >= FREE_CLASS_LIMIT) {
      requireUpgrade('classes');
      return;
    }
    actions.addClass(name);
  }

  /**
   * Gate: free users can have up to FREE_STUDENT_LIMIT students per class.
   * Adds as many of the incoming names as fit (so a big paste still gives
   * value), then prompts the upgrade if any were turned away. Routing every
   * add path (type / paste / upload / import) through here keeps the cap
   * consistent everywhere.
   */
  function handleAddStudents(classId: string, names: string[]) {
    if (isPremium) {
      actions.addStudents(classId, names);
      return;
    }
    const klass = state.classes.find((c) => c.id === classId);
    const current = klass ? klass.students.length : 0;
    const room = Math.max(0, FREE_STUDENT_LIMIT - current);
    if (names.length <= room) {
      actions.addStudents(classId, names);
      return;
    }
    if (room > 0) actions.addStudents(classId, names.slice(0, room));
    requireUpgrade('students');
  }

  // The fairness heat map is free for the first (primary) class only.
  const heatMapAllowed = isPremium || (!!currentClass && state.classes[0]?.id === currentClass.id);

  // Presentation mode: when projecting (fullscreen), strip the side panels and
  // heat map so the picker stage owns the screen. Exiting fullscreen (button or
  // Esc) reverts automatically via the useFullscreen hook.
  const presenting = fullscreen.isFullscreen;

  // Renders the active picker mode. Shared between the normal and presentation
  // layouts so the mode wiring lives in one place.
  const renderMode = (klass: Klass) => {
    switch (state.mode) {
      case 'standard':
        return (
          <StandardMode
            klass={klass}
            classState={currentClassState}
            settings={state.settings}
            onPicked={() => { /* recorded on outcome */ }}
            onOutcome={(ids, outcome) => actions.recordPick(klass.id, ids, outcome)}
            onExclude={(sid) => actions.toggleExclude(klass.id, sid)}
            onResetNames={() => actions.setAllIncluded(klass.id, true)}
          />
        );
      case 'wheel':
        return (
          <WheelMode
            klass={klass}
            classState={currentClassState}
            settings={state.settings}
            onPicked={() => { /* noop */ }}
            onOutcome={(ids, outcome) => actions.recordPick(klass.id, ids, outcome)}
            onExclude={(sid) => actions.toggleExclude(klass.id, sid)}
            onResetNames={() => actions.setAllIncluded(klass.id, true)}
          />
        );
      case 'mystery':
        return (
          <MysteryCardMode
            klass={klass}
            classState={currentClassState}
            settings={state.settings}
            onPicked={() => { /* noop */ }}
            onOutcome={(ids, outcome) => actions.recordPick(klass.id, ids, outcome)}
            onToggleExclude={(sid) => actions.toggleExclude(klass.id, sid)}
            onUndoStudent={(sid) => actions.undoStudentPick(klass.id, sid)}
            onResetNames={() => actions.setAllIncluded(klass.id, true)}
          />
        );
      case 'teams':
        return (
          <TeamGeneratorMode
            klass={klass}
            classState={currentClassState}
            settings={state.settings}
            onLockTeams={(teams) => actions.rememberTeams(klass.id, teams)}
          />
        );
    }
  };

  // Global shortcuts (mode switching, fullscreen, reset).
  useKey('1', () => actions.setMode('standard'));
  useKey('2', () => actions.setMode('wheel'));
  useKey('3', () => actions.setMode('mystery'));
  useKey('4', () => actions.setMode('teams'));
  useKey('f', () => fullscreen.toggle());
  useKey('r', () => {
    // Reset names — bring back any "Don't pick again" students into the rotation.
    // (Resetting call counts is a heavier action and stays in the heat map UI only.)
    if (!currentClass) return;
    actions.setAllIncluded(currentClass.id, true);
  });

  function handleImport(data: { classes: PersistedState['classes']; classStates?: PersistedState['classStates'] }) {
    // Merge imported classes; existing classes keep their state.
    const incomingClasses = data.classes.filter((c) => !state.classes.find((existing) => existing.id === c.id));
    const mergedClasses = [...state.classes, ...incomingClasses];
    const mergedStates = { ...state.classStates };
    for (const c of incomingClasses) {
      mergedStates[c.id] = data.classStates?.[c.id] ?? freshClassState();
    }
    actions.replaceState({
      ...state,
      classes: mergedClasses,
      classStates: mergedStates,
      currentClassId: state.currentClassId ?? mergedClasses[0]?.id ?? null,
    });
  }

  return (
    <div className={`min-h-full mx-auto px-3 sm:px-5 py-3 sm:py-4 flex flex-col gap-4 ${presenting ? 'max-w-none h-full' : 'max-w-6xl'}`}>
      {/* Top area — slim bar when presenting, full header otherwise. Wrapped in
          one stable slot so toggling fullscreen doesn't shift sibling indices
          and remount the picker below (which would reset the current pick). */}
      <div className="flex flex-col gap-4">
        {presenting && currentClass ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <img src="/logo.png" alt="" width={28} height={28} className="w-7 h-7 rounded-lg shadow-sm shrink-0" />
              <span className="font-display font-bold truncate">{currentClass.name}</span>
              <span className="text-xs opacity-50 shrink-0">{currentClass.students.filter((s) => !s.excluded).length} eligible</span>
            </div>
            <div className="hidden sm:block"><ModeTabs mode={state.mode} onChange={actions.setMode} /></div>
            <button onClick={fullscreen.toggle} title="Exit fullscreen (F)" className="btn-ghost text-sm shrink-0">⤺ Exit</button>
          </div>
        ) : (
          <>
            <Header onOpenSettings={() => setSettingsOpen(true)} onOpenManager={() => setManagerOpen(true)} />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <ClassSwitcher
                classes={state.classes}
                currentId={state.currentClassId}
                onSelect={actions.setCurrent}
                onManage={() => setManagerOpen(true)}
              />
              <ModeTabs mode={state.mode} onChange={actions.setMode} />
            </div>
          </>
        )}
      </div>

      {!currentClass ? (
        <EmptyState onCreate={() => setManagerOpen(true)} />
      ) : (
        <>
          {/* <main> and the mode wrapper keep the same element type/position in
              both layouts, so the active picker component (and its current pick)
              survives the fullscreen toggle — fullscreen is just an enlargement. */}
          <main className={presenting ? 'flex-1 flex flex-col' : 'grid gap-4 lg:grid-cols-[1fr_280px]'}>
            <div className={presenting
              ? 'min-w-0 flex flex-col flex-1 [&>.stage]:flex-1 [&>.stage]:min-h-[calc(100dvh-6rem)]'
              : 'min-w-0'}>
              {renderMode(currentClass)}
            </div>

            {!presenting && (
              <aside className="flex flex-col gap-4">
                <RecentlyPicked
                  klass={currentClass}
                  classState={currentClassState}
                  onUndo={() => actions.undoPick(currentClass.id)}
                />
                {!coarsePointer && <ShortcutsCard />}
              </aside>
            )}
          </main>

          {!presenting && (heatMapAllowed ? (
            <HeatMap
              klass={currentClass}
              classState={currentClassState}
              settings={state.settings}
              onResetCounts={() => actions.resetCounts(currentClass.id)}
              onToggleExclude={(sid) => actions.toggleExclude(currentClass.id, sid)}
              onIncludeAll={() => actions.setAllIncluded(currentClass.id, true)}
            />
          ) : (
            <HeatMapLocked onUpgrade={() => requireUpgrade('heatmap')} />
          ))}
        </>
      )}

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={state.settings}
        onChange={actions.updateSettings}
        isPremium={isPremium}
        license={license}
        onUpgrade={() => requireUpgrade('general')}
        onDeactivate={deactivate}
      />
      <ClassManager
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
        classes={state.classes}
        currentId={state.currentClassId}
        onSelectClass={actions.setCurrent}
        onAddClass={handleAddClass}
        onRenameClass={actions.renameClass}
        onDeleteClass={actions.deleteClass}
        onAddStudents={handleAddStudents}
        onRemoveStudent={actions.removeStudent}
        onRenameStudent={actions.renameStudent}
        onToggleExclude={actions.toggleExclude}
        onSetAllIncluded={actions.setAllIncluded}
        onImport={handleImport}
        fullState={state}
        isPremium={isPremium}
        classLimit={FREE_CLASS_LIMIT}
        studentLimit={FREE_STUDENT_LIMIT}
        onRequireUpgrade={requireUpgrade}
      />

      <UpgradeModal
        open={upgrade.open}
        reason={upgrade.reason}
        onClose={() => setUpgrade((u) => ({ ...u, open: false }))}
      />

      <PWAToasts />
    </div>
  );
}

function ShortcutsCard() {
  return (
    <div className="card text-xs flex flex-col gap-1.5 opacity-90">
      <h3 className="text-sm font-semibold opacity-70 mb-0.5">Shortcuts</h3>
      <Row k="Space" label="Pick / spin" />
      <Row k="X" label="Remove student" />
      <Row k="R" label="Reset names" />
      <Row k="1–4" label="Switch mode" />
      <Row k="F" label="Fullscreen" />
    </div>
  );
}

function Row({ k, label }: { k: string; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="opacity-70">{label}</span>
      <kbd className="kbd">{k}</kbd>
    </div>
  );
}
