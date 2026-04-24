import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";

// server deps to bundle to reduce openat(2) syscalls
const allowlist = [
  "bcryptjs",
  "connect-mongo",
  "express",
  "express-rate-limit",
  "express-session",
  "mongoose",
  "nodemailer",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  try {
    console.log("🧹 Cleaning dist directory...");
    await rm("dist", { recursive: true, force: true });

    console.log("🖥️ Building client (Vite)...");
    await viteBuild();
    console.log("✅ Client build finished.");

    console.log("⚙️ Preparing server build...");
    const pkg = JSON.parse(await readFile("package.json", "utf-8"));
    const allDeps = [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {}),
    ];
    const externals = allDeps.filter((dep) => !allowlist.includes(dep));

    console.log("🚀 Bundling server (esbuild)...");
    await esbuild({
      entryPoints: ["server/index.ts"],
      platform: "node",
      bundle: true,
      format: "cjs",
      outfile: "dist/index.cjs",
      define: {
        "process.env.NODE_ENV": '"production"',
      },
      minify: true,
      external: externals,
      logLevel: "info",
    });
    console.log("✅ Server build finished successfully!");

  } catch (error) {
    console.error("❌ BUILD FAILED:", error);
    process.exit(1);
  }
}

buildAll();
