/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { spawn } from 'node:child_process';

const children = [
  spawn('npm', ['run', 'dev:api'], { stdio: 'inherit' }),
  spawn('npm', ['run', 'dev:vite'], { stdio: 'inherit' })
];

let shuttingDown = false;

for (const child of children) {
  child.on('exit', (code) => {
    if (shuttingDown) return;
    shuttingDown = true;
    for (const sibling of children) {
      if (sibling.pid !== child.pid) {
        sibling.kill('SIGTERM');
      }
    }
    process.exit(code ?? 0);
  });
}

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    child.kill('SIGTERM');
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
