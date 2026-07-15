export type RouteMatchTarget = {
  href: string;
  exact?: boolean;
  match?: string[];
};

export function normalizePath(pathname: string) {
  const [pathWithoutQuery] = pathname.split(/[?#]/);
  const path = pathWithoutQuery || "/";

  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }

  return path;
}

export function isRouteActive(pathname: string, href: string, exact = false) {
  const current = normalizePath(pathname);
  const target = normalizePath(href);

  if (current === target) {
    return true;
  }

  if (exact || target === "/") {
    return false;
  }

  return current.startsWith(`${target}/`);
}

export function routeMatchLength(pathname: string, target: RouteMatchTarget) {
  const candidates = target.match?.length ? target.match : [target.href];
  const matches = candidates
    .filter((candidate) => isRouteActive(pathname, candidate, target.exact))
    .map((candidate) => normalizePath(candidate).length);

  return matches.length ? Math.max(...matches) : -1;
}

export function resolveRouteMatch<T extends RouteMatchTarget>(pathname: string, targets: T[]) {
  return targets.reduce<{ item: T | null; score: number }>(
    (best, item) => {
      const score = routeMatchLength(pathname, item);

      if (score > best.score) {
        return { item, score };
      }

      return best;
    },
    { item: null, score: -1 },
  ).item;
}
