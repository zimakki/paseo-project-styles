import type { PluginClientContext } from "@getpaseo/plugin/client";
import { injectProjectStyles } from "./client/web";

export default function contribute(_client: PluginClientContext) {
  return injectProjectStyles();
}
