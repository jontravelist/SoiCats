import { useTranslation } from "react-i18next";

// Tiny relative-time formatter. Falls back to absolute date after a week.
export function useTimeAgo() {
  const { i18n } = useTranslation();
  return (iso: string) => {
    const then = new Date(iso).getTime();
    const diff = Math.max(0, Date.now() - then);
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d`;
    return new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short" }).format(then);
  };
}
