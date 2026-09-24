import { useEffect } from "react";
import { useAdminHeader } from "../layouts/AdminHeaderContext";
import { useDocTitle } from "./useDocTitle";

export function usePageTitle(title: string, action?: React.ReactNode) {
  const { setHeader } = useAdminHeader();
  useDocTitle(title);
  useEffect(() => {
    setHeader({ title, action });
    return () => setHeader({ title: "qrdigo", action: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHeader]);
}