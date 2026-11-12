// The site's icons: Phosphor, light weight, behind the names the code has
// always used (they began as Lucide's), so a call site reads <Search />,
// <ChevronDown /> and so on. Chosen over Lucide with the dev icon switch:
// Phosphor's softer, rounder glyphs sit better with the thin type and pills.
//
// Phosphor draws inside more padding than Lucide did, so every icon is scaled
// up 18% (a transform: layout and hit areas keep their size). An icon styled
// `fill-current` takes Phosphor's fill weight, the solid shape it meant.
// Phosphor ignores stroke widths, so strokeWidth is accepted and dropped.
import { forwardRef } from "react";
import type { ForwardRefExoticComponent, RefAttributes, SVGProps } from "react";
import {
  Archive as PhArchive,
  ArrowDown as PhArrowDown,
  ArrowLeft as PhArrowLeft,
  ArrowRight as PhArrowRight,
  ArrowSquareOut as PhArrowSquareOut,
  ArrowUUpLeft as PhArrowUUpLeft,
  ArrowUp as PhArrowUp,
  ArrowUpRight as PhArrowUpRight,
  ArrowsClockwise as PhArrowsClockwise,
  ArrowsDownUp as PhArrowsDownUp,
  ArrowsOut as PhArrowsOut,
  Bank as PhBank,
  BookOpen as PhBookOpen,
  Books as PhBooks,
  BracketsCurly as PhBracketsCurly,
  Briefcase as PhBriefcase,
  Building as PhBuilding,
  Calendar as PhCalendar,
  CalendarCheck as PhCalendarCheck,
  CalendarDots as PhCalendarDots,
  CaretDown as PhCaretDown,
  CaretLeft as PhCaretLeft,
  CaretRight as PhCaretRight,
  CaretUp as PhCaretUp,
  ChartBar as PhChartBar,
  ChatCenteredText as PhChatCenteredText,
  ChatCircle as PhChatCircle,
  Chats as PhChats,
  Check as PhCheck,
  CheckCircle as PhCheckCircle,
  CheckSquare as PhCheckSquare,
  Circle as PhCircle,
  ClipboardText as PhClipboardText,
  Clock as PhClock,
  ClockCounterClockwise as PhClockCounterClockwise,
  Code as PhCode,
  Coins as PhCoins,
  Copy as PhCopy,
  CreditCard as PhCreditCard,
  Database as PhDatabase,
  DotsThree as PhDotsThree,
  Download as PhDownload,
  Envelope as PhEnvelope,
  Eye as PhEye,
  FacebookLogo as PhFacebookLogo,
  FileArrowDown as PhFileArrowDown,
  FileCode as PhFileCode,
  FileMagnifyingGlass as PhFileMagnifyingGlass,
  FilePlus as PhFilePlus,
  FileText as PhFileText,
  FileTxt as PhFileTxt,
  FileX as PhFileX,
  FileXls as PhFileXls,
  Files as PhFiles,
  Flag as PhFlag,
  Flask as PhFlask,
  FloppyDisk as PhFloppyDisk,
  Funnel as PhFunnel,
  Gavel as PhGavel,
  GitBranch as PhGitBranch,
  GitMerge as PhGitMerge,
  GithubLogo as PhGithubLogo,
  Globe as PhGlobe,
  GraduationCap as PhGraduationCap,
  GridFour as PhGridFour,
  HandHeart as PhHandHeart,
  Handshake as PhHandshake,
  Hash as PhHash,
  Headphones as PhHeadphones,
  House as PhHouse,
  IdentificationCard as PhIdentificationCard,
  Infinity as PhInfinity,
  Info as PhInfo,
  InstagramLogo as PhInstagramLogo,
  Laptop as PhLaptop,
  Link as PhLink,
  LinkedinLogo as PhLinkedinLogo,
  List as PhList,
  Lock as PhLock,
  LockOpen as PhLockOpen,
  MagnifyingGlass as PhMagnifyingGlass,
  MapPin as PhMapPin,
  Megaphone as PhMegaphone,
  Microphone as PhMicrophone,
  Minus as PhMinus,
  Network as PhNetwork,
  Newspaper as PhNewspaper,
  NotePencil as PhNotePencil,
  Package as PhPackage,
  PaperPlaneTilt as PhPaperPlaneTilt,
  Paperclip as PhPaperclip,
  PauseCircle as PhPauseCircle,
  Pencil as PhPencil,
  PencilSimple as PhPencilSimple,
  Phone as PhPhone,
  Play as PhPlay,
  Plus as PhPlus,
  Printer as PhPrinter,
  QrCode as PhQrCode,
  Question as PhQuestion,
  Repeat as PhRepeat,
  Robot as PhRobot,
  Scales as PhScales,
  Scroll as PhScroll,
  SealCheck as PhSealCheck,
  Share as PhShare,
  ShieldCheck as PhShieldCheck,
  ShieldWarning as PhShieldWarning,
  SidebarSimple as PhSidebarSimple,
  SignOut as PhSignOut,
  SlidersHorizontal as PhSlidersHorizontal,
  Sparkle as PhSparkle,
  SpinnerGap as PhSpinnerGap,
  SquaresFour as PhSquaresFour,
  Tag as PhTag,
  Trash as PhTrash,
  Tray as PhTray,
  TwitterLogo as PhTwitterLogo,
  Upload as PhUpload,
  User as PhUser,
  UserPlus as PhUserPlus,
  Users as PhUsers,
  Video as PhVideo,
  Warning as PhWarning,
  WarningCircle as PhWarningCircle,
  X as PhX,
  XCircle as PhXCircle,
  YoutubeLogo as PhYoutubeLogo,
} from "@phosphor-icons/react";
import type { Icon as PhosphorIcon, IconProps as PhosphorProps } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

