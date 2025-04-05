let enabled = false;

export const enableDebug = () => {
  enabled = true;
};

export const createDebugger = (group: string) => {
  return (...args: unknown[]) => {
    if (!enabled) {
      return;
    }

    console.log(`${group}:`, ...args);
  };
};
