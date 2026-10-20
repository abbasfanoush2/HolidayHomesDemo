// No raw IP, cookies, or third-party lookup. Vercel supplies the country header.
export interface MarketRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
}
export interface MarketResponse {
  statusCode: number;
  setHeader(name: string, value: string): unknown;
  end(body?: string): unknown;
}
export default function market(req: MarketRequest, res: MarketResponse) {
  res.setHeader(
    "Cache-Control",
    "private, no-store, max-age=0, must-revalidate",
  );
  res.setHeader("CDN-Cache-Control", "no-store");
  res.setHeader("Vercel-CDN-Cache-Control", "no-store");
  res.setHeader("Vary", "x-vercel-ip-country");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET, HEAD");
    return res.end();
  }
  const header = req.headers["x-vercel-ip-country"];
  const country =
    typeof header === "string" && ["ES", "IT", "GB"].includes(header)
      ? header
      : null;
  res.statusCode = 200;
  return res.end(
    req.method === "HEAD" ? undefined : JSON.stringify({ country }),
  );
}
