#!/usr/bin/env node
import { spawn } from "child_process";
import { setTimeout as wait } from "timers/promises";
import { existsSync } from "fs";
import { resolve } from "path";
import http from "http";

const root = resolve(process.cwd());
const isWin = process.platform === "win32";

const procs = [];

function run(name, cmd, args, opts = {}) {
  const proc = spawn(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: isWin,
    ...opts,
  });
  proc.on("exit", (code) => {
    console.log(`[${name}] exited with code ${code}`);
    procs.forEach((p) => {
      if (p !== proc) {
        try {
          p.kill("SIGTERM");
        } catch {
          // ignore
        }
      }
    });
    process.exit(code ?? 0);
  });
  procs.push(proc);
  return proc;
}

function checkViteReady(url, retries = 40) {
  return new Promise((resolveP, reject) => {
    let attempts = 0;
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) {
          resolveP();
        } else if (attempts++ < retries) {
          setTimeout(tick, 500);
        } else {
          reject(new Error("Vite dev server did not become ready"));
        }
      });
      req.on("error", () => {
        req.destroy();
        if (attempts++ < retries) {
          setTimeout(tick, 500);
        } else {
          reject(new Error("Vite dev server did not become ready"));
        }
      });
    };
    tick();
  });
}

async function main() {
  const useExistingElectron = existsSync(resolve(root, "dist-electron", "main.js"));
  if (!useExistingElectron) {
    console.log(">> Compiling electron main/preload...");
    await new Promise((res, rej) => {
      const tsc = spawn("npx", ["tsc", "-p", "tsconfig.electron.json"], {
        cwd: root,
        stdio: "inherit",
        shell: isWin,
      });
      tsc.on("exit", (code) => (code === 0 ? res() : rej(new Error("tsc failed"))));
    });
  } else {
    console.log(">> dist-electron exists, skip tsc (delete it to force recompile)");
  }

  console.log(">> Starting Vite dev server...");
  run("vite", "npx", ["vite", "--port", "5174", "--strictPort"]);

  console.log(">> Waiting for Vite...");
  await checkViteReady("http://localhost:5174");

  await wait(300);

  console.log(">> Starting Electron...");
  const electronBin = resolve(root, "node_modules", ".bin", isWin ? "electron.cmd" : "electron");
  run("electron", electronBin, ["."], {
    env: { ...process.env, NODE_ENV: "development" },
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

process.on("SIGINT", () => {
  procs.forEach((p) => {
    try {
      p.kill("SIGINT");
    } catch {
      // ignore
    }
  });
  process.exit(0);
});