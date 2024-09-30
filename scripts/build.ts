import { execFile as execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { build as esbuild } from "esbuild";
import { rimraf } from "rimraf";

const execFile = promisify(execFileSync);

const srcPath = path.join(process.cwd(), "src");
const buildPath = path.join(process.cwd(), "build");

async function clear(): Promise<void> {
	const _time = Date.now();

	await fs.rm(buildPath, { recursive: true, force: true });
}

async function buildDts(): Promise<void> {
	const _time = Date.now();

	const { stderr } = await execFile("tsc", [
		"--emitDeclarationOnly",
		"--project",
		"tsconfig.build.json",
	]);

	if (stderr) {
	}
}

async function extractDts(): Promise<void> {
	const _time = Date.now();

	const { stderr } = await execFile("api-extractor", ["run"]);

	if (stderr) {
	}

	await rimraf("./build/*", { glob: true });
	await fs.rename("trimmed.d.ts", "build/index.d.ts");
}

async function build(): Promise<void> {
	const _time = Date.now();

	await esbuild({
		platform: "node",
		target: "node21",
		format: "esm",
		nodePaths: [srcPath],
		sourcemap: true,
		external: [],
		bundle: true,
		entryPoints: [path.join(srcPath, "index.ts")],
		outdir: buildPath,
	});
}

if (process.argv[1] === import.meta.filename) {
	await clear();
	await buildDts();
	await extractDts();
	await build();
}
