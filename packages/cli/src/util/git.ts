import { execFileSync, execSync } from 'node:child_process'

const git = (command: string) => {
	try {
		return execSync(`git ${command}`, { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' }).trim()
	} catch {
		return
	}
}

const checkedOutBranch = () => {
	return git('rev-parse --abbrev-ref HEAD')
}

// CI checks a pull request out as a detached ref, where git only reports 'HEAD'.
export const currentBranch = () => {
	const branch = checkedOutBranch()

	if (branch && branch !== 'HEAD') {
		return branch
	}

	return (
		process.env.GITHUB_HEAD_REF ||
		process.env.GITHUB_REF_NAME ||
		process.env.CI_COMMIT_REF_NAME ||
		process.env.BRANCH_NAME ||
		branch
	)
}

export const currentCommit = () => {
	return git('rev-parse HEAD')
}

export const currentCommitMessage = () => {
	return git('log -1 --pretty=%s')
}

export const isCommitMerged = (commit: string, branch: string) => {
	try {
		// execFile with an argv array, so commit/branch never reach a shell.
		execFileSync('git', ['merge-base', '--is-ancestor', commit, branch], {
			stdio: ['ignore', 'pipe', 'ignore'],
		})
		return true
	} catch {
		return false
	}
}
