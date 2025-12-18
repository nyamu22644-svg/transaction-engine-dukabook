import { create } from 'zustand';

export interface StoreState {
  currentStore: any;
  setCurrentStore: (store: any) => void;
}

export const useStore = create<StoreState>((set) => ({
  currentStore: null,
  setCurrentStore: (store) => set({ currentStore: store }),
}));
