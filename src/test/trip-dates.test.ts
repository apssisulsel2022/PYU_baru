import { describe, it, expect } from "vitest";
import { format, isBefore, startOfDay, parseISO, addDays, subDays } from "date-fns";

// Mocking some logic that we implemented in TripsManagement.tsx
const validateTripDates = (departureDate: string, estimatedCompletion: string) => {
  const today = startOfDay(new Date());
  const depDate = startOfDay(new Date(departureDate));
  const estDate = startOfDay(new Date(estimatedCompletion));

  if (isBefore(depDate, today)) {
    return { valid: false, message: "Departure date cannot be in the past" };
  }

  if (isBefore(estDate, depDate)) {
    return { valid: false, message: "Estimated completion date cannot be before departure date" };
  }

  return { valid: true };
};

const formatDisplayDate = (dateStr: string) => {
  return format(parseISO(dateStr), "dd/MM/yyyy");
};

describe("Trip Date Management Logic", () => {
  describe("Validation", () => {
    it("should fail if departure date is in the past", () => {
      const pastDate = format(subDays(new Date(), 1), "yyyy-MM-dd");
      const futureDate = format(addDays(new Date(), 1), "yyyy-MM-dd");
      
      const result = validateTripDates(pastDate, futureDate);
      expect(result.valid).toBe(false);
      expect(result.message).toBe("Departure date cannot be in the past");
    });

    it("should pass if departure date is today or in the future", () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const futureDate = format(addDays(new Date(), 1), "yyyy-MM-dd");
      
      const resultToday = validateTripDates(today, futureDate);
      expect(resultToday.valid).toBe(true);
      
      const resultFuture = validateTripDates(futureDate, addDays(new Date(), 2).toISOString());
      expect(resultFuture.valid).toBe(true);
    });

    it("should fail if estimated completion is before departure", () => {
      const departure = format(addDays(new Date(), 2), "yyyy-MM-dd");
      const estimated = format(addDays(new Date(), 1), "yyyy-MM-dd");
      
      const result = validateTripDates(departure, estimated);
      expect(result.valid).toBe(false);
      expect(result.message).toBe("Estimated completion date cannot be before departure date");
    });

    it("should pass if estimated completion is same as departure", () => {
      const departure = format(addDays(new Date(), 2), "yyyy-MM-dd");
      
      const result = validateTripDates(departure, departure);
      expect(result.valid).toBe(true);
    });
  });

  describe("Formatting", () => {
    it("should format ISO dates to DD/MM/YYYY correctly", () => {
      const isoDate = "2026-12-25T10:00:00Z";
      expect(formatDisplayDate(isoDate)).toBe("25/12/2026");
    });

    it("should handle leap years correctly", () => {
      const leapDay = "2024-02-29T12:00:00Z";
      expect(formatDisplayDate(leapDay)).toBe("29/02/2024");
    });
  });

  describe("Timezone Handling (ISO 8601)", () => {
    it("should store and parse UTC dates consistently", () => {
      const dateStr = "2026-03-27";
      const isoWithTime = new Date(dateStr).toISOString();
      
      // Ensure the ISO string includes the date part correctly
      expect(isoWithTime).toContain("2026-03-27");
      
      // Ensure parsing it back gives the same day regardless of local time
      const parsed = parseISO(isoWithTime);
      expect(format(parsed, "yyyy-MM-dd")).toBe("2026-03-27");
    });
  });
});
