import { describe, expect, it } from "vitest";
import {
  communityModerationSchema,
  ownerDashboardSchema,
  reviewDeskSchema,
} from "../src/domain/owner-dashboard";

const empty = {
  counts: {
    members: 1,
    discussions: 0,
    replies: 0,
    shared_cars: 0,
    pending_photos: 0,
    open_reports: 0,
    open_appeals: 0,
  },
  usage: [],
  photos: [],
  cars: [],
  threads: [],
  reports: [],
  members: [],
};
describe("owner dashboard response contract", () => {
  it("supports the real empty community without inventing activity", () => {
    expect(ownerDashboardSchema.parse(empty).counts.members).toBe(1);
    expect(ownerDashboardSchema.parse(empty).photos).toEqual([]);
  });
  it("rejects denied, missing and malformed responses", () => {
    for (const value of [
      null,
      {},
      { ...empty, photos: null },
      { ...empty, counts: { ...empty.counts, pending_photos: -1 } },
    ]) {
      expect(ownerDashboardSchema.safeParse(value).success).toBe(false);
    }
  });
  it("preserves review evidence and public car attribution", () => {
    const parsed = ownerDashboardSchema.parse({
      ...empty,
      photos: [
        {
          id: "photo",
          object_path: "fixture/photo.jpg",
          caption: "Restoration",
          alt_text: "E34 Touring",
          width: 1200,
          height: 800,
          state: "pending",
          car_title: "My Touring",
          car_owner: "member",
          garage_id: "car",
          review_reason: null,
        },
      ],
      cars: [
        {
          id: "car",
          user_id: "member",
          title: "My Touring",
          model_id: "525i",
          story: "Restoration journal",
          hidden: false,
          published: true,
          featured_at: null,
          display_name: null,
        },
      ],
    });
    expect(parsed.photos[0].review_reason).toBeNull();
    expect(parsed.cars[0].story).toBe("Restoration journal");
  });
  it("accepts archived correction provenance and an empty staff queue", () => {
    const record = {
      id: "correction",
      target_type: "guide",
      target_id: "m50-water-pump-job-planning",
      status: "pending",
      correction: "Check the installed configuration",
      evidence_url: null,
      source_post_id: null,
      source_post_version: null,
    };
    expect(
      reviewDeskSchema.parse({
        roles: ["admin"],
        reports: [],
        submissions: [record],
      }).submissions[0],
    ).toEqual(record);
    expect(
      reviewDeskSchema.safeParse({
        roles: "admin",
        reports: [],
        submissions: [],
      }).success,
    ).toBe(false);
  });
  it("retains restriction and audit evidence without requiring an active appeal", () => {
    const result = communityModerationSchema.parse({
      counts: { threads: 0, replies: 0, open_reports: 0 },
      appeals: [],
      restrictions: [
        {
          id: "restriction",
          user_id: "fixture",
          kind: "warning",
          reason: "Recorded test evidence",
          internal_note: "",
          expires_at: null,
          revoked_at: null,
        },
      ],
      audit: [
        {
          id: 42,
          action: "community:restrict",
          record_id: "restriction",
          metadata: {
            reason: "Recorded test evidence",
            extra: "server metadata",
          },
          created_at: "2026-11-07T00:00:00Z",
        },
      ],
    });
    expect(result.audit[0].metadata?.reason).toBe("Recorded test evidence");
    expect(result.restrictions[0].expires_at).toBeNull();
  });
});
