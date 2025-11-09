// Lightweight gated logger. Only logs when NEXT_PUBLIC_DEBUG === '1'.
const ENABLED = typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_DEBUG === '1';

const safe = (...args: any[]) => args;

export const logger = {
  debug: (...args: any[]) => { if (ENABLED) { console.debug('[DEBUG]', ...safe(...args)); } },
  info: (...args: any[]) => { if (ENABLED) { console.info('[INFO]', ...safe(...args)); } },
  warn: (...args: any[]) => { if (ENABLED) { console.warn('[WARN]', ...safe(...args)); } },
  error: (...args: any[]) => { if (ENABLED) { console.error('[ERROR]', ...safe(...args)); } },
};

export default logger;
