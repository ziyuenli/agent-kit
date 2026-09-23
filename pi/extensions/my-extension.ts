import type {
  ExtensionAPI,
  ExtensionCommandContext,
} from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx: ExtensionCommandContext) => {
    ctx.ui.notify("my-extension 已加载", "info");
  });

  pi.registerCommand("hello", {
    description: "回显一条问候",
    handler: async (_args, ctx: ExtensionCommandContext) => {
      ctx.ui.notify("Hello from ~/agent-kit/pi", "info");
    },
  });
}
