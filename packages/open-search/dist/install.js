import {
  VERSION_2_8_0,
  download,
  downloadJdk
} from "./chunk-7I7EB23J.js";

// src/install.ts
var main = async () => {
  if (process.env.AWSLESS_SKIP_OPENSEARCH_DOWNLOAD || process.env.CI) {
    return;
  }
  if (process.env.INIT_CWD) {
    process.chdir(process.env.INIT_CWD);
  }
  await download(VERSION_2_8_0.version);
  if (process.platform !== "linux" && process.platform !== "win32") {
    await downloadJdk();
  }
};
main().catch((error) => {
  console.warn(`Pre-downloading OpenSearch failed: ${error instanceof Error ? error.message : error}`);
  console.warn("The download will run on the first use instead.");
});
