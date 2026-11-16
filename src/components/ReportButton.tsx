"use client";
import { useState } from "react";
import { Flag } from "lucide-react";
import { db, useApp } from "./context";
import { Modal } from "./common";
export function ReportButton({
  type,
  id,
}: {
  type: "thread" | "post" | "garage" | "journal" | "photo" | "build";
  id: string;
}) {
  const [open, setOpen] = useState(false);
  const { requireAuth, toast } = useApp();
  return (
    <>
      <button
        className="text-link muted"
        aria-label="Report content"
        onClick={() => {
          if (requireAuth()) setOpen(true);
        }}
      >
        <Flag size={13} />
        Report
      </button>
      {open && (
        <Modal title="Report to moderation" onClose={() => setOpen(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const { error } = await db.from("reports").insert({
                target_type: type,
                target_id: id,
                reason: f.get("reason"),
              });
              if (error) toast(error.message);
              else {
                toast("Report sent to moderation.");
                setOpen(false);
              }
            }}
          >
            <label>
              Reason
              <textarea
                name="reason"
                required
                minLength={10}
                maxLength={2000}
                rows={5}
              />
            </label>
            <button className="button primary">Submit report</button>
          </form>
        </Modal>
      )}
    </>
  );
}
