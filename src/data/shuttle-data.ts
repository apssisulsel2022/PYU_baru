export interface PickupPoint {
  id: string;
  label: string;
  name: string;
  order: number;
  minutesFromStart: number;
  coords: [number, number];
}

export interface Trip {
  id: string;
  routeName: string;
  departureTime: string;
  basePrice: number;
  totalSeats: number;
  bookedSeats: number[];
  driverId?: string;
  driverName: string;
  driverPhone: string;
  vehiclePlate: string;
  vehicleType?: string;
  departureDate?: string | null;
  estimatedCompletion?: string | null;
  actualCompletion?: string | null;
  createdAt?: string;
}

export interface Booking {
  id?: string;
  tripId: string;
  pickupPoint: PickupPoint;
  seatNumber: number;
  date: string;
  destination?: string;
  totalPrice: number;
  passengerName: string;
  passengerPhone: string;
  status?: string;
  bookedAt?: string;
  ticketNumber?: string;
}

export const DESTINATIONS = [
  "Bandung",
  "Jakarta",
  "Surabaya",
  "Yogyakarta",
  "Semarang",
];

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
}

export type CellType = "seat" | "driver" | "empty" | "baggage" | "baggage_roof";

export interface VehicleLayout {
  label: string;
  totalSeats: number;
  rows: CellType[][];
}

export const VEHICLE_LAYOUTS: Record<string, VehicleLayout> = {
  minibus: {
    label: "Mini Bus",
    totalSeats: 3,
    rows: [
      ["seat", "empty", "driver"],
      ["seat", "seat", "empty"],
      ["baggage", "baggage", "baggage"],
    ],
  },
  minibus_roof: {
    label: "Mini Bus + Roof Rack",
    totalSeats: 5,
    rows: [
      ["seat", "empty", "driver"],
      ["seat", "seat", "empty"],
      ["seat", "seat", "empty"],
      ["baggage_roof", "baggage_roof", "baggage_roof"],
    ],
  },
  hiace: {
    label: "HiAce",
    totalSeats: 10,
    rows: [
      ["seat", "empty", "driver"],
      ["seat", "seat", "seat"],
      ["seat", "seat", "seat"],
      ["seat", "seat", "seat"],
      ["baggage", "baggage", "baggage"],
    ],
  },
};

export function getPickupTime(departureTime: string, pickup: PickupPoint): string {
  const [h, m] = departureTime.split(":").map(Number);
  const totalMin = h * 60 + m + pickup.minutesFromStart;
  const newH = Math.floor(totalMin / 60) % 24;
  const newM = totalMin % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}
