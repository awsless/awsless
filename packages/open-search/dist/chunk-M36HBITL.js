// src/server/download.ts
import decompress from "decompress";
import findCacheDir from "find-cache-dir";
import { mkdir, rename, rm, stat } from "fs/promises";
import { join, resolve } from "path";
var getArchiveName = (version) => {
  switch (process.platform) {
    case "win32":
      return `opensearch-${version}-windows-arm64.zip`;
    default:
      return `opensearch-${version}-linux-x64.tar.gz`;
  }
};
var getDownloadPath = () => {
  return resolve(
    findCacheDir({
      name: "@awsless/open-search",
      cwd: process.cwd()
    }) || ""
  );
};
var exists = async (path) => {
  try {
    await stat(path);
  } catch (error) {
    return false;
  }
  return true;
};
var download = async (version) => {
  const path = getDownloadPath();
  const name = `opensearch-${version}`;
  const file = join(path, name);
  if (await exists(file)) {
    return file;
  }
  console.log(`Downloading OpenSearch ${version}`);
  const url = `https://artifacts.opensearch.org/releases/bundle/opensearch/${version}/${getArchiveName(version)}`;
  const response = await fetch(url, { method: "GET" });
  const data = await response.arrayBuffer();
  const buffer = Buffer.from(data);
  const temp = join(path, `.${name}-${process.pid}`);
  await rm(temp, { recursive: true, force: true });
  await mkdir(temp, { recursive: true, mode: "0777" });
  await decompress(buffer, temp);
  try {
    await rename(join(temp, name), file);
  } catch (error) {
    if (!await exists(file)) {
      throw error;
    }
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
  return file;
};

// src/server/jdk.ts
import decompress2 from "decompress";
import findCacheDir2 from "find-cache-dir";
import { mkdir as mkdir2, readdir, rename as rename2, rm as rm2, stat as stat2 } from "fs/promises";
import { join as join2, resolve as resolve2 } from "path";
var exists2 = async (path) => {
  try {
    await stat2(path);
  } catch (error) {
    return false;
  }
  return true;
};
var findJavaHome = async (dir) => {
  const [root] = await readdir(dir);
  const base = join2(dir, root);
  const macHome = join2(base, "Contents", "Home");
  return await exists2(macHome) ? macHome : base;
};
var downloadJdk = async (version = 17) => {
  const path = resolve2(
    findCacheDir2({
      name: "@awsless/open-search",
      cwd: process.cwd()
    }) || ""
  );
  const dir = join2(path, `jdk-${version}-${process.platform}-${process.arch}`);
  if (await exists2(dir)) {
    return findJavaHome(dir);
  }
  console.log(`Downloading JDK ${version}`);
  const os = process.platform === "darwin" ? "mac" : process.platform === "win32" ? "windows" : "linux";
  const arch = process.arch === "arm64" ? "aarch64" : "x64";
  const url = `https://api.adoptium.net/v3/binary/latest/${version}/ga/${os}/${arch}/jdk/hotspot/normal/eclipse`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Downloading JDK ${version} for ${os}-${arch} failed: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const temp = join2(path, `.jdk-${version}-${process.platform}-${process.arch}-${process.pid}`);
  await rm2(temp, { recursive: true, force: true });
  await mkdir2(temp, { recursive: true, mode: "0777" });
  await decompress2(buffer, temp);
  try {
    await rename2(temp, dir);
  } catch (error) {
    if (!await exists2(dir)) {
      throw error;
    }
    await rm2(temp, { recursive: true, force: true });
  }
  return findJavaHome(dir);
};

// src/server/version.ts
var VERSION_2_8_0 = {
  version: "2.8.0",
  started: (line) => line.includes("started"),
  settings: ({ port, host, cache }) => ({
    "discovery.type": "single-node",
    "http.host": host,
    "http.port": port,
    "path.data": `${cache}/data`,
    "path.logs": `${cache}/logs`,
    "plugins.security.disabled": true,
    // A local throwaway server must keep working on a nearly full
    // disk, instead of tripping the watermark index blocks.
    "cluster.routing.allocation.disk.threshold_enabled": false
  })
};

export {
  download,
  downloadJdk,
  VERSION_2_8_0
};
