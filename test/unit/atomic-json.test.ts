import assert from "node:assert/strict";
import fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { syncBuiltinESMExports } from "node:module";
import { describe, it } from "node:test";
import { writeAtomicJson, writeBestEffortAtomicJson } from "../../src/shared/atomic-json.ts";

describe("writeAtomicJson", () => {
	it("retries transient Windows rename locks before replacing the target", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-subagents-atomic-json-"));
		const targetPath = path.join(dir, "status.json");
		const originalRenameSync = fs.renameSync;
		let attempts = 0;

		try {
			fs.renameSync = ((oldPath: fs.PathLike, newPath: fs.PathLike) => {
				attempts++;
				if (attempts === 1) {
					const error = new Error("EPERM: operation not permitted, rename") as NodeJS.ErrnoException;
					error.code = "EPERM";
					throw error;
				}
				return originalRenameSync(oldPath, newPath);
			}) as typeof fs.renameSync;
			syncBuiltinESMExports();

			writeAtomicJson(targetPath, { state: "running" });

			assert.equal(attempts, 2);
			assert.deepEqual(JSON.parse(fs.readFileSync(targetPath, "utf-8")), { state: "running" });
		} finally {
			fs.renameSync = originalRenameSync;
			syncBuiltinESMExports();
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	it("rethrows non-transient best-effort write failures instead of hiding them", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-subagents-atomic-json-"));
		const targetPath = path.join(dir, "status.json");
		const originalWriteFileSync = fs.writeFileSync;
		const expectedError = new Error("ENOSPC: no space left on device") as NodeJS.ErrnoException;
		expectedError.code = "ENOSPC";
		let reported = false;

		try {
			fs.writeFileSync = (() => {
				throw expectedError;
			}) as typeof fs.writeFileSync;
			syncBuiltinESMExports();

			assert.throws(
				() => writeBestEffortAtomicJson(targetPath, { state: "running" }, {
					onError: () => {
						reported = true;
					},
				}),
				(error) => error === expectedError,
			);
			assert.equal(reported, false);
			assert.equal(fs.existsSync(targetPath), false);
			assert.deepEqual(fs.readdirSync(dir), []);
		} finally {
			fs.writeFileSync = originalWriteFileSync;
			syncBuiltinESMExports();
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	it("rethrows transient-code best-effort write failures before rename instead of hiding them", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-subagents-atomic-json-"));
		const targetPath = path.join(dir, "status.json");
		const originalWriteFileSync = fs.writeFileSync;
		const expectedError = new Error("EACCES: permission denied, write") as NodeJS.ErrnoException;
		expectedError.code = "EACCES";
		let reported = false;

		try {
			fs.writeFileSync = (() => {
				throw expectedError;
			}) as typeof fs.writeFileSync;
			syncBuiltinESMExports();

			assert.throws(
				() => writeBestEffortAtomicJson(targetPath, { state: "running" }, {
					onError: () => {
						reported = true;
					},
				}),
				(error) => error === expectedError,
			);
			assert.equal(reported, false);
			assert.equal(fs.existsSync(targetPath), false);
			assert.deepEqual(fs.readdirSync(dir), []);
		} finally {
			fs.writeFileSync = originalWriteFileSync;
			syncBuiltinESMExports();
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	it("returns false instead of throwing after best-effort rename retries are exhausted", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-subagents-atomic-json-"));
		const targetPath = path.join(dir, "status.json");
		const originalRenameSync = fs.renameSync;
		let observedError: unknown;

		try {
			fs.renameSync = (() => {
				const error = new Error("EPERM: operation not permitted, rename") as NodeJS.ErrnoException;
				error.code = "EPERM";
				throw error;
			}) as typeof fs.renameSync;
			syncBuiltinESMExports();

			const ok = writeBestEffortAtomicJson(targetPath, { state: "running" }, {
				maxRenameRetries: 1,
				renameRetryDelayMs: 0,
				onError: (error) => {
					observedError = error;
				},
			});

			assert.equal(ok, false);
			assert.equal((observedError as NodeJS.ErrnoException).code, "EPERM");
			assert.equal(fs.existsSync(targetPath), false);
			assert.deepEqual(fs.readdirSync(dir), []);
		} finally {
			fs.renameSync = originalRenameSync;
			syncBuiltinESMExports();
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	it("keeps best-effort writes non-throwing when error reporting fails", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-subagents-atomic-json-"));
		const targetPath = path.join(dir, "status.json");
		const originalRenameSync = fs.renameSync;

		try {
			fs.renameSync = (() => {
				const error = new Error("EBUSY: resource busy or locked, rename") as NodeJS.ErrnoException;
				error.code = "EBUSY";
				throw error;
			}) as typeof fs.renameSync;
			syncBuiltinESMExports();

			assert.doesNotThrow(() => writeBestEffortAtomicJson(targetPath, { state: "running" }, {
				maxRenameRetries: 0,
				onError: () => {
					throw new Error("diagnostic write failed");
				},
			}));
		} finally {
			fs.renameSync = originalRenameSync;
			syncBuiltinESMExports();
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});
});
