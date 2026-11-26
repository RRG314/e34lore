"use client";
import {track} from "../analytics/client";
import { useEffect, useRef, type ReactNode } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Bookmark,
  BookOpen,
  Layers,
  Wrench,
  Users,
  Car,
  CheckCircle2,
  AlertTriangle,
  X,
  Settings,
  Disc,
  Wind,
  Zap,
  Thermometer,
} from "lucide-react";
import { useApp, saveBookmark } from "./context";
import { ShareControls } from "./ShareControls";
import { DocumentLink } from "./DocumentLink";
export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const icons: Record<string, typeof Wrench> = {
    wrench: Wrench,
    book: BookOpen,
    layers: Layers,
    users: Users,
    car: Car,
    thermometer: Thermometer,
    engine: Settings,
    suspension: Settings,
    disc: Disc,
    bolt: Zap,
    gear: Settings,
    fan: Wind,
  };
  const I = icons[name] || Wrench;
  return <I size={size} strokeWidth={1.6} aria-hidden="true" />;
}
export function PageIntro({
  eyebrow,
  title,
  description,
  children,
  share = true,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
  share?: boolean;
}) {
  return (
    <div className="page-intro">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {(children||share)&&<div className="page-intro-actions">
        {children}
        {share&&<ShareControls title={title} />}
      </div>}
    </div>
  );
}
export function Tag({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={"tag " + tone}>{children}</span>;
}
export function SaveButton({
  kind,
  id,
  title,
}: {
  kind: "guide" | "part" | "article" | "thread";
  id: string;
  title: string;
}) {
  const { requireAuth, toast, authReady } = useApp();
  return (
    <button
      disabled={!authReady}
      className="icon-button"
      aria-label={"Save " + title}
      title="Save to My Garage"
      onClick={async () => {
        if (!requireAuth()) return;
        try {
          await saveBookmark(kind, id, title);
          if(kind==='guide')track('guide_save','/guides/'+id);
          toast("Saved to My Garage.");
        } catch (e) {
          toast((e as Error).message);
        }
      }}
    >
      <Bookmark size={18} />
    </button>
  );
}
export function LinkArrow({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <DocumentLink href={href} className={"text-link " + className}>
      {children}
      <ArrowUpRight size={17} />
    </DocumentLink>
  );
}
export function Notice({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <div className={"notice " + tone}>
      {tone === "warning" ? (
        <AlertTriangle size={18} />
      ) : (
        <CheckCircle2 size={18} />
      )}
      <div>{children}</div>
    </div>
  );
}
export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-mark">＋</span>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const d = ref.current;
    const f = () => onClose();
    d?.addEventListener("cancel", f);
    return () => d?.removeEventListener("cancel", f);
  }, [onClose]);
  return (
    <dialog
      ref={ref}
      className={wide ? "modal modal-wide" : "modal"}
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function PrimaryLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a className="button primary" href={href}>
      {children}
      <ArrowRight size={17} />
    </a>
  );
}
