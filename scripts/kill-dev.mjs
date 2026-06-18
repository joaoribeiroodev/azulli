/**
 * Encerra processos Node que estão escutando nas portas do Next dev (3000/3001).
 * Windows: usa netstat + taskkill. Unix: usa lsof + kill.
 *
 * npm run dev:reset  → mata portas, limpa .next e inicia dev
 */

import { execSync } from "node:child_process"

const PORTS = [3000, 3001]

function killPortWindows(port) {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    })
    const pids = new Set()
    for (const line of out.split("\n")) {
      if (!line.includes("LISTENING")) continue
      const parts = line.trim().split(/\s+/)
      const pid = parts[parts.length - 1]
      if (pid && /^\d+$/.test(pid)) pids.add(pid)
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" })
        console.log(`✓ Encerrado PID ${pid} (porta ${port})`)
      } catch {
        /* já encerrado */
      }
    }
  } catch {
    /* nenhum processo na porta */
  }
}

function killPortUnix(port) {
  try {
    const out = execSync(`lsof -ti :${port}`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    })
    for (const pid of out.trim().split("\n").filter(Boolean)) {
      try {
        execSync(`kill -9 ${pid}`, { stdio: "ignore" })
        console.log(`✓ Encerrado PID ${pid} (porta ${port})`)
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* nenhum processo */
  }
}

for (const port of PORTS) {
  if (process.platform === "win32") {
    killPortWindows(port)
  } else {
    killPortUnix(port)
  }
}

console.log("○ Portas 3000/3001 liberadas")
