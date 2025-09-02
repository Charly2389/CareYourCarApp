export function uuid(): string {
  try {
    // @ts-ignore
    if (globalThis?.crypto?.randomUUID) {
      // @ts-ignore
      return globalThis.crypto.randomUUID();
    }
  } catch {}
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return `${Date.now().toString(16)}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}`;
}

