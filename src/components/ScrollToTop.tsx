import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function ScrollToTop() {
    const { pathname, search, hash, state } = useLocation();
    // In-place navigation (the /materials archive browser moving between
    // folders) keeps the reader where they are.
    const keepScroll = Boolean((state as { keepScroll?: boolean } | null)?.keepScroll);

    useEffect(() => {
        if (hash || keepScroll) return;
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "instant",
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keepScroll is read per navigation
    }, [pathname, search, hash]);

    return null;
}