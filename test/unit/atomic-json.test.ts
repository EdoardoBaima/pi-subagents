import assert from "node:assert/strict";
import * as path from "node:path";
import { describe, it } from "node:test";
import { createAtomicJsonWriter, writeBestEffortAtomicJson } from "../../src/shared/atomic-json.ts";

class FakeFs {
	files = new Map<string, string>();
	madeDirs: string[] = [];
	renameCalls = 0;
	failRenameCodes: string[] = [];
	writeFailure?: NodeJS.ErrnoException;

	mkdirSync(dirPath: string): void {
		this.madeDirs.push(dirPath);
	}

	writeFileSync(filePath: string, contents: string): void {
		if (this.writeFailure) throw this.writeFailure;
		this.files.set(filePath, contents);
	}

	renameSync(sourcePath: string, targetPath: string): void {
		this.renameCalls++;
		const failureCode = this.failRenameCodes.shift();
		if (failureCode) {
			const error = new Error(`rename failed with ${failureCode}`) as NodeJS.ErrnoException;
			error.code = failureCode;
			throw error;
		}
		const contents = this.files.get(sourcePath);
		if (contents === undefined) throw new Error(`missing source file: ${sourcePath}`);
		this.files.delete(sourcePath);
		this.files.set(targetPath, contents);
	}

	rmSync(filePath: string): void {
		this.files.delete(filePath);
	}
}

function createWriter(fakeFs: FakeFs, waits: number[]) {
	return createAtomicJsonWriter({
		fs: fakeFs,
		now: () => 12345,
		pid: 678,
		random: () => 0.5,
		retryRenameErrors: true,
		retryDelaysMs: [1, 2, 3],
		wait: (delayMs) => waits.push(delayMs),
	});
}

function createBestEffortOptions(fakeFs: FakeFs, waits: number[], onError?: (error: unknown) => void) {
	return {
		fs: fakeFs,
		now: () => 12345,
		pid: 678,
		random: () => 0.5,
		retryRenameErrors: true,
		retryDelaysMs: [1],
		wait: (delayMs: number) => waits.push(delayMs),
		onError,
	};
}

describe("writeAtomicJson", () => {
	it("retries transient rename failures before replacing the target", () => {
		const fakeFs = new FakeFs();
		fakeFs.failRenameCodes = ["EPERM", "EBUSY"];
		const waits: number[] = [];
		const writeAtomicJson = createWriter(fakeFs, waits);
		const targetPath = path.join("/tmp", "status.json");

		writeAtomicJson(targetPath, { state: "running" });

		assert.equal(fakeFs.renameCalls, 3);
		assert.deepEqual(waits, [1, 2]);
		assert.deepEqual(fakeFs.madeDirs, [path.dirname(targetPath)]);
		assert.equal(fakeFs.files.get(targetPath), JSON.stringify({ state: "running" }, null, 2));
		assert.equal(fakeFs.files.size, 1);
	});

	it("throws non-retryable rename failures without retrying", () => {
		const fakeFs = new FakeFs();
		fakeFs.failRenameCodes = ["ENOENT"];
		const waits: number[] = [];
		const writeAtomicJson = createWriter(fakeFs, waits);

		assert.throws(() => writeAtomicJson(path.join("/tmp", "status.json"), { state: "running" }), /ENOENT/);
		assert.equal(fakeFs.renameCalls, 1);
		assert.deepEqual(waits, []);
		assert.equal(fakeFs.files.size, 0);
	});

	it("cleans up the temp file after retryable failures are exhausted", () => {
		const fakeFs = new FakeFs();
		fakeFs.failRenameCodes = ["EPERM", "EPERM", "EPERM", "EPERM"];
		const waits: number[] = [];
		const writeAtomicJson = createWriter(fakeFs, waits);
		const targetPath = path.join("/tmp", "status.json");

		assert.throws(() => writeAtomicJson(targetPath, { state: "running" }), /EPERM/);
		assert.equal(fakeFs.renameCalls, 4);
		assert.deepEqual(waits, [1, 2, 3]);
		assert.equal(fakeFs.files.has(targetPath), false);
		assert.equal(fakeFs.files.size, 0);
	});

	it("returns false instead of throwing after best-effort rename retries are exhausted", () => {
		const fakeFs = new FakeFs();
		fakeFs.failRenameCodes = ["EPERM", "EPERM"];
		const waits: number[] = [];
		let observedError: unknown;

		const ok = writeBestEffortAtomicJson(path.join("/tmp", "status.json"), { state: "running" }, createBestEffortOptions(fakeFs, waits, (error) => {
			observedError = error;
		}));

		assert.equal(ok, false);
		assert.equal((observedError as NodeJS.ErrnoException).code, "EPERM");
		assert.equal(fakeFs.renameCalls, 2);
		assert.deepEqual(waits, [1]);
		assert.equal(fakeFs.files.size, 0);
	});

	it("rethrows non-rename write failures instead of hiding them", () => {
		const fakeFs = new FakeFs();
		const expectedError = new Error("EACCES: permission denied, write") as NodeJS.ErrnoException;
		expectedError.code = "EACCES";
		fakeFs.writeFailure = expectedError;
		const waits: number[] = [];
		let reported = false;

		assert.throws(
			() => writeBestEffortAtomicJson(path.join("/tmp", "status.json"), { state: "running" }, createBestEffortOptions(fakeFs, waits, () => {
				reported = true;
			})),
			(error) => error === expectedError,
		);
		assert.equal(reported, false);
		assert.deepEqual(waits, []);
		assert.equal(fakeFs.files.size, 0);
	});

	it("keeps best-effort writes non-throwing when error reporting fails", () => {
		const fakeFs = new FakeFs();
		fakeFs.failRenameCodes = ["EBUSY", "EBUSY"];
		const waits: number[] = [];

		assert.doesNotThrow(() => writeBestEffortAtomicJson(path.join("/tmp", "status.json"), { state: "running" }, createBestEffortOptions(fakeFs, waits, () => {
			throw new Error("diagnostic write failed");
		})));
		assert.deepEqual(waits, [1]);
		assert.equal(fakeFs.files.size, 0);
	});
});
