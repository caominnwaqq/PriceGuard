import type { PostPricesResponse } from "@priceguard/shared";
import { create } from "zustand";

type State = {
  data: PostPricesResponse | null;
  loading: boolean;
  error: string | null;
  setData: (d: PostPricesResponse | null) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
};

export const usePriceStore = create<State>((set) => ({
  data: null,
  loading: true,
  error: null,
  setData: (data) => set({ data }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
