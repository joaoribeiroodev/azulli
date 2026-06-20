import { createRequire } from "node:module"

const require = createRequire(import.meta.url)

const { beginAfterScope, endAfterScope, scheduleAfter } = require(
  "./server/lib/afterScope.js"
)

export { beginAfterScope, endAfterScope, scheduleAfter }