export type IconProps = Omit<SVGProps<SVGSVGElement>, "ref"> & {
  size?: number | string;
  strokeWidth?: number | string;
  absoluteStrokeWidth?: boolean;
  color?: string;
};
export type IconComponent = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;

function make(Glyph: PhosphorIcon, name: string): IconComponent {
  const Icon = forwardRef<SVGSVGElement, IconProps>(function SiteIcon(
    { className, size = 24, strokeWidth: _strokeWidth, absoluteStrokeWidth: _absolute, ...rest },
    ref,
  ) {
    const filled = /(^|\s)fill-current(\s|$)/.test(className ?? "");
    return (
      <Glyph
        ref={ref}
        size={size}
        weight={filled ? "fill" : "light"}
        className={cn("scale-[1.18]", className)}
        {...(rest as PhosphorProps)}
      />
    );
  });
  Icon.displayName = name;
  return Icon;
}

export const AlertCircle = make(PhWarningCircle, "AlertCircle");
export const AlertTriangle = make(PhWarning, "AlertTriangle");
export const Archive = make(PhArchive, "Archive");
export const ArrowDown = make(PhArrowDown, "ArrowDown");
export const ArrowLeft = make(PhArrowLeft, "ArrowLeft");
export const ArrowRight = make(PhArrowRight, "ArrowRight");
export const ArrowUp = make(PhArrowUp, "ArrowUp");
export const ArrowUpDown = make(PhArrowsDownUp, "ArrowUpDown");
export const ArrowUpRight = make(PhArrowUpRight, "ArrowUpRight");
export const BarChart3 = make(PhChartBar, "BarChart3");
export const BookOpen = make(PhBookOpen, "BookOpen");
export const Bot = make(PhRobot, "Bot");
export const Braces = make(PhBracketsCurly, "Braces");
export const BriefcaseBusiness = make(PhBriefcase, "BriefcaseBusiness");
export const Building2 = make(PhBuilding, "Building2");
export const Calendar = make(PhCalendar, "Calendar");
export const CalendarCheck = make(PhCalendarCheck, "CalendarCheck");
export const CalendarDays = make(PhCalendarDots, "CalendarDays");
export const CalendarIcon = make(PhCalendar, "CalendarIcon");
export const Check = make(PhCheck, "Check");
export const CheckCircle2 = make(PhCheckCircle, "CheckCircle2");
export const ChevronDown = make(PhCaretDown, "ChevronDown");
export const ChevronLeft = make(PhCaretLeft, "ChevronLeft");
export const ChevronRight = make(PhCaretRight, "ChevronRight");
export const ChevronUp = make(PhCaretUp, "ChevronUp");
export const Circle = make(PhCircle, "Circle");
export const CircleX = make(PhXCircle, "CircleX");
export const ClipboardCheck = make(PhClipboardText, "ClipboardCheck");
export const Clock = make(PhClock, "Clock");
export const Code2 = make(PhCode, "Code2");
export const Coins = make(PhCoins, "Coins");
export const Copy = make(PhCopy, "Copy");
export const CreditCard = make(PhCreditCard, "CreditCard");
export const Database = make(PhDatabase, "Database");
export const Download = make(PhDownload, "Download");
export const ExternalLink = make(PhArrowSquareOut, "ExternalLink");
export const Eye = make(PhEye, "Eye");
export const Facebook = make(PhFacebookLogo, "Facebook");
export const FileCheck2 = make(PhSealCheck, "FileCheck2");
export const FileDown = make(PhFileArrowDown, "FileDown");
export const FileEdit = make(PhNotePencil, "FileEdit");
export const FileJson = make(PhFileCode, "FileJson");
export const FilePlus2 = make(PhFilePlus, "FilePlus2");
export const FileSearch = make(PhFileMagnifyingGlass, "FileSearch");
export const FileSpreadsheet = make(PhFileXls, "FileSpreadsheet");
export const FileText = make(PhFileText, "FileText");
export const FileType = make(PhFileTxt, "FileType");
export const FileWarning = make(PhFileX, "FileWarning");
export const Files = make(PhFiles, "Files");
export const Filter = make(PhFunnel, "Filter");
export const Flag = make(PhFlag, "Flag");
export const FlaskConical = make(PhFlask, "FlaskConical");
export const Gavel = make(PhGavel, "Gavel");
export const GitBranch = make(PhGitBranch, "GitBranch");
export const GitMerge = make(PhGitMerge, "GitMerge");
export const Github = make(PhGithubLogo, "Github");
export const Globe = make(PhGlobe, "Globe");
export const GraduationCap = make(PhGraduationCap, "GraduationCap");
export const HandHeart = make(PhHandHeart, "HandHeart");
export const Handshake = make(PhHandshake, "Handshake");
export const Hash = make(PhHash, "Hash");
export const Headphones = make(PhHeadphones, "Headphones");
export const HeartHandshake = make(PhHandHeart, "HeartHandshake");
export const HelpCircle = make(PhQuestion, "HelpCircle");
export const History = make(PhClockCounterClockwise, "History");
export const Home = make(PhHouse, "Home");
export const IdCard = make(PhIdentificationCard, "IdCard");
export const Inbox = make(PhTray, "Inbox");
export const InfinityIcon = make(PhInfinity, "InfinityIcon");
export const Info = make(PhInfo, "Info");
export const Instagram = make(PhInstagramLogo, "Instagram");
export const Landmark = make(PhBank, "Landmark");
export const Laptop = make(PhLaptop, "Laptop");
export const LayoutDashboard = make(PhSquaresFour, "LayoutDashboard");
export const LayoutGrid = make(PhGridFour, "LayoutGrid");
export const Library = make(PhBooks, "Library");
export const Link = make(PhLink, "Link");
export const Link2 = make(PhLink, "Link2");
export const Linkedin = make(PhLinkedinLogo, "Linkedin");
export const List = make(PhList, "List");
export const Loader2 = make(PhSpinnerGap, "Loader2");
export const Lock = make(PhLock, "Lock");
export const LogOut = make(PhSignOut, "LogOut");
export const Mail = make(PhEnvelope, "Mail");
export const MapPin = make(PhMapPin, "MapPin");
export const Maximize2 = make(PhArrowsOut, "Maximize2");
export const Megaphone = make(PhMegaphone, "Megaphone");
export const Menu = make(PhList, "Menu");
export const MessageCircle = make(PhChatCircle, "MessageCircle");
export const MessageSquare = make(PhChatCenteredText, "MessageSquare");
export const MessagesSquare = make(PhChats, "MessagesSquare");
export const Mic2 = make(PhMicrophone, "Mic2");
export const Minus = make(PhMinus, "Minus");
export const MoreHorizontal = make(PhDotsThree, "MoreHorizontal");
export const Network = make(PhNetwork, "Network");
export const Newspaper = make(PhNewspaper, "Newspaper");
export const Package = make(PhPackage, "Package");
export const PanelLeft = make(PhSidebarSimple, "PanelLeft");
export const Paperclip = make(PhPaperclip, "Paperclip");
export const PauseCircle = make(PhPauseCircle, "PauseCircle");
export const Pencil = make(PhPencil, "Pencil");
export const Phone = make(PhPhone, "Phone");
export const Play = make(PhPlay, "Play");
export const Plus = make(PhPlus, "Plus");
export const Printer = make(PhPrinter, "Printer");
export const QrCode = make(PhQrCode, "QrCode");
export const RefreshCw = make(PhArrowsClockwise, "RefreshCw");
export const Repeat = make(PhRepeat, "Repeat");
export const Save = make(PhFloppyDisk, "Save");
export const Scale = make(PhScales, "Scale");
export const ScrollText = make(PhScroll, "ScrollText");
export const Search = make(PhMagnifyingGlass, "Search");
export const Send = make(PhPaperPlaneTilt, "Send");
export const Share2 = make(PhShare, "Share2");
export const ShieldAlert = make(PhShieldWarning, "ShieldAlert");
export const ShieldCheck = make(PhShieldCheck, "ShieldCheck");
export const SlidersHorizontal = make(PhSlidersHorizontal, "SlidersHorizontal");
export const Sparkles = make(PhSparkle, "Sparkles");
export const SquarePen = make(PhPencilSimple, "SquarePen");
export const Tag = make(PhTag, "Tag");
export const Trash2 = make(PhTrash, "Trash2");
export const Twitter = make(PhTwitterLogo, "Twitter");
export const Undo2 = make(PhArrowUUpLeft, "Undo2");
export const Unlock = make(PhLockOpen, "Unlock");
export const Upload = make(PhUpload, "Upload");
export const User = make(PhUser, "User");
export const UserPlus = make(PhUserPlus, "UserPlus");
export const UserRound = make(PhUser, "UserRound");
export const Users = make(PhUsers, "Users");
export const Video = make(PhVideo, "Video");
export const Vote = make(PhCheckSquare, "Vote");
export const X = make(PhX, "X");
export const XCircle = make(PhXCircle, "XCircle");
export const Youtube = make(PhYoutubeLogo, "Youtube");
