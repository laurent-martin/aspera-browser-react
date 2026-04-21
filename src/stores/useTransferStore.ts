import { create } from 'zustand';
import type { TransferInfo } from '../types';

interface TransferState {
    transfers: TransferInfo[];
    addTransfer: (transfer: TransferInfo) => void;
    updateTransfer: (uuid: string, transfer: Partial<TransferInfo>) => void;
    removeTransfer: (uuid: string) => void;
    clearInactiveTransfers: () => void;
}

export const useTransferStore = create<TransferState>((set) => ({
    transfers: [],
    addTransfer: (transfer) =>
        set((state) => ({
            transfers: [...state.transfers, transfer],
        })),
    updateTransfer: (uuid, updatedTransfer) =>
        set((state) => ({
            transfers: state.transfers.map((t) =>
                t.uuid === uuid ? { ...t, ...updatedTransfer } : t
            ),
        })),
    removeTransfer: (uuid) =>
        set((state) => ({
            transfers: state.transfers.filter((t) => t.uuid !== uuid),
        })),
    clearInactiveTransfers: () =>
        set((state) => ({
            transfers: state.transfers.filter((t) => t.status === 'running'),
        })),
}));

