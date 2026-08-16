import { debug, error, info, warn } from "@tauri-apps/plugin-log";

const MAX_LEN = 8000;

function stringifyArg(arg: unknown): string {
  if (typeof arg === "string") return arg;
  if (arg instanceof Error) {
    return arg.stack ? `${arg.name}: ${arg.message}\n${arg.stack}` : `${arg.name}: ${arg.message}`;
  }
  if (typeof arg === "undefined") return "undefined";
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

function formatArgs(args: unknown[]): string {
  const text = args.map(stringifyArg).join(" ");
  return text.length > MAX_LEN ? `${text.slice(0, MAX_LEN)}…` : text;
}

function forward(
  original: (...args: unknown[]) => void,
  logger: (message: string) => Promise<void>,
  args: unknown[],
) {
  original(...args);
  void logger(formatArgs(args)).catch(() => {});
}

export async function initLogger() {
  const origLog = console.log.bind(console);
  const origInfo = console.info.bind(console);
  const origWarn = console.warn.bind(console);
  const origError = console.error.bind(console);
  const origDebug = console.debug.bind(console);
  const origTrace = console.trace.bind(console);

  console.log = ((...args: unknown[]) => forward(origLog, info, args)) as typeof console.log;
  console.info = ((...args: unknown[]) => forward(origInfo, info, args)) as typeof console.info;
  console.warn = ((...args: unknown[]) => forward(origWarn, warn, args)) as typeof console.warn;
  console.error = ((...args: unknown[]) => forward(origError, error, args)) as typeof console.error;
  console.debug = ((...args: unknown[]) => forward(origDebug, debug, args)) as typeof console.debug;
  console.trace = ((...args: unknown[]) => forward(origTrace, debug, args)) as typeof console.trace;

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.stack || `${reason.name}: ${reason.message}`
        : stringifyArg(reason);
    origError("unhandledrejection", message);
    void error(`unhandledrejection: ${message}`).catch(() => {});
  });

  window.addEventListener("error", (event) => {
    const extra = event.error instanceof Error && event.error.stack ? `\n${event.error.stack}` : "";
    origError(event.message, event.error);
    void error(`window.error: ${event.message}${extra}`).catch(() => {});
  });
}
