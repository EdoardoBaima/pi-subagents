import fs from "node:fs";
import path from "node:path";
import { syncBuiltinESMExports } from "node:module";

const originalRenameSync = fs.renameSync;
const targetDir = process.env.PI_SUBAGENTS_TEST_EPERM_STATUS_DIR;
const failuresAfterFirstSuccess = Number(process.env.PI_SUBAGENTS_TEST_EPERM_FAILURES_AFTER_FIRST_SUCCESS ?? "0");
let statusRenameSuccesses = 0;
let injectedFailures = 0;

fs.renameSync = function renameSyncWithInjectedStatusEperm(oldPath, newPath) {
	if (targetDir && failuresAfterFirstSuccess > 0 && path.resolve(String(newPath)) === path.resolve(targetDir, "status.json")) {
		if (statusRenameSuccesses >= 1 && injectedFailures < failuresAfterFirstSuccess) {
			injectedFailures++;
			const error = new Error("EPERM: operation not permitted, rename") ;
			error.code = "EPERM";
			error.errno = -4048;
			error.syscall = "rename";
			error.path = String(oldPath);
			error.dest = String(newPath);
			throw error;
		}
		const result = originalRenameSync.call(this, oldPath, newPath);
		statusRenameSuccesses++;
		return result;
	}
	return originalRenameSync.call(this, oldPath, newPath);
};

syncBuiltinESMExports();
