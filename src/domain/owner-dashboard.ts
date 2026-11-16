import { z } from "zod";

const count = z.number().int().nonnegative();
const displayName = z.string().nullable().optional();
export const contentReportSchema = z.object({
  id: z.string(),
  target_type: z.string(),
  target_id: z.string(),
  status: z.string(),
  reason: z.string(),
});
const photo = z.object({
  id: z.string(),
  object_path: z.string(),
  caption: z.string(),
  alt_text: z.string(),
  width: count,
  height: count,
  state: z.string(),
  car_title: z.string(),
  car_owner: z.string(),
  garage_id: z.string(),
  review_reason: z.string().nullable().optional(),
});

/** Match the bounded owner_dashboard RPC; reject incomplete responses rather
 * than rendering an empty or partially authorized dashboard. */
export const ownerDashboardSchema = z.object({
  counts: z.object({
    members: count,
    discussions: count,
    replies: count,
    shared_cars: count,
    pending_photos: count,
    open_reports: count,
    open_appeals: count,
  }),
  usage: z.array(z.object({ day: z.string(), area: z.string(), opens: count })),
  photos: z.array(photo),
  cars: z.array(
    z.object({
      id: z.string(),
      user_id: z.string(),
      model_id: z.string(),
      title: z.string(),
      story: z.string(),
      hidden: z.boolean(),
      published: z.boolean(),
      featured_at: z.string().nullable(),
      display_name: displayName,
    }),
  ),
  threads: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      hidden: z.boolean(),
      locked: z.boolean(),
      display_name: displayName,
    }),
  ),
  reports: z.array(contentReportSchema),
  members: z.array(
    z.object({
      id: z.string(),
      display_name: displayName,
      created_at: z.string(),
    }),
  ),
});
export type OwnerDashboardData = z.infer<typeof ownerDashboardSchema>;

export const reviewDeskSchema = z.object({
  roles: z.array(z.string()),
  reports: z.array(contentReportSchema),
  submissions: z.array(
    z.object({
      id: z.string(),
      target_type: z.string(),
      target_id: z.string(),
      status: z.string(),
      correction: z.string(),
      evidence_url: z.string().nullable(),
      source_post_id: z.string().nullable(),
      source_post_version: z.number().int().nullable(),
    }),
  ),
});
export type ReviewDeskData = z.infer<typeof reviewDeskSchema>;

export const communityModerationSchema = z.object({
  counts: z.object({ threads: count, replies: count, open_reports: count }),
  appeals: z.array(
    z.object({ id: z.string(), user_id: z.string(), body: z.string() }),
  ),
  restrictions: z.array(
    z.object({
      id: z.string(),
      user_id: z.string(),
      kind: z.string(),
      reason: z.string(),
      internal_note: z.string().nullable(),
      expires_at: z.string().nullable(),
      revoked_at: z.string().nullable(),
    }),
  ),
  audit: z.array(
    z.object({
      id: z.union([z.string(), z.number()]),
      action: z.string(),
      record_id: z.string().nullable(),
      metadata: z.object({ reason: z.string().optional() }).nullable(),
      created_at: z.string(),
    }),
  ),
});
export type CommunityModerationData = z.infer<typeof communityModerationSchema>;
