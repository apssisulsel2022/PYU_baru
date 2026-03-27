import { describe, it, expect } from "vitest";
import { toTrip, DbTrip, DbDriver } from "../hooks/use-supabase-data";

describe("use-supabase-data mapping functions", () => {
  it("toTrip should correctly map DbTrip to UI Trip object", () => {
    const mockDriver: DbDriver = {
      id: "driver-1",
      name: "Budi Driver",
      phone: "0812345678",
      plate: "D 1234 ABC",
      status: "online",
      rating: 4.8,
      total_trips: 150,
      created_at: "2026-01-01T00:00:00Z",
      service_type: null,
      approval_status: "approved",
    };

    const mockDbTrip: DbTrip = {
      id: "trip-1",
      route_name: "Bandung - Jakarta",
      departure_time: "08:00",
      base_price: 150000,
      total_seats: 10,
      booked_seats: [1, 2],
      driver_id: "driver-1",
      vehicle_type: "hiace",
      departure_date: "2026-03-27T08:00:00Z",
      estimated_completion: "2026-03-27T11:00:00Z",
      actual_completion: null,
      created_at: "2026-03-26T00:00:00Z",
      driver: mockDriver
    };

    const result = toTrip(mockDbTrip);

    expect(result.id).toBe("trip-1");
    expect(result.routeName).toBe("Bandung - Jakarta");
    expect(result.driverName).toBe("Budi Driver");
    expect(result.vehiclePlate).toBe("D 1234 ABC");
    expect(result.departureDate).toBe("2026-03-27T08:00:00Z");
    expect(result.bookedSeats).toHaveLength(2);
  });

  it("toTrip should handle missing driver information", () => {
    const mockDbTrip: DbTrip = {
      id: "trip-2",
      route_name: "Jakarta - Bandung",
      departure_time: "14:00",
      base_price: 150000,
      total_seats: 10,
      booked_seats: [],
      driver_id: null,
      vehicle_type: "hiace",
      departure_date: null,
      estimated_completion: null,
      actual_completion: null,
      created_at: "2026-03-26T00:00:00Z",
      driver: null
    };

    const result = toTrip(mockDbTrip);

    expect(result.driverName).toBe("");
    expect(result.vehiclePlate).toBe("");
    expect(result.departureDate).toBeNull();
  });
});
