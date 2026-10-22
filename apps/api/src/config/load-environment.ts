import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';

const candidates = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '..', '..', '.env'),
];
const localEnvironment = candidates.find((candidate) => existsSync(candidate));

if (localEnvironment) {
  config({ path: localEnvironment, quiet: true });
}
