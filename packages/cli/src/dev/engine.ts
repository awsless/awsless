// The local redis & opensearch servers run in-memory engines by default.
// AWSLESS_LOCAL_ENGINE=real swaps in the real binaries, which need a
// compiler, a jdk & network access on first boot.
export const localEngine = (): 'memory' | 'real' => {
	return process.env.AWSLESS_LOCAL_ENGINE === 'real' ? 'real' : 'memory'
}
