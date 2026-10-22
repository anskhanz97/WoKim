import { createInterface } from 'node:readline/promises';

export const readAnswer = async (
  label: string,
  fallback?: string,
): Promise<string> => {
  const reader = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const suffix = fallback ? ` (${fallback})` : '';
    const value = (await reader.question(`${label}${suffix}: `)).trim();
    return value || fallback || '';
  } finally {
    reader.close();
  }
};

export const readPassword = async (label: string): Promise<string> => {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    const value = process.env.WOKIM_OWNER_PASSWORD;
    if (!value)
      throw new Error(
        'Set WOKIM_OWNER_PASSWORD when running without an interactive terminal.',
      );
    return value;
  }

  return new Promise<string>((resolve, reject) => {
    let value = '';
    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.off('data', onData);
      process.stdout.write('\n');
    };
    const onData = (chunk: Buffer) => {
      const key = chunk.toString('utf8');
      if (key === '\r' || key === '\n') {
        cleanup();
        resolve(value);
      } else if (key === '\u0003') {
        cleanup();
        reject(new Error('Cancelled.'));
      } else if (key === '\b' || key === '\u007f') {
        if (value) {
          value = value.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else if (!key.startsWith('\u001b')) {
        value += key;
        process.stdout.write('*');
      }
    };

    process.stdout.write(`${label}: `);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', onData);
  });
};
