// The site's icons: Phosphor, light weight, behind the names the code has
// always used (they began as Lucide's), so a call site reads <Search />,
// <ChevronDown /> and so on. Chosen over Lucide with the dev icon switch:
// Phosphor's softer, rounder glyphs sit better with the thin type and pills.
//
// Phosphor draws inside more padding than Lucide did, so every icon is scaled
// up 18% (a transform: layout and hit areas keep their size). An icon styled
// `fill-current` takes Phosphor's fill weight, the solid shape it meant.
// Phosphor ignores stroke widths, so strokeWidth is accepted and dropped.
//
// The drawings come from icon-paths.ts, generated from @phosphor-icons/react by
// scripts/gen-icon-paths.mjs, rather than from Phosphor's components: each of
// those ships all six weights, and only light and fill are ever drawn here, so
// importing them cost ~60 KB gzip of first-paint JS. After adding an icon
// below, run `node scripts/gen-icon-paths.mjs`.
import { forwardRef } from "react";
import type { ForwardRefExoticComponent, RefAttributes, SVGProps } from "react";
import { ICON_PATHS } from "@/components/icon-paths";

import { cn } from "@/lib/utils";

export type IconProps = Omit<SVGProps<SVGSVGElement>, "ref"> & {
  size?: number | string;
  strokeWidth?: number | string;
  absoluteStrokeWidth?: boolean;
  color?: string;
};
export type IconComponent = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;

function make(glyph: string, name: string): IconComponent {
  const [light, fill] = ICON_PATHS[glyph];
  const Icon = forwardRef<SVGSVGElement, IconProps>(function SiteIcon(
    { className, size = 24, color, strokeWidth: _strokeWidth, absoluteStrokeWidth: _absolute, ...rest },
    ref,
  ) {
    const filled = /(^|\s)fill-current(\s|$)/.test(className ?? "");
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 256 256"
        fill={color ?? "currentColor"}
        className={cn("scale-[1.18]", className)}
        {...rest}
        // Phosphor's own markup, generated at build time (icon-paths.ts).
        dangerouslySetInnerHTML={{ __html: filled ? fill : light }}
      />
    );
  });
  Icon.displayName = name;
  return Icon;
}

