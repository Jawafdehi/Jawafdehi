import { Fragment, lazy, Suspense, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { ArrowLeft, ArrowRight, Check, FileText, Info, Loader2, Lock, Upload, X } from "@/components/icons";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SuccessTick } from "@/components/volunteer-apply/success-tick";
import { agreementHtml, printHtml, VOLUNTEER_AGREEMENT_URL } from "@/components/volunteer-apply/agreement-doc";
import { DocumentPreviewDialog } from "@/components/DocumentPreviewDialog";
import { cn } from "@/lib/utils";
import { adToBS } from "@/utils/bs-calendar";
import { SITE_URL } from "@/utils/seo";
import { JAWAFDEHI_SOCIALS } from "@/config/constants";
import { SignaturePad } from "@/components/volunteer-apply/signature-pad";
import { COPY, toNe, type Copy, type Lang } from "@/components/volunteer-apply/copy";
import { Field } from "@/components/volunteer-apply/field";
import { digitsOf, INPUT_SHAPE, INVALID_RING, LangCtx, REQUIRED, useCopy } from "@/components/volunteer-apply/shared";
import { clearVerification, readVerification } from "@/components/volunteer-apply/verification";
import { submitApplication, uploadIdDocument, type UploadReceipt } from "@/components/volunteer-apply/mock-api";
import { CODE_OF_CONDUCT_URL, DECLARATIONS } from "@/components/volunteer-apply/agreement-text";

const DevPanel = import.meta.env.DEV ? lazy(() => import("@/components/volunteer-apply/dev-panel")) : null;

const LAST_STEP = 5;
const INTEREST_KEYS = ["research", "translation", "writing", "data", "software", "design", "social", "other"] as const;
const ID_KEYS = ["citizenship", "nid", "nrn", "passport"] as const;
const DISCLOSE_KEYS = ["party", "government", "family", "other"] as const;
type IdType = (typeof ID_KEYS)[number];

type FormState = {
  phone: string;
  fullName: string;
  dob: string;
  nationality: string;
  gender: "" | "male" | "female" | "other";
  altPhone: string;
  email: string;
  district: string;
  municipality: string;
  ward: string;
  tole: string;
  currentAddress: string;
  idType: IdType;
  idNumber: string;
  idDistrict: string;
  idCountry: string;
  idIssueDate: string;
  idFront: UploadReceipt | null;
  idBack: UploadReceipt | null;
  interests: string[];
  interestOther: string;
  skills: string;
  hours: string;
  startDate: string;
  why: string;
  coi: string[];
  affiliations: string;
};

const emptyForm = (c: Copy): FormState => ({
  phone: "",
  fullName: "",
  dob: "",
  nationality: c.nationalityDefault,
  gender: "",
  altPhone: "",
  email: "",
  district: "",
  municipality: "",
  ward: "",
  tole: "",
  currentAddress: "",
  idType: "citizenship",
  idNumber: "",
  idDistrict: "",
  idCountry: "",
  idIssueDate: "",
  idFront: null,
  idBack: null,
  interests: [],
  interestOther: "",
  skills: "",
  hours: "",
  startDate: "",
  why: "",
  coi: [],
  affiliations: "",
});

const DRAFT_KEY = "jawafdehi.volunteer-apply.draft";
const PERSISTED: (keyof FormState)[] = [
  "fullName",
  "dob",
  "nationality",
  "gender",
  "email",
  "district",
  "municipality",
  "ward",
  "tole",
  "currentAddress",
  "interests",
  "interestOther",
  "skills",
  "hours",
  "startDate",
  "why",
];

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    return;
  }
}

function readDraft(base: FormState): FormState {
  try {
    const raw: unknown = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "{}");
    if (!raw || typeof raw !== "object") return base;
    const draft = raw as Record<string, unknown>;
    const out = { ...base };
    for (const key of PERSISTED) {
      const v = draft[key];
      if (key === "interests") {
        if (Array.isArray(v))
          out.interests = v
            .filter((x): x is string => INTEREST_KEYS.includes(x as never))
            .slice(0, INTEREST_KEYS.length);
      } else if (key === "gender") {
        if (v === "male" || v === "female" || v === "other") out.gender = v;
      } else if (typeof v === "string" && v.length <= 2000) {
        (out as Record<string, unknown>)[key] = v;
      }
    }
    return out;
  } catch {
    return base;
  }
}

const todayISO = () => new Date().toISOString().slice(0, 10);

function bsString(iso: string, lang: Lang) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  try {
    const bs = adToBS(y, m, d);
    const s = `${bs.year}/${bs.month}/${bs.date}`;
    return lang === "ne" ? toNe(s) : s;
  } catch {
    return "";
  }
}

