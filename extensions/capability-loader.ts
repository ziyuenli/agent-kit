/**
 * capability-loader — 冷启动加载器
 *
 * 思路：
 *   - 重扩展（pi-web-access / pi-lens / @plannotator / pi-mcp-adapter）默认不放进
 *     settings.json 的 packages，冷启动保持快（它们在 install 时已装好，只是不自动加载）。
 *   - 本扩展很轻（只注册 2 个命令 + 2 个工具），始终随本地包 `../../pi-extensions` 加载。
 *   - 当 agent/你 需要某个能力时，调用工具 `enable_capability`（或命令
 *     `/capability-enable <name>`）→ 把对应 package 写进 settings.json → ctx.reload()
 *     加载它 → 之后就能用了。
 *   - 用完可用 `disable_capability` / `/capability-disable <name>` 移除，确保下一次冷启动又快。
 *
 * 依赖 pi 原生机制：pi.registerTool() 运行时生效；工具无法直接 ctx.reload()，
 * 所以工具用 pi.sendUserMessage(...) 排队一个命令，命令里做写配置 + ctx.reload()。
 *
 * （说明：不做运行时 import() 直接动态加载 npm 包，因各包导出形状不同，不可靠。）
 */
import type {
  ExtensionAPI,
  ExtensionCommandContext,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const CAPS: Array<{ name: string; pkg: string }> = [
  { name: "web", pkg: "npm:pi-web-access@0.27.0" },
  { name: "lens", pkg: "npm:pi-lens@4.1.3" },
  { name: "plannotate", pkg: "npm:@plannotator/pi-extension@0.27.9" },
  { name: "mcp", pkg: "npm:pi-mcp-adapter@2.31.0" },
];

// Honor pi's config-dir override, then fall back to the default path.
const AGENT_DIR =
  process.env["PI_CODING_AGENT_DIR"] ?? join(homedir(), ".pi", "agent");
const SETTINGS_PATH = join(AGENT_DIR, "settings.json");

// Concrete settings shape (other keys are preserved as-is).
interface SettingsFile {
  packages?: string[];
  [key: string]: unknown;
}

async function updatePackages(
  op: "add" | "remove",
  pkg: string,
): Promise<string> {
  const raw = await readFile(SETTINGS_PATH, "utf8");
  let s: SettingsFile;
  try {
    s = JSON.parse(raw) as SettingsFile;
  } catch {
    throw new Error(`failed to parse ${SETTINGS_PATH}: invalid JSON`);
  }
  const pkgs: string[] = Array.isArray(s.packages) ? s.packages : [];
  let changed = false;
  if (op === "add") {
    if (!pkgs.includes(pkg)) {
      pkgs.push(pkg);
      changed = true;
    }
  } else {
    const before = pkgs.length;
    s.packages = pkgs.filter((p) => p !== pkg);
    changed = s.packages.length !== before;
  }
  if (changed) {
    await writeFile(SETTINGS_PATH, JSON.stringify(s, null, 2) + "\n", "utf8");
  }
  return changed ? "changed" : "noop";
}

function findCap(name: string) {
  return CAPS.find((c) => c.name === name.trim().toLowerCase());
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("capability-enable", {
    description:
      "Load a heavy on-demand capability now (web | lens | plannotate | mcp)",
    handler: async (args, ctx: ExtensionCommandContext) => {
      const cap = findCap(args ?? "");
      if (!cap) {
        ctx.ui.notify(
          `Unknown capability "${args}". One of: ${CAPS.map((c) => c.name).join(", ")}`,
          "error",
        );
        return;
      }
      const res = await updatePackages("add", cap.pkg);
      await ctx.reload();
      ctx.ui.notify(
        `${cap.name} ${res === "changed" ? "已加载" : "已在配置中"}（${cap.pkg}）`,
        "info",
      );
      return;
    },
  });

  pi.registerCommand("capability-disable", {
    description:
      "Unload a heavy on-demand capability (web | lens | plannotate | mcp) to keep cold start fast",
    handler: async (args, ctx: ExtensionCommandContext) => {
      const cap = findCap(args ?? "");
      if (!cap) {
        ctx.ui.notify(
          `Unknown capability "${args}". One of: ${CAPS.map((c) => c.name).join(", ")}`,
          "error",
        );
        return;
      }
      const res = await updatePackages("remove", cap.pkg);
      await ctx.reload();
      ctx.ui.notify(
        `${cap.name} ${res === "changed" ? "已移除（下次冷启动不再加载）" : "本就不在配置中"}（${cap.pkg}）`,
        "info",
      );
      return;
    },
  });

  pi.registerTool({
    name: "enable_capability",
    label: "Enable Capability",
    description:
      "Load a heavy on-demand capability into this session (web, lens, plannotate, mcp). " +
      "Call it when the task needs a capability that is not currently available, then retry the task next turn.",
    parameters: Type.Object({
      name: Type.String({
        description: "One of: web, lens, plannotate, mcp",
      }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate) {
      const cap = findCap(String(params.name ?? ""));
      if (!cap) {
        return {
          content: [
            {
              type: "text",
              text: `Unknown capability "${params.name}". Valid: ${CAPS.map((c) => c.name).join(", ")}`,
            },
          ],
          details: {},
        };
      }
      pi.sendUserMessage(`/capability-enable ${cap.name}`, {
        deliverAs: "followUp",
      });
      return {
        content: [
          {
            type: "text",
            text: `Queued loading of "${cap.name}" (${cap.pkg}). It loads after a short reload; retry your task next turn.`,
          },
        ],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: "disable_capability",
    label: "Disable Capability",
    description:
      "Remove a heavy on-demand capability from this session (web, lens, plannotate, mcp) so the next cold start stays fast.",
    parameters: Type.Object({
      name: Type.String({
        description: "One of: web, lens, plannotate, mcp",
      }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate) {
      const cap = findCap(String(params.name ?? ""));
      if (!cap) {
        return {
          content: [
            {
              type: "text",
              text: `Unknown capability "${params.name}". Valid: ${CAPS.map((c) => c.name).join(", ")}`,
            },
          ],
          details: {},
        };
      }
      pi.sendUserMessage(`/capability-disable ${cap.name}`, {
        deliverAs: "followUp",
      });
      return {
        content: [
          {
            type: "text",
            text: `Queued removal of "${cap.name}". The next cold start will be fast again.`,
          },
        ],
        details: {},
      };
    },
  });
}
