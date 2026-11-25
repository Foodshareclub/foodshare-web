import {
  formatListingAuthorLabel,
  formatListingAuthorName,
  formatProfileFullName,
  showsFullAuthorName,
  splitVolunteerTitle,
} from "@/lib/data/author-display";
import { describe, expect, it } from "bun:test";

const denis = { id: "u1", first_name: "Denis ", second_name: " Yarmoshko", nickname: "den" };

describe("author-display: full name for volunteer listings only", () => {
  it("applies the full-name rule to volunteer listings and nothing else", () => {
    expect(showsFullAuthorName("volunteer")).toBe(true);
    for (const type of ["food", "fridge", "foodbank", "business", null, undefined]) {
      expect(showsFullAuthorName(type)).toBe(false);
    }
  });

  it("builds the full name from first and second name, trimmed", () => {
    expect(formatProfileFullName(denis)).toBe("Denis Yarmoshko");
    expect(formatProfileFullName({ id: "u", first_name: "Solo", second_name: "" })).toBe("Solo");
    expect(formatProfileFullName({ id: "u", first_name: "", second_name: null, nickname: " nick " })).toBe("nick");
    expect(formatProfileFullName({ id: "u" })).toBe("Community Member");
    expect(formatProfileFullName(null)).toBe("Community Member");
  });

  it("keeps surnames out of non-volunteer listings", () => {
    expect(formatListingAuthorName("volunteer", denis)).toBe("Denis Yarmoshko");
    expect(formatListingAuthorName("food", denis)).toBe("Denis");
    expect(formatListingAuthorName(undefined, denis)).toBe("Denis");
  });

  it("renders a resolved author_name by listing type", () => {
    expect(formatListingAuthorLabel("volunteer", "Denis Yarmoshko")).toBe("Denis Yarmoshko");
    expect(formatListingAuthorLabel("volunteer", "  ")).toBe("Community Member");
    expect(formatListingAuthorLabel("food", "Denis Yarmoshko")).toBe("Denis");
    expect(formatListingAuthorLabel("food", null)).toBe("Community Member");
  });
});

describe("splitVolunteerTitle", () => {
  it("uses the profile name and the role title", () => {
    expect(splitVolunteerTitle("IT Teammate", "Denis Yarmoshko")).toEqual({
      name: "Denis Yarmoshko",
      headline: "IT Teammate",
    });
  });

  it("drops a name baked into post_name when it is the author's own", () => {
    expect(splitVolunteerTitle("Denis Yarmoshko - FoodShare Founder", "Denis Yarmoshko")).toEqual({
      name: "Denis Yarmoshko",
      headline: "FoodShare Founder",
    });
    expect(splitVolunteerTitle("Sarah M. - Community Food Rescuer", "Sarah Miller")).toEqual({
      name: "Sarah Miller",
      headline: "Community Food Rescuer",
    });
  });

  it("keeps a role that merely contains a dash", () => {
    expect(splitVolunteerTitle("Driver - weekends", "Denis Yarmoshko")).toEqual({
      name: "Denis Yarmoshko",
      headline: "Driver - weekends",
    });
  });

  it("falls back to the legacy 'Name - Headline' split without an author name", () => {
    expect(splitVolunteerTitle("Sarah Connor - Chef", null)).toEqual({ name: "Sarah Connor", headline: "Chef" });
    expect(splitVolunteerTitle("Sarah Connor - Chef", "Community Member")).toEqual({
      name: "Sarah Connor",
      headline: "Chef",
    });
    expect(splitVolunteerTitle("Nurhayat", undefined)).toEqual({ name: "Nurhayat", headline: null });
    expect(splitVolunteerTitle("", undefined)).toEqual({ name: "Volunteer", headline: null });
  });
});
