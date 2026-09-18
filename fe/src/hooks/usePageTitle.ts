import { useEffect } from "react";
import { useAdminHeader } from "../layouts/AdminHeaderContext";

export function usePageTitle(title: string, action?: React.ReactNode) {
  const { setHeader } = useAdminHeader();
  useEffect(() => {
    setHeader({ title, action });
    document.title = title ? `${title} | qrdigo` : "qrdigo";
    return () => setHeader({ title: "qrdigo", action: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHeader]);
}
