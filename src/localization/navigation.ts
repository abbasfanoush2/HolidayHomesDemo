import { useCallback } from "react";
import {
  useLocation,
  useNavigate,
  type NavigateOptions,
  type To,
} from "react-router-dom";
/** Keep outreach/analytics query parameters while navigating inside the demo. */
export function useMarketNavigate() {
  const navigate = useNavigate(),
    location = useLocation();
  return useCallback(
    (to: To | number, options?: NavigateOptions) => {
      if (typeof to === "number") return navigate(to);
      if (typeof to !== "string")
        return navigate(
          { ...to, search: to.search ?? location.search },
          options,
        );
      const url = new URL(to, window.location.href);
      const query = new URLSearchParams(location.search);
      url.searchParams.forEach((value, key) => query.set(key, value));
      return navigate(
        { pathname: url.pathname, search: query.toString(), hash: url.hash },
        options,
      );
    },
    [navigate, location.search],
  );
}