function adString(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function showDate(iso: string, lang: Lang) {
  if (!iso) return "";
  return lang === "ne" ? `वि.सं. ${bsString(iso, lang)}` : adString(iso);
}

// eslint-disable-next-line no-control-regex
const UNSAFE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F<>]/;
const NAME = /^[\p{L}\p{M}]+(?:[ .'’-]{1,2}[\p{L}\p{M}]+)*\.?$/u;
const PLACE = /^[\p{L}\p{M}\p{N} .,'’()/-]+$/u;

const squash = (v: string) => v.trim().replace(/\s+/g, " ");

const isRealDate = (iso: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
};

const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const ageOn = (dob: string, on = new Date()) => {
  const d = new Date(dob);
  let age = on.getFullYear() - d.getFullYear();
  const m = on.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && on.getDate() < d.getDate())) age -= 1;
  return age;
};

function makeSchemas(c: Copy): Record<number, z.ZodTypeAny> {
  const v = c.v;
  const today = todayISO();
  const text = (max: number) =>
    z
      .string()
      .trim()
      .min(1, REQUIRED)
      .max(max, v.tooLong(max))
      .refine((s) => !UNSAFE.test(s), v.text);
  const optional = (max: number, test: (s: string) => boolean, msg = v.text) =>
    z
      .string()
      .trim()
      .max(max, v.tooLong(max))
      .refine((s) => s === "" || test(s), msg);
  const place = (s: string) => PLACE.test(s);
  const date = (min: string, max: string, early = v.tooOld, late = v.future) =>
    z
      .string()
      .min(1, REQUIRED)
      .refine((s) => !s || isRealDate(s), v.date)
      .refine((s) => !isRealDate(s) || s >= min, early)
      .refine((s) => !isRealDate(s) || s <= max, late);

  return {
    1: z
      .object({
        phone: z.string(),
        fullName: text(100).refine((s) => !s || (NAME.test(squash(s)) && squash(s).includes(" ")), v.name),
        dob: date(addDays(today, -365 * 100), today).refine((s) => !isRealDate(s) || ageOn(s) >= 18, c.under18),
        nationality: text(50).refine((s) => !s || place(s), v.text),
        gender: z.string().refine((s) => ["male", "female", "other"].includes(s), REQUIRED),
        email: text(254).pipe(z.string().email(c.emailInvalid)),
        altPhone: optional(
          20,
          (s) => /^\+?[\d\s-]+$/.test(s) && digitsOf(s).length >= 7 && digitsOf(s).length <= 15,
          v.altPhone,
        ),
        district: optional(60, place),
        municipality: optional(80, place),
        ward: optional(2, (s) => /^\d{1,2}$/.test(s) && +s >= 1 && +s <= 35, v.ward),
        tole: optional(80, place),
        currentAddress: text(200),
      })
      .superRefine((f, ctx) => {
        if (f.altPhone && digitsOf(f.altPhone).endsWith(f.phone))
          ctx.addIssue({ code: "custom", path: ["altPhone"], message: v.altPhone });
      }),
    2: z
      .object({
        dob: z.string(),
        idType: z.enum(ID_KEYS),
        idNumber: text(30),
        idDistrict: z.string().trim().max(40, v.tooLong(40)),
        idCountry: z.string().trim().max(60, v.tooLong(60)),
        idIssueDate: date("1950-01-01", today),
        idFront: z.any().refine((f) => f !== null, REQUIRED),
      })
      .superRefine((f, ctx) => {
        const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
        const n = f.idNumber.trim();
        if (n) {
          if (f.idType === "nid" && !/^\d{10}$/.test(n.replace(/[\s-]/g, ""))) issue("idNumber", v.nid);
          else if (f.idType === "passport" && !/^[A-Za-z0-9]{7,9}$/.test(n)) issue("idNumber", v.passport);
          else if (!/^[0-9०-९A-Za-z][0-9०-९A-Za-z\s/-]{2,29}$/.test(n)) issue("idNumber", v.idNumber);
        }
        if (isRealDate(f.idIssueDate) && isRealDate(f.dob) && f.idIssueDate <= f.dob)
          issue("idIssueDate", v.issueBeforeDob);
        if (f.idType === "citizenship") {
          if (!f.idDistrict.trim()) issue("idDistrict", REQUIRED);
          else if (!place(f.idDistrict.trim())) issue("idDistrict", v.text);
        }
        if (f.idType === "passport") {
          if (!f.idCountry.trim()) issue("idCountry", REQUIRED);
          else if (!place(f.idCountry.trim())) issue("idCountry", v.text);
        }
      }),
    3: z
      .object({
        interests: z
          .array(z.string())
          .min(1, REQUIRED)
          .refine((xs) => xs.every((x) => INTEREST_KEYS.includes(x as never)), REQUIRED),
        interestOther: z.string().trim().max(60, v.tooLong(60)),
        skills: text(1000),
        hours: z
          .string()
          .trim()
          .min(1, REQUIRED)
          .refine((s) => !s || (/^\d{1,2}$/.test(s) && +s >= 1 && +s <= 60), v.hours),
        startDate: date(today, addDays(today, 365), v.start, v.start),
        why: text(1500).refine((s) => !s || s.length >= 20, v.tooShort(20)),
      })
      .superRefine((f, ctx) => {
        if (!f.interests.includes("other")) return;
        const o = f.interestOther.trim();
        if (!o) ctx.addIssue({ code: "custom", path: ["interestOther"], message: REQUIRED });
        else if (UNSAFE.test(o)) ctx.addIssue({ code: "custom", path: ["interestOther"], message: v.text });
      }),
    4: z
      .object({
        coi: z
          .array(z.string())
          .min(1, REQUIRED)
          .refine((xs) => xs.every((x) => x === "none" || DISCLOSE_KEYS.includes(x as never)), REQUIRED)
          .refine((xs) => !(xs.includes("none") && xs.length > 1), REQUIRED),
        affiliations: z.string().trim().max(1000, v.tooLong(1000)),
      })
      .superRefine((f, ctx) => {
        if (f.coi.includes("none") || !f.coi.length) return;
        if (!f.affiliations) ctx.addIssue({ code: "custom", path: ["affiliations"], message: REQUIRED });
        else if (UNSAFE.test(f.affiliations)) ctx.addIssue({ code: "custom", path: ["affiliations"], message: v.text });
      }),
  };
}

type Errors = Partial<Record<keyof FormState, string>>;

function validate(schema: z.ZodTypeAny, data: FormState): Errors {
  const result = schema.safeParse(data);
  if (result.success) return {};
  const errors: Errors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof FormState;
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

function StepHeading({ title, children }: Readonly<{ title: string; children?: ReactNode }>) {
  return (
    <header className="mb-8">
      <h2 className="font-home-display text-xl leading-tight text-primary sm:text-2xl md:text-3xl [:root[lang=ne]_&]:leading-snug">
        {title}
      </h2>
      {children ? (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px] sm:leading-7">{children}</p>
      ) : null}
    </header>
  );
}

function ChoicePill({
  checked,
  onToggle,
  children,
  role = "checkbox",
  invalid,
}: Readonly<{
  checked: boolean;
  onToggle: () => void;
  children: ReactNode;
  role?: "checkbox" | "radio";
  invalid?: boolean;
}>) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={checked}
      onClick={onToggle}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm transition-[color,background-color,border-color,transform] duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:active:scale-100",
        checked
          ? "border-primary-surface bg-primary-surface text-primary-foreground"
          : "border-border bg-background text-primary hover:bg-muted",
        invalid && !checked && INVALID_RING,
      )}
    >
      {checked ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

function StepDots({
  current,
  reached,
  onJump,
}: Readonly<{ current: number; reached: number; onJump: (i: number) => void }>) {
  const { c, lang } = useCopy();
  return (
    <nav aria-label={`${c.stepOf(current, LAST_STEP)}: ${c.steps[current - 1]}`}>
      <ol className="flex items-center gap-1">
        {c.steps.map((name, index) => {
          const i = index + 1;
          const isCurrent = i === current;
          const isDone = i !== current && i <= reached;
          const canJump = isDone;
          const dot = (
            <span
              className={cn(
                "relative block h-1.5 overflow-hidden rounded-full transition-[width,background-color] duration-300 ease-out motion-reduce:transition-none",
                isCurrent
                  ? "w-8 bg-accent"
                  : isDone
                    ? "w-1.5 bg-accent/60 group-hover:bg-accent"
                    : "w-1.5 bg-accent/15",
              )}
            />
          );
          return (
            <li key={name} aria-current={isCurrent ? "step" : undefined}>
              {canJump ? (
                <button
                  type="button"
                  onClick={() => onJump(i)}
                  aria-label={c.goToStep(name)}
                  title={name}
                  className="group flex h-6 min-w-6 items-center justify-center rounded-full px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {dot}
                </button>
              ) : (
                <span className="flex h-6 min-w-6 items-center justify-center px-1" title={name}>
                  <span className="sr-only">
                    {lang === "ne" ? toNe(i) : i}. {name}
                  </span>
                  {dot}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

async function sniffType(file: File): Promise<string | null> {
  const b = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "application/pdf";
  return null;
}

type Shot = "good" | "cropped" | "blurry" | "glare";

function IdSketch({ shot }: Readonly<{ shot: Shot }>) {
  const uid = `${useId().replace(/:/g, "")}-${shot}`;
  const card = (
    <g filter={shot === "blurry" ? `url(#${uid}-blur)` : undefined}>
      <rect x="14" y="12" width="72" height="44" rx="4" className="fill-background stroke-primary/40" strokeWidth="1" />
      <rect x="20" y="19" width="17" height="21" rx="2" className="fill-primary/25" />
      <rect x="42" y="21" width="36" height="3" rx="1.5" className="fill-primary/45" />
      <rect x="42" y="28" width="28" height="3" rx="1.5" className="fill-primary/30" />
      <rect x="42" y="35" width="32" height="3" rx="1.5" className="fill-primary/30" />
      <rect x="20" y="46" width="58" height="3" rx="1.5" className="fill-primary/20" />
    </g>
  );
  return (
    <svg viewBox="0 0 100 68" className="h-auto w-full" aria-hidden="true">
      <defs>
        <clipPath id={`${uid}-clip`}>
          <rect width="100" height="68" rx="6" />
        </clipPath>
        <filter id={`${uid}-blur`}>
          <feGaussianBlur stdDeviation="1.8" />
        </filter>
        <radialGradient id={`${uid}-glare`}>
          <stop offset="0" stopColor="white" stopOpacity="0.95" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g clipPath={`url(#${uid}-clip)`}>
        <rect width="100" height="68" className="fill-muted" />
        {shot === "cropped" ? <g transform="translate(-20 -6) scale(1.5)">{card}</g> : card}
        {shot === "glare" ? <ellipse cx="58" cy="30" rx="26" ry="16" fill={`url(#${uid}-glare)`} /> : null}
      </g>
    </svg>
  );
}

function InfoButton({
  label,
  children,
  className,
}: Readonly<{ label: string; children: ReactNode; className?: string }>) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number>();
  const show = () => {
    window.clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hide = () => {
    closeTimer.current = window.setTimeout(() => setOpen(false), 120);
  };
  const mouse = (fn: () => void) => (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") fn();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Anchor asChild>
        <button
          type="button"
          aria-label={label}
          aria-expanded={open}
          onClick={() => setOpen(true)}
          onPointerEnter={mouse(show)}
          onPointerLeave={mouse(hide)}
          className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Info className="h-4 w-4" aria-hidden="true" />
        </button>
      </PopoverPrimitive.Anchor>
      <PopoverContent
        side="top"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerEnter={mouse(show)}
        onPointerLeave={mouse(hide)}
        className={cn(
          "w-[19rem] origin-[var(--radix-popover-content-transform-origin)] rounded-3xl p-4 duration-150",
          className,
        )}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}

function PhotoGuide({ side }: Readonly<{ side: string }>) {
  const { c } = useCopy();
  const bad: Shot[] = ["cropped", "blurry", "glare"];
  return (
    <InfoButton label={c.photoHelp(side)}>
      <p className="text-sm font-semibold text-primary">{c.photoHelp(side)}</p>
      <figure className="mt-3">
        <div className="relative">
          <IdSketch shot="good" />
          <span className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#1f8a4c] text-white ring-2 ring-background">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </div>
        <figcaption className="mt-2 text-xs text-primary">{c.photoGood}</figcaption>
      </figure>
      <ul className="mt-4 grid grid-cols-3 gap-3">
        {bad.map((shot) => (
          <li key={shot}>
            <div className="relative">
              <IdSketch shot={shot} />
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white ring-2 ring-background">
                <X className="h-3 w-3" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
              {c.photoBad[shot as Exclude<Shot, "good">]}
            </p>
          </li>
        ))}
      </ul>
    </InfoButton>
  );
}

function UploadSlot({
  label,
  value,
  onChange,
  error,
  optional,
}: Readonly<{
  label: string;
  value: UploadReceipt | null;
  onChange: (v: UploadReceipt | null) => void;
  error?: string;
  optional?: boolean;
}>) {
  const { c } = useCopy();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setLocalError(null);
    if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type)) {
      setLocalError(c.badType);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setLocalError(c.tooBig);
      return;
    }
    if (file.size < 1024 || (await sniffType(file)) !== file.type) {
      setLocalError(c.v.fakeFile);
      return;
    }
    setBusy(true);
    setPreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
    const receipt = await uploadIdDocument(file);
    setBusy(false);
    onChange(receipt);
  };

  const shownError = localError ?? error;

  return (
    <Field
      label={label}
      error={shownError}
      optional={optional}
      required={!optional}
      extra={<PhotoGuide side={label} />}
    >
      {value ? (
        <div className="flex items-center gap-4 rounded-xl border border-border bg-background p-3">
          {preview ? (
            <img src={preview} alt="" className="h-16 w-24 rounded-md object-cover blur-[2px]" />
          ) : (
            <span className="flex h-16 w-24 items-center justify-center rounded-md bg-muted">
              <FileText className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-medium text-primary">{value.name}</p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3 w-3 shrink-0" aria-hidden="true" /> {c.uploaded}
            </p>
          </div>
          <button
            type="button"
            aria-label={c.removeFile}
            onClick={() => {
              onChange(null);
              setPreview(null);
            }}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void pick(e.dataTransfer.files[0]);
          }}
          disabled={busy}
          aria-invalid={shownError ? true : undefined}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed bg-background/60 px-4 py-8 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            shownError ? INVALID_RING : "border-border hover:border-primary/40 hover:bg-muted/50",
          )}
        >
          {busy ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
              <span className="text-primary">{c.uploading}</span>
            </>
          ) : (
            <>
              <Upload className="h-6 w-6 text-primary" aria-hidden="true" />
              <span className="text-primary">{c.uploadCta}</span>
              <span className="text-xs text-muted-foreground">{c.uploadFormats}</span>
            </>
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => void pick(e.target.files?.[0])}
      />
    </Field>
  );
}

function roleTitle(f: FormState) {
  const names: string[] = INTEREST_KEYS.filter((k) => f.interests.includes(k) && k !== "other").map(
    (k) => COPY.en.interestNames[k],
  );
  if (f.interests.includes("other") && f.interestOther.trim()) names.push(f.interestOther.trim());
  return names.length ? `Volunteer — ${names.join(", ")}` : "Volunteer";
}

type DocKey = "agreement" | "coc";

function SignStep({
  form,
  onEdit,
  onSigned,
  devSkip,
}: Readonly<{
  form: FormState;
  onEdit: (step: number) => void;
  onSigned: (signature: string) => void;
  devSkip?: boolean;
}>) {
  const { c, lang } = useCopy();
  const [declared, setDeclared] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [mode, setMode] = useState<"draw" | "type">("type");
  const [doc, setDoc] = useState<DocKey | null>(null);
  const [drawn, setDrawn] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  const typedOk = typed.trim().length > 0 && typed.trim().toLowerCase() === form.fullName.trim().toLowerCase();
  const signed = mode === "draw" ? drawn : typedOk ? `typed:${typed.trim()}` : null;
  const signature = signed ?? (devSkip ? `typed:${form.fullName || "Dev Tester"}` : null);
  const ready = devSkip || (declared && agreed && signed !== null);
  const interestNames = INTEREST_KEYS.filter((k) => form.interests.includes(k)).map((k) =>
    k === "other" && form.interestOther.trim() ? form.interestOther.trim() : c.interestNames[k],
  );

  const summary: { step: number; title: string; rows: [string, string][] }[] = [
    {
      step: 1,
      title: c.sumYou,
      rows: [
        [c.rowName, form.fullName],
        [c.rowDob, showDate(form.dob, lang)],
        [c.rowEmail, form.email],
        [c.rowAddress, form.currentAddress],
      ],
    },
    {
      step: 2,
      title: c.sumId,
      rows: [
        [c.rowDoc, `${c.idTypes[form.idType].name} · ${form.idNumber}`],
        [c.rowUploaded, [form.idFront?.name, form.idBack?.name].filter(Boolean).join(", ")],
      ],
    },
    {
      step: 3,
      title: c.sumHelp,
      rows: [
        [c.rowRole, interestNames.join(", ")],
        [c.rowHours, lang === "ne" ? toNe(form.hours) : form.hours],
        [c.rowStart, showDate(form.startDate, lang)],
      ],
    },
    {
      step: 4,
      title: c.sumDisclose,
      rows: [
        [
          c.rowAffiliations,
          form.coi.includes("none")
            ? c.noneValue
            : [
                DISCLOSE_KEYS.filter((k) => form.coi.includes(k))
                  .map((k) => c.discloseItems[DISCLOSE_KEYS.indexOf(k)])
                  .join("; "),
                form.affiliations,
              ]
                .filter(Boolean)
                .join(". "),
        ],
      ],
    },
  ];

  const sectionTitle = "mb-3 text-lg font-semibold text-primary";
  const pdfs: Record<DocKey, { title: string; url: string }> = {
    agreement: { title: c.agreementHeading, url: VOLUNTEER_AGREEMENT_URL },
    coc: { title: c.codeOfConduct, url: CODE_OF_CONDUCT_URL },
  };
  const pages = [
    { href: "/privacy/", title: c.privacyPolicy },
    { href: "/terms/", title: c.termsOfService },
  ];
  const rowClass =
    "flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left text-sm text-primary transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:text-[15px]";

  return (
    <div>
      <StepHeading title={c.signTitle}>{c.signLede}</StepHeading>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="divide-y divide-border rounded-3xl border border-border">
            {summary.map((s) => (
              <section key={s.title} aria-label={s.title} className="px-5 py-4 sm:px-6 sm:py-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-primary">{s.title}</h3>
                  <button
                    type="button"
                    onClick={() => onEdit(s.step)}
                    aria-label={c.editSection(s.title)}
                    className="-mr-2 rounded-full px-2 py-1 text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {c.edit}
                  </button>
                </div>
                <dl className="mt-2 grid grid-cols-[minmax(6.5rem,8.5rem)_1fr] gap-x-4 gap-y-1.5 text-sm">
                  {s.rows.map(([k, v]) => (
                    <Fragment key={k}>
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="min-w-0 break-words text-primary">{v || "—"}</dd>
                    </Fragment>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </div>

        <div>
          <section>
            <h3 className={sectionTitle}>{c.documents}</h3>
            <ul className="divide-y divide-border overflow-hidden rounded-3xl border border-border">
              {(Object.keys(pdfs) as DocKey[]).map((key) => (
                <li key={key}>
                  <button type="button" onClick={() => setDoc(key)} className={rowClass}>
                    {pdfs[key].title}
                    <span className="shrink-0 text-sm text-muted-foreground">{c.read}</span>
                  </button>
                </li>
              ))}
              {pages.map((pg) => (
                <li key={pg.href}>
                  <a href={pg.href} target="_blank" rel="noopener noreferrer" className={rowClass}>
                    {pg.title}
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {c.read}
                      <span className="sr-only"> ({c.opensNewTab})</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            {c.agreementLangNote ? (
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{c.agreementLangNote}</p>
            ) : null}
          </section>

          <section className="mt-10">
            <h3 className={sectionTitle}>{c.declaration}</h3>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-primary marker:text-muted-foreground">
              {DECLARATIONS.map((d) => (
                <li key={d.en}>{d[lang]}</li>
              ))}
            </ol>
            <div className="mt-4 space-y-1">
              {[
                { text: c.confirmAll, checked: declared, set: setDeclared },
                { text: c.agreeStatement, checked: agreed, set: setAgreed },
              ].map((row) => (
                <label
                  key={row.text}
                  className="flex cursor-pointer items-start gap-3 py-2 text-sm leading-6 text-primary sm:text-[15px]"
                >
                  <Checkbox checked={row.checked} onCheckedChange={(v) => row.set(v === true)} className="mt-1" />
                  <span>{row.text}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <h3 className="text-lg font-semibold text-primary">{c.yourSignature}</h3>
                <InfoButton label={c.esignInfo}>
                  <p className="text-sm font-semibold text-primary">{c.esignInfo}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{c.esignNote}</p>
                  <p className="mt-2 text-sm text-primary">
                    {c.date}: {showDate(todayISO(), lang)}
                  </p>
                </InfoButton>
              </div>
              <div role="tablist" aria-label={c.yourSignature} className="flex rounded-full bg-muted p-1 text-sm">
                {(["type", "draw"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={mode === m}
                    onClick={() => setMode(m)}
                    className={cn(
                      "rounded-full px-4 py-1.5 transition-colors",
                      mode === m ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-primary",
                    )}
                  >
                    {m === "draw" ? c.draw : c.type}
                  </button>
                ))}
              </div>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              {c.signingAs} <span className="font-medium text-primary">{form.fullName}</span> · +977 {form.phone}
            </p>
            {mode === "draw" ? (
              <SignaturePad
                label={c.yourSignature}
                placeholder={c.signHere}
                clearLabel={c.clearSignature}
                onChange={setDrawn}
              />
            ) : (
              <Field
                label={c.typeName}
                htmlFor="typed-sig"
                error={typed && !typedOk ? c.mustMatch(form.fullName) : undefined}
              >
                <Input
                  id="typed-sig"
                  value={typed}
                  maxLength={100}
                  autoComplete="off"
                  onChange={(e) => setTyped(e.target.value)}
                  className="h-14 rounded-full px-6 font-[cursive] text-xl sm:text-2xl"
                  placeholder={form.fullName}
                />
              </Field>
            )}
          </section>

          <Button
            type="button"
            size="lg"
            disabled={!ready || busy}
            onClick={() => {
              if (!signature) return;
              setBusy(true);
              onSigned(signature);
            }}
            className="mt-8 w-full gap-2 rounded-full"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {c.signBtn}
          </Button>
          {!ready ? <p className="mt-2 text-center text-xs text-muted-foreground">{c.signGate}</p> : null}
        </div>
      </div>

      <DocumentPreviewDialog
        open={doc !== null}
        onOpenChange={(open) => (open ? undefined : setDoc(null))}
        document={doc ? { title: pdfs[doc].title, type: "pdf", url: pdfs[doc].url } : null}
      />
    </div>
  );
}

function downloadSignedCopy(form: FormState, signature: string, reference: string) {
  const address =
    [form.tole, form.ward && `Ward ${form.ward}`, form.municipality, form.district].filter(Boolean).join(", ") ||
    form.currentAddress;
  printHtml(
    agreementHtml({
      origin: window.location.origin,
      signature,
      reference,
      party: {
        fullName: squash(form.fullName),
        idLabel: COPY.en.idTypes[form.idType].name,
        idNumber: form.idNumber,
        address,
        phone: form.phone,
        email: form.email,
        role: roleTitle(form),
        hours: form.hours,
        startDate: isRealDate(form.startDate) ? form.startDate : "",
      },
    }),
  );
}

const REQUIRED_KEYS = new Set<keyof FormState>([
  "fullName",
  "dob",
  "nationality",
  "gender",
  "email",
  "currentAddress",
  "idNumber",
  "idIssueDate",
  "idDistrict",
  "idCountry",
  "idFront",
  "interests",
  "interestOther",
  "skills",
  "hours",
  "startDate",
  "why",
  "coi",
  "affiliations",
]);

const MAX_LENGTH: Partial<Record<keyof FormState, number>> = {
  fullName: 100,
  nationality: 50,
  email: 254,
  altPhone: 20,
  district: 60,
  municipality: 80,
  ward: 2,
  tole: 80,
  currentAddress: 200,
  idNumber: 30,
  idDistrict: 40,
  idCountry: 60,
  interestOther: 60,
  skills: 1000,
  hours: 2,
  why: 1500,
  affiliations: 1000,
};

const DEV_SKIP_KEY = "jawafdehi.volunteer-apply.dev-skip";

const VolunteerApply = () => {
  const { i18n } = useTranslation();
  const lang: Lang = i18n.language?.startsWith("ne") ? "ne" : "en";
  const c = COPY[lang];
  const ctx = useMemo(() => ({ c, lang }), [c, lang]);

  const navigate = useNavigate();
  const [verification] = useState(readVerification);
  const [step, setStep] = useState(1);
  const [reached, setReached] = useState(1);
  const [form, setForm] = useState<FormState>(() => {
    const base = typeof window === "undefined" ? emptyForm(c) : readDraft(emptyForm(c));
    return { ...base, phone: verification?.phone ?? "" };
  });
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState<{ reference: string; signature: string } | null>(null);
  const [editing, setEditing] = useState<{ step: number; before: FormState } | null>(null);
  const [devSkip, setDevSkip] = useState(() => {
    if (!import.meta.env.DEV || typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(DEV_SKIP_KEY) === "1";
    } catch {
      return false;
    }
  });
  const schemas = useMemo(() => makeSchemas(c), [c]);

  useEffect(() => setReached((r) => Math.max(r, step)), [step]);

  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(Object.fromEntries(PERSISTED.map((k) => [k, form[k]]))));
    } catch {
      return;
    }
  }, [form]);

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: "instant" });
  }, [step, done]);

  useEffect(() => setErrors({}), [lang]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const check = (n: number) => {
    const schema = schemas[n];
    if (!schema || devSkip) return true;
    const errs = validate(schema, form);
    setErrors(errs);
    if (!Object.keys(errs).length) return true;
    setTimeout(() => {
      const first = document.querySelector<HTMLElement>('[aria-invalid="true"]');
      first?.scrollIntoView({ block: "center", behavior: "smooth" });
      first?.focus({ preventScroll: true });
    }, 0);
    return false;
  };

  const next = () => {
    if (check(step)) setStep((s) => Math.min(s + 1, LAST_STEP));
  };
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const saveEdit = () => {
    if (editing && check(editing.step)) setEditing(null);
  };
  const cancelEdit = () => {
    if (editing) setForm(editing.before);
    setErrors({});
    setEditing(null);
  };

  const ringIf = (key: keyof FormState) => (errors[key] ? INVALID_RING : undefined);
  const req = (key: keyof FormState) => REQUIRED_KEYS.has(key);

  const text = (key: keyof FormState, props: React.ComponentProps<typeof Input> = {}) => (
    <Input
      id={key}
      value={form[key] as string}
      maxLength={MAX_LENGTH[key]}
      onChange={(e) => set(key, e.target.value as never)}
      aria-invalid={errors[key] ? true : undefined}
      aria-required={req(key) || undefined}
      {...props}
      className={cn(INPUT_SHAPE, ringIf(key), props.className)}
    />
  );

  const area = (key: keyof FormState, rows: number) => (
    <Textarea
      id={key}
      rows={rows}
      value={form[key] as string}
      maxLength={MAX_LENGTH[key]}
      onChange={(e) => set(key, e.target.value as never)}
      aria-invalid={errors[key] ? true : undefined}
      aria-required={req(key) || undefined}
      className={cn("rounded-3xl px-5 py-3 text-base", ringIf(key))}
    />
  );

  const fields = (n: number) => {
    if (n === 1)
      return (
        <>
          <div className="grid gap-5 max-sm:grid-cols-2 max-sm:gap-x-3 sm:grid-cols-2">
            <Field label={c.fullName} htmlFor="fullName" error={errors.fullName} className="col-span-2" required>
              {text("fullName", { autoComplete: "name" })}
            </Field>
            <Field label={c.dob} htmlFor="dob" error={errors.dob} required>
              {text("dob", { type: "date", max: todayISO(), min: "1900-01-01", autoComplete: "bday" })}
            </Field>
            <Field label={c.nationality} htmlFor="nationality" error={errors.nationality} required>
              {text("nationality")}
            </Field>
            <Field label={c.gender} error={errors.gender} className="col-span-2" required>
              <div role="radiogroup" aria-invalid={errors.gender ? true : undefined} className="flex flex-wrap gap-2">
                {(["male", "female", "other"] as const).map((k) => (
                  <ChoicePill
                    key={k}
                    role="radio"
                    invalid={Boolean(errors.gender)}
                    checked={form.gender === k}
                    onToggle={() => set("gender", k)}
                  >
                    {c.genders[k]}
                  </ChoicePill>
                ))}
              </div>
            </Field>
            <Field label={c.email} htmlFor="email" error={errors.email} className="max-sm:col-span-2" required>
              {text("email", { type: "email", autoComplete: "email", inputMode: "email" })}
            </Field>
            <Field label={c.altPhone} htmlFor="altPhone" error={errors.altPhone} className="max-sm:col-span-2" optional>
              {text("altPhone", { type: "tel", inputMode: "tel" })}
            </Field>
          </div>

          <fieldset className="mt-8">
            <legend className="text-sm font-semibold text-primary">{c.permanentAddress}</legend>
            <div className="mt-3 grid gap-5 sm:grid-cols-2">
              <Field label={c.district} htmlFor="district" error={errors.district} optional>
                {text("district")}
              </Field>
              <Field label={c.municipality} htmlFor="municipality" error={errors.municipality} optional>
                {text("municipality")}
              </Field>
              <Field label={c.ward} htmlFor="ward" error={errors.ward} optional>
                {text("ward", { inputMode: "numeric" })}
              </Field>
              <Field label={c.tole} htmlFor="tole" error={errors.tole} optional>
                {text("tole")}
              </Field>
            </div>
          </fieldset>
          <Field
            label={c.currentAddress}
            htmlFor="currentAddress"
            error={errors.currentAddress}
            className="mt-5"
            required
          >
            {area("currentAddress", 2)}
          </Field>
        </>
      );

    if (n === 2)
      return (
        <>
          <Field label={c.docType} className="mb-5" required>
            <div role="radiogroup" className="flex flex-wrap gap-2">
              {ID_KEYS.map((k) => (
                <ChoicePill key={k} role="radio" checked={form.idType === k} onToggle={() => set("idType", k)}>
                  {c.idTypes[k].name}
                </ChoicePill>
              ))}
            </div>
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={c.idTypes[form.idType].number} htmlFor="idNumber" error={errors.idNumber} required>
              {text("idNumber", { autoComplete: "off", spellCheck: false })}
            </Field>
            <Field label={c.issueDate} htmlFor="idIssueDate" error={errors.idIssueDate} required>
              {text("idIssueDate", { type: "date", max: todayISO(), min: "1950-01-01" })}
            </Field>
            {form.idType === "citizenship" ? (
              <Field label={c.issueDistrict} htmlFor="idDistrict" error={errors.idDistrict} required>
                {text("idDistrict")}
              </Field>
            ) : null}
            {form.idType === "passport" ? (
              <Field label={c.issueCountry} htmlFor="idCountry" error={errors.idCountry} required>
                {text("idCountry")}
              </Field>
            ) : null}
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <UploadSlot
              label={c.front}
              value={form.idFront}
              onChange={(v) => set("idFront", v)}
              error={errors.idFront}
            />
            <UploadSlot label={c.backSide} value={form.idBack} onChange={(v) => set("idBack", v)} optional />
          </div>
        </>
      );

    if (n === 3)
      return (
        <>
          <Field label={c.interests} error={errors.interests} required>
            <div className="flex flex-wrap gap-2" role="group" aria-invalid={errors.interests ? true : undefined}>
              {INTEREST_KEYS.map((k) => (
                <ChoicePill
                  key={k}
                  invalid={Boolean(errors.interests)}
                  checked={form.interests.includes(k)}
                  onToggle={() =>
                    set(
                      "interests",
                      form.interests.includes(k) ? form.interests.filter((x) => x !== k) : [...form.interests, k],
                    )
                  }
                >
                  {c.interestNames[k]}
                </ChoicePill>
              ))}
            </div>
          </Field>
          {form.interests.includes("other") ? (
            <Field label={c.otherTell} htmlFor="interestOther" error={errors.interestOther} className="mt-4" required>
              {text("interestOther")}
            </Field>
          ) : null}
          <div className="mt-5 grid gap-5 max-sm:grid-cols-2 max-sm:items-end max-sm:gap-x-3 sm:grid-cols-2">
            <Field label={c.skills} htmlFor="skills" error={errors.skills} className="col-span-2" required>
              {area("skills", 3)}
            </Field>
            <Field label={c.hours} htmlFor="hours" error={errors.hours} required>
              {text("hours", { inputMode: "numeric", pattern: "[0-9]*" })}
            </Field>
            <Field label={c.startDate} htmlFor="startDate" error={errors.startDate} required>
              {text("startDate", { type: "date", min: todayISO(), max: addDays(todayISO(), 365) })}
            </Field>
            <Field label={c.why} htmlFor="why" error={errors.why} className="col-span-2" required>
              {area("why", 4)}
            </Field>
          </div>
        </>
      );

    return (
      <>
        <Field label={c.anyApply} error={errors.coi} required>
          <div role="group" aria-invalid={errors.coi ? true : undefined} className="space-y-1">
            {[...DISCLOSE_KEYS, "none" as const].map((k, i) => {
              const checked = form.coi.includes(k);
              const toggle = (on: boolean) => {
                if (k === "none") {
                  set("coi", on ? ["none"] : []);
                  if (on) set("affiliations", "");
                } else {
                  const rest = form.coi.filter((x) => x !== k && x !== "none");
                  set("coi", on ? [...rest, k] : rest);
                }
              };
              return (
                <label
                  key={k}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 py-1.5 text-sm leading-6 text-primary sm:text-[15px]",
                    k === "none" && "mt-3",
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(on) => toggle(on === true)}
                    className={cn("mt-1", errors.coi && INVALID_RING)}
                  />
                  {k === "none" ? c.noneApply : c.discloseItems[i]}
                </label>
              );
            })}
          </div>
        </Field>
        {form.coi.some((x) => x !== "none") ? (
          <Field label={c.discloseDetails} htmlFor="affiliations" error={errors.affiliations} className="mt-5" required>
            {area("affiliations", 5)}
          </Field>
        ) : null}
      </>
    );
  };

  const stepBar = (onContinue?: () => void) => (
    <div className="mt-10 grid grid-cols-2 items-center gap-y-5 sm:grid-cols-[1fr_auto_1fr]">
      <div className="col-span-2 row-start-1 justify-self-center sm:col-span-1 sm:col-start-2">
        <StepDots current={step} reached={devSkip ? LAST_STEP : reached} onJump={setStep} />
      </div>
      <div className="row-start-2 justify-self-start sm:col-start-1 sm:row-start-1">
        {step >= 2 ? (
          <Button type="button" variant="ghost" onClick={back} className="gap-2 rounded-full">
            <ArrowLeft className="h-4 w-4" /> {c.backBtn}
          </Button>
        ) : null}
      </div>
      <div className="row-start-2 justify-self-end sm:col-start-3 sm:row-start-1">
        {onContinue ? (
          <Button type="button" size="lg" onClick={onContinue} className="gap-2 rounded-full">
            {c.continue} <ArrowRight className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );

  const stepTitles: Record<number, ReactNode> = {
    1: <StepHeading title={c.youTitle} />,
    2: <StepHeading title={c.idTitle} />,
    3: <StepHeading title={c.helpTitle} />,
    4: <StepHeading title={c.discloseTitle}>{c.discloseLede}</StepHeading>,
  };

  if (!verification && !done) return <Navigate to="/volunteer/?apply=1" replace />;

  return (
    <LangCtx.Provider value={ctx}>
      <div className="min-h-screen bg-background">
        <Seo title={c.pageTitle} description={c.title} canonicalUrl={`${SITE_URL}/volunteer/apply/`} />
        <div className="layout-container pb-16 pt-10 md:pb-24 md:pt-14">
          <div className="max-w-5xl">
            <Link
              to="/volunteer/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {c.back}
            </Link>
            <h1 className="font-home-display mb-8 mt-4 whitespace-nowrap text-[clamp(1.25rem,6.6vw,1.875rem)] sm:whitespace-normal sm:text-4xl [:root[lang=ne]_&]:whitespace-normal md:mb-12 md:mt-5 leading-tight text-primary md:text-5xl [:root[lang=ne]_&]:leading-snug">
              {c.title}
            </h1>

            <div
              key={step}
              className="duration-200 ease-out animate-in fade-in-0 slide-in-from-bottom-2 motion-reduce:animate-none"
            >
              <>
                {step >= 1 && step <= 4 ? (
                  <div>
                    {stepTitles[step]}
                    {fields(step)}
                    {stepBar(next)}
                  </div>
                ) : null}

                {step === 5 ? (
                  <>
                    <SignStep
                      form={form}
                      devSkip={devSkip}
                      onEdit={(n) => {
                        setErrors({});
                        setEditing({ step: n, before: form });
                      }}
                      onSigned={async (signature) => {
                        const { reference } = await submitApplication({ ...form, signature });
                        clearDraft();
                        clearVerification();
                        setDone({ reference, signature });
                      }}
                    />
                    {stepBar()}
                  </>
                ) : null}
              </>
            </div>
          </div>
        </div>

        <Dialog open={done !== null} onOpenChange={(open) => (open ? undefined : navigate("/volunteer/"))}>
          <DialogContent className="max-h-[92vh] w-[calc(100%-2rem)] max-w-md overflow-y-auto overflow-x-hidden rounded-3xl p-6 sm:rounded-3xl md:p-8 [&>*]:min-w-0">
            {done ? (
              <>
                <DialogHeader className="items-center space-y-3 text-center sm:text-center">
                  <SuccessTick className="h-20 w-20" />
                  <DialogTitle className="font-home-display text-2xl text-primary sm:text-3xl">
                    {c.thanks(squash(form.fullName).split(" ")[0])}
                  </DialogTitle>
                  <DialogDescription className="text-sm leading-6 text-muted-foreground sm:text-[15px] sm:leading-7">
                    {c.submitted(form.email.trim())}
                  </DialogDescription>
                </DialogHeader>
                <ol className="mt-2 space-y-4 rounded-3xl bg-muted/50 p-5">
                  {c.nextSteps.map(([t, d], i) => (
                    <li key={t} className="flex gap-3">
                      <span
                        className={cn(
                          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs",
                          i === 0
                            ? "bg-primary-surface text-primary-foreground"
                            : "bg-background ring-1 ring-border text-primary",
                        )}
                      >
                        {i === 0 ? <Check className="h-3.5 w-3.5" /> : lang === "ne" ? toNe(i + 1) : i + 1}
                      </span>
                      <span className="text-sm">
                        <strong className="font-medium text-primary">{t}</strong>
                        <span className="block text-muted-foreground">{d}</span>
                      </span>
                    </li>
                  ))}
                </ol>
                <div className="mt-2 flex flex-col gap-2">
                  <Button
                    size="lg"
                    className="w-full gap-2 rounded-full"
                    onClick={() => downloadSignedCopy(form, done.signature, done.reference)}
                  >
                    <FileText className="h-4 w-4" /> {c.download}
                  </Button>
                  <Button asChild variant="outline" size="lg" className="w-full rounded-full">
                    <Link to="/">{c.home}</Link>
                  </Button>
                </div>
                <p className="mt-1 text-center text-sm leading-6 text-muted-foreground">
                  {c.wrongNumber}
                  <br />
                  <a
                    href={JAWAFDEHI_SOCIALS.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-4"
                  >
                    {c.messageUs}
                  </a>
                </p>
              </>
            ) : null}
          </DialogContent>
        </Dialog>

        <Dialog open={editing !== null} onOpenChange={(open) => (open ? undefined : cancelEdit())}>
          <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-3xl p-6 sm:rounded-3xl md:p-8">
            <DialogHeader>
              <DialogTitle className="font-home-display text-xl text-primary sm:text-2xl">
                {editing ? c.editSection(c.steps[editing.step - 1]) : ""}
              </DialogTitle>
            </DialogHeader>
            {editing ? <div className="mt-2">{fields(editing.step)}</div> : null}
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" className="rounded-full" onClick={cancelEdit}>
                {c.cancel}
              </Button>
              <Button type="button" className="rounded-full" onClick={saveEdit}>
                {c.save}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {DevPanel ? (
          <Suspense fallback={null}>
            <DevPanel
              skip={devSkip}
              onSkipChange={(on) => {
                setDevSkip(on);
                setErrors({});
                try {
                  sessionStorage.setItem(DEV_SKIP_KEY, on ? "1" : "0");
                } catch {
                  return;
                }
              }}
              onFill={(sample) => {
                setForm((f) => ({ ...f, ...sample }));
                setErrors({});
              }}
            />
          </Suspense>
        ) : null}
      </div>
    </LangCtx.Provider>
  );
};

export default VolunteerApply;
