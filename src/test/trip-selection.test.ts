import { describe, it, expect } from "vitest";

interface PickupPoint {
  id: string;
  name: string;
  rayonId: string;
}

const validateTripSelection = (rayonId: string, pickupPointId: string, availablePoints: PickupPoint[]) => {
  if (!rayonId || !pickupPointId) {
    return { valid: false, message: "Please fill all required fields including Rayon and Pickup Point" };
  }

  const selectedPoint = availablePoints.find(p => p.id === pickupPointId);
  if (!selectedPoint || selectedPoint.rayonId !== rayonId) {
    return { valid: false, message: "Invalid Pickup Point for the selected Rayon" };
  }

  return { valid: true };
};

describe("Trip Selection and Validation Logic", () => {
  const mockPoints: PickupPoint[] = [
    { id: "p1", name: "Point A1", rayonId: "r1" },
    { id: "p2", name: "Point A2", rayonId: "r1" },
    { id: "p3", name: "Point B1", rayonId: "r2" },
  ];

  it("should fail if rayon is not selected", () => {
    const result = validateTripSelection("", "p1", mockPoints);
    expect(result.valid).toBe(false);
    expect(result.message).toContain("Please fill all required fields");
  });

  it("should fail if pickup point is not selected", () => {
    const result = validateTripSelection("r1", "", mockPoints);
    expect(result.valid).toBe(false);
    expect(result.message).toContain("Please fill all required fields");
  });

  it("should fail if pickup point does not belong to selected rayon", () => {
    const result = validateTripSelection("r1", "p3", mockPoints); // p3 belongs to r2
    expect(result.valid).toBe(false);
    expect(result.message).toBe("Invalid Pickup Point for the selected Rayon");
  });

  it("should pass if pickup point belongs to selected rayon", () => {
    const result = validateTripSelection("r1", "p1", mockPoints);
    expect(result.valid).toBe(true);
  });

  it("should pass for another valid combination", () => {
    const result = validateTripSelection("r2", "p3", mockPoints);
    expect(result.valid).toBe(true);
  });

  it("should allow valid trip with rayon and start point", () => {
    const trip = {
      rayon_id: "rayon-1",
      start_pickup_point_id: "point-1",
      budget: 500000
    };

    // Simulating frontend validation logic
    const isValid = !!trip.rayon_id && !!trip.start_pickup_point_id && trip.budget >= 0;
    expect(isValid).toBe(true);
  });

  it("should fail if budget is negative", () => {
    const trip = {
      rayon_id: "rayon-1",
      start_pickup_point_id: "point-1",
      budget: -100
    };

    const isValid = !!trip.rayon_id && !!trip.start_pickup_point_id && trip.budget >= 0;
    expect(isValid).toBe(false);
  });
});
