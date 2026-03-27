import React, { createContext, useContext, useState, ReactNode } from "react";
import { Booking, PickupPoint } from "@/data/shuttle-data";

interface BookingState {
  pickupPoint: PickupPoint | null;
  destination: string;
  date: Date | undefined;
  selectedTripId: string | null;
  selectedSeat: number | null;
  booking: Booking | null;
}

interface BookingContextType extends BookingState {
  setPickupPoint: (p: PickupPoint | null) => void;
  setDestination: (d: string) => void;
  setDate: (d: Date | undefined) => void;
  setSelectedTripId: (id: string | null) => void;
  setSelectedSeat: (s: number | null) => void;
  setBooking: (b: Booking | null) => void;
  reset: () => void;
}

const initial: BookingState = {
  pickupPoint: null,
  destination: "",
  date: undefined,
  selectedTripId: null,
  selectedSeat: null,
  booking: null,
};

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BookingState>(initial);

  const update = (partial: Partial<BookingState>) => setState((s) => ({ ...s, ...partial }));

  return (
    <BookingContext.Provider
      value={{
        ...state,
        setPickupPoint: (pickupPoint) => update({ pickupPoint }),
        setDestination: (destination) => update({ destination }),
        setDate: (date) => update({ date }),
        setSelectedTripId: (selectedTripId) => update({ selectedTripId }),
        setSelectedSeat: (selectedSeat) => update({ selectedSeat }),
        setBooking: (booking) => update({ booking }),
        reset: () => setState(initial),
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be inside BookingProvider");
  return ctx;
}
