import { chmodSync, existsSync } from 'node:fs'

const target = 'dist/index.js'
if (existsSync(target)) {
  try {
    chmodSync(target, 0o755)
  } catch {
    /* windows has no posix mode */
  }
}
