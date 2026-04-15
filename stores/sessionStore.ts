import { create } from 'zustand';
import type { ActiveSession } from '../types/session';

type SessionUpdater = Partial<ActiveSession> | ((prev: ActiveSession) => ActiveSession);

interface SessionState {
  activeSession: ActiveSession | null;
  startSession: (session: ActiveSession) => void;
  updateSession: (updater: SessionUpdater) => void;
  endSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  activeSession: null,
  startSession: (session) => set({ activeSession: session }),
  updateSession: (updater) =>
    set((state) => {
      if (!state.activeSession) return state;
      const next = typeof updater === 'function'
        ? updater(state.activeSession)
        : { ...state.activeSession, ...updater };
      return { activeSession: next };
    }),
  endSession: () => set({ activeSession: null }),
}));
