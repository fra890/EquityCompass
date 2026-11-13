import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);
// Uses a locally installed Chrome Headless Shell when REMOTION_CHROME is set
// (handy on machines that cannot download Remotion's own copy).
if (process.env.REMOTION_CHROME) {
  Config.setBrowserExecutable(process.env.REMOTION_CHROME);
}
