// src/store/vehicleStore.js
import { create } from "zustand";

export const useVehicleStore = create((set) => ({
  vehiclePositions: {}, // { agentId: progressIndex }
  setVehiclePositions: (updater) =>
    set((state) => ({
      vehiclePositions: typeof updater === "function"
        ? updater(state.vehiclePositions)
        : { ...state.vehiclePositions, ...updater },
    })),
}));
