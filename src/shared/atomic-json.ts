import * as fs from "node:fs";
import * as path from "node:path";

const TRANSIENT_RENAME_ERROR_CODES = new Set(["EPERM", "EACCES", "EBUSY"]);
const exhaustedTransientRenameErrors = new WeakSet<object>();
const DEFAULT_RENAME_RETRIES = 6;
const DEFAULT_RENAME_RETRY_DELAY_MS = 10;

export interface WriteAtomicJsonOptions {
	maxRenameRetries?: number;
	renameRetryDelayMs?: number;
}

export interface WriteBestEffortAtomicJsonOptions extends WriteAtomicJsonOptions {
	onError?: (error: unknown) => void;
}

function isTransientRenameError(error: unknown): boolean {
	return TRANSIENT_RENAME_ERROR_CODES.has((error as NodeJS.ErrnoException | undefined)?.code ?? "");
}

function markExhaustedTransientRenameError(error: unknown): void {
	if (error !== null && typeof error === "object") exhaustedTransientRenameErrors.add(error);
}

function isExhaustedTransientRenameError(error: unknown): boolean {
	return error !== null && typeof error === "object" && exhaustedTransientRenameErrors.has(error) && isTransientRenameError(error);
}

function sleepSync(ms: number): void {
	if (ms <= 0) return;
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

export function writeAtomicJson(filePath: string, payload: object, options: WriteAtomicJsonOptions = {}): void {
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	const tempPath = path.join(
		path.dirname(filePath),
		`.${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`,
	);
	const maxRenameRetries = options.maxRenameRetries ?? DEFAULT_RENAME_RETRIES;
	const renameRetryDelayMs = options.renameRetryDelayMs ?? DEFAULT_RENAME_RETRY_DELAY_MS;
	try {
		fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2), "utf-8");
		for (let attempt = 0; ; attempt++) {
			try {
				fs.renameSync(tempPath, filePath);
				break;
			} catch (error) {
				if (!isTransientRenameError(error)) throw error;
				if (attempt >= maxRenameRetries) {
					markExhaustedTransientRenameError(error);
					throw error;
				}
				sleepSync(renameRetryDelayMs * (attempt + 1));
			}
		}
	} finally {
		fs.rmSync(tempPath, { force: true });
	}
}

// Suppresses only exhausted transient rename failures. Other write, serialization,
// and permission failures still surface to callers.
export function writeBestEffortAtomicJson(filePath: string, payload: object, options: WriteBestEffortAtomicJsonOptions = {}): boolean {
	try {
		writeAtomicJson(filePath, payload, options);
		return true;
	} catch (error) {
		if (!isExhaustedTransientRenameError(error)) throw error;
		try {
			options.onError?.(error);
		} catch {
			// Best-effort writes must not fail because diagnostic reporting failed.
		}
		return false;
	}
}