export const AlertCircle = make("WarningCircle", "AlertCircle");
export const AlertTriangle = make("Warning", "AlertTriangle");
export const Archive = make("Archive", "Archive");
export const ArrowDown = make("ArrowDown", "ArrowDown");
export const ArrowLeft = make("ArrowLeft", "ArrowLeft");
export const ArrowRight = make("ArrowRight", "ArrowRight");
export const ArrowUp = make("ArrowUp", "ArrowUp");
export const ArrowUpDown = make("ArrowsDownUp", "ArrowUpDown");
export const ArrowUpRight = make("ArrowUpRight", "ArrowUpRight");
export const BarChart3 = make("ChartBar", "BarChart3");
export const BookOpen = make("BookOpen", "BookOpen");
export const Bot = make("Robot", "Bot");
export const Braces = make("BracketsCurly", "Braces");
export const BriefcaseBusiness = make("Briefcase", "BriefcaseBusiness");
export const Building2 = make("Building", "Building2");
export const Calendar = make("Calendar", "Calendar");
export const CalendarCheck = make("CalendarCheck", "CalendarCheck");
export const CalendarDays = make("CalendarDots", "CalendarDays");
export const CalendarIcon = make("Calendar", "CalendarIcon");
export const Check = make("Check", "Check");
export const CheckCircle2 = make("CheckCircle", "CheckCircle2");
export const ChevronDown = make("CaretDown", "ChevronDown");
export const ChevronLeft = make("CaretLeft", "ChevronLeft");
export const ChevronRight = make("CaretRight", "ChevronRight");
export const ChevronUp = make("CaretUp", "ChevronUp");
export const Circle = make("Circle", "Circle");
export const CircleX = make("XCircle", "CircleX");
export const ClipboardCheck = make("ClipboardText", "ClipboardCheck");
export const Clock = make("Clock", "Clock");
export const Code2 = make("Code", "Code2");
export const Columns3 = make("Columns", "Columns3");
export const Coins = make("Coins", "Coins");
export const Copy = make("Copy", "Copy");
export const CreditCard = make("CreditCard", "CreditCard");
export const Database = make("Database", "Database");
export const Download = make("Download", "Download");
export const ExternalLink = make("ArrowSquareOut", "ExternalLink");
export const Eye = make("Eye", "Eye");
export const Facebook = make("FacebookLogo", "Facebook");
export const FileCheck2 = make("SealCheck", "FileCheck2");
export const FileDown = make("FileArrowDown", "FileDown");
export const FileEdit = make("NotePencil", "FileEdit");
export const FileJson = make("FileCode", "FileJson");
export const FilePlus2 = make("FilePlus", "FilePlus2");
export const FileSearch = make("FileMagnifyingGlass", "FileSearch");
export const FileSpreadsheet = make("FileXls", "FileSpreadsheet");
export const FileText = make("FileText", "FileText");
export const FileType = make("FileTxt", "FileType");
export const FileWarning = make("FileX", "FileWarning");
export const Files = make("Files", "Files");
export const Filter = make("Funnel", "Filter");
export const Flag = make("Flag", "Flag");
export const FlaskConical = make("Flask", "FlaskConical");
export const Folder = make("Folder", "Folder");
export const Gavel = make("Gavel", "Gavel");
export const GitBranch = make("GitBranch", "GitBranch");
export const GitMerge = make("GitMerge", "GitMerge");
export const Github = make("GithubLogo", "Github");
export const Globe = make("Globe", "Globe");
export const GraduationCap = make("GraduationCap", "GraduationCap");
export const HandHeart = make("HandHeart", "HandHeart");
export const Handshake = make("Handshake", "Handshake");
export const Hash = make("Hash", "Hash");
export const Headphones = make("Headphones", "Headphones");
export const HeartHandshake = make("HandHeart", "HeartHandshake");
export const HelpCircle = make("Question", "HelpCircle");
export const History = make("ClockCounterClockwise", "History");
export const Home = make("House", "Home");
export const IdCard = make("IdentificationCard", "IdCard");
export const Inbox = make("Tray", "Inbox");
export const InfinityIcon = make("Infinity", "InfinityIcon");
export const Info = make("Info", "Info");
export const Instagram = make("InstagramLogo", "Instagram");
export const Landmark = make("Bank", "Landmark");
export const Laptop = make("Laptop", "Laptop");
export const LayoutDashboard = make("SquaresFour", "LayoutDashboard");
export const LayoutGrid = make("GridFour", "LayoutGrid");
export const Library = make("Books", "Library");
export const Link = make("Link", "Link");
export const Link2 = make("Link", "Link2");
export const Linkedin = make("LinkedinLogo", "Linkedin");
export const List = make("List", "List");
export const Loader2 = make("SpinnerGap", "Loader2");
export const Lock = make("Lock", "Lock");
export const LogOut = make("SignOut", "LogOut");
export const Mail = make("Envelope", "Mail");
export const MapPin = make("MapPin", "MapPin");
export const Maximize2 = make("ArrowsOut", "Maximize2");
export const Megaphone = make("Megaphone", "Megaphone");
export const Menu = make("List", "Menu");
export const MessageCircle = make("ChatCircle", "MessageCircle");
export const MessageSquare = make("ChatCenteredText", "MessageSquare");
export const MessagesSquare = make("Chats", "MessagesSquare");
export const Mic2 = make("Microphone", "Mic2");
export const Minus = make("Minus", "Minus");
export const MoreHorizontal = make("DotsThree", "MoreHorizontal");
export const Network = make("Network", "Network");
export const Newspaper = make("Newspaper", "Newspaper");
export const Package = make("Package", "Package");
export const PanelLeft = make("SidebarSimple", "PanelLeft");
export const Paperclip = make("Paperclip", "Paperclip");
export const PauseCircle = make("PauseCircle", "PauseCircle");
export const Pencil = make("Pencil", "Pencil");
export const Phone = make("Phone", "Phone");
export const Play = make("Play", "Play");
export const Plus = make("Plus", "Plus");
export const Printer = make("Printer", "Printer");
export const QrCode = make("QrCode", "QrCode");
export const RefreshCw = make("ArrowsClockwise", "RefreshCw");
export const Repeat = make("Repeat", "Repeat");
export const Save = make("FloppyDisk", "Save");
export const Scale = make("Scales", "Scale");
export const ScrollText = make("Scroll", "ScrollText");
export const Search = make("MagnifyingGlass", "Search");
export const Send = make("PaperPlaneTilt", "Send");
export const Share2 = make("Share", "Share2");
export const ShieldAlert = make("ShieldWarning", "ShieldAlert");
export const ShieldCheck = make("ShieldCheck", "ShieldCheck");
export const SlidersHorizontal = make("SlidersHorizontal", "SlidersHorizontal");
export const Plug = make("PlugsConnected", "Plug");
export const Sparkles = make("Sparkle", "Sparkles");
export const SquarePen = make("PencilSimple", "SquarePen");
export const Tag = make("Tag", "Tag");
export const Trash2 = make("Trash", "Trash2");
export const Twitter = make("TwitterLogo", "Twitter");
export const Undo2 = make("ArrowUUpLeft", "Undo2");
export const Unlock = make("LockOpen", "Unlock");
export const Upload = make("Upload", "Upload");
export const User = make("User", "User");
export const UserPlus = make("UserPlus", "UserPlus");
export const UserRound = make("User", "UserRound");
export const Users = make("Users", "Users");
export const Video = make("Video", "Video");
export const Vote = make("CheckSquare", "Vote");
export const X = make("X", "X");
export const XCircle = make("XCircle", "XCircle");
export const Youtube = make("YoutubeLogo", "Youtube");
