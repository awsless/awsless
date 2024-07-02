type PackageManager = 'pnpm';
declare const loadPackageDependencyVersions: (entry: string, packageManager: PackageManager) => Promise<Record<string, string>>;

type Options = {
    extensions?: string[];
    packageManager?: PackageManager;
    packageVersions?: Record<string, string>;
};

declare const generateFileHash: (file: string, opts?: Options) => Promise<string>;
declare const generateFolderHash: (folder: string, opts?: Options) => Promise<string>;

export { generateFileHash, generateFolderHash, loadPackageDependencyVersions };
