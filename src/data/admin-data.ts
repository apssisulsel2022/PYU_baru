export interface Driver {
  id: string;
  name: string;
  phone: string;
  plate: string;
  status: "active" | "inactive" | "on-trip";
  rating: number;
  totalTrips: number;
}

export interface BookingRecord {
  id: string;
  tripId: string;
  passengerName: string;
  passengerPhone: string;
  pickupPointId: string;
  seatNumber: number;
  date: string;
  totalPrice: number;
  status: "paid" | "completed" | "cancelled";
  bookedAt: string;
}
