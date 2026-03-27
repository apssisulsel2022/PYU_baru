import { describe, it, expect } from "vitest";
import { toPickupPoint, DbPickupPoint } from "../hooks/use-supabase-data";

describe("Pickup Points data mapping", () => {
  it("toPickupPoint should correctly map DbPickupPoint with Rayon information", () => {
    const mockDbPoint: DbPickupPoint = {
      id: "point-1",
      label: "A",
      name: "Pasteur Point",
      address: "Jl. Pasteur No. 123",
      phone: "0812345678",
      operating_hours: "08:00 - 22:00",
      order_index: 1,
      minutes_from_start: 15,
      lat: -6.2088,
      lng: 106.8456,
      is_active: true,
      rayon_id: "rayon-1",
      capacity: 20,
      deleted_at: null
    };

    const result = toPickupPoint(mockDbPoint);

    expect(result.id).toBe("point-1");
    expect(result.name).toBe("Pasteur Point");
    expect(result.rayonId).toBe("rayon-1");
    expect(result.capacity).toBe(20);
    expect(result.isActive).toBe(true);
    expect(result.coords).toEqual([-6.2088, 106.8456]);
  });

  it("toPickupPoint should handle default values for optional fields", () => {
    const mockDbPoint: DbPickupPoint = {
      id: "point-2",
      label: "B",
      name: "Cihampelas",
      order_index: 2,
      minutes_from_start: 30,
      lat: -6.2100,
      lng: 106.8500,
      rayon_id: null
    };

    const result = toPickupPoint(mockDbPoint);

    expect(result.address).toBe("");
    expect(result.phone).toBe("");
    expect(result.operatingHours).toBe("");
    expect(result.isActive).toBe(true);
    expect(result.capacity).toBe(0);
    expect(result.rayonId).toBeNull();
  });
});
