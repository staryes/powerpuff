/**
 * Powerpuff orchestration for Pi.
 *
 * Pi does not need an in-process subagent abstraction. Each delegated role is
 * run in a fresh `pi` process with an isolated context, a configured per-role
 * model/thinking profile, and a role-specific tool allowlist.
 */

import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { Type } from "typebox";

type CodingRole = "blossom" | "bubbles" | "buttercup";
type AdvisorRole = "holo" | "motoko";
type Role = CodingRole | AdvisorRole;
type ConfiguredRole = "misato" | Role;
type Requester = "misato" | "lily";
type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";

const THINKING_LEVELS = new Set<ThinkingLevel>([
	"off",
	"minimal",
	"low",
	"medium",
	"high",
	"xhigh",
	"max",
]);

const ROLE_CONFIG: Record<Role, { warmup: string; tools: string }> = {
	blossom: {
		warmup: "powerpuff/templates/base/blossom/warm-up.md",
		tools: "read,write,edit,grep,find,ls",
	},
	bubbles: {
		warmup: "powerpuff/templates/base/bubbles/warm-up.md",
		tools: "read,bash,edit,write,grep,find,ls",
	},
	buttercup: {
		warmup: "powerpuff/templates/base/buttercup/warm-up.md",
		tools: "read,bash,write,grep,find,ls",
	},
	holo: {
		warmup: "powerpuff/personas/holo.md",
		tools: "read,write,grep,find,ls",
	},
	motoko: {
		warmup: "powerpuff/personas/motoko.md",
		tools: "read,write,grep,find,ls",
	},
};

const RoleSchema = Type.Union([
	Type.Literal("blossom"),
	Type.Literal("bubbles"),
	Type.Literal("buttercup"),
	Type.Literal("holo"),
	Type.Literal("motoko"),
]);

const RequesterSchema = Type.Union([Type.Literal("misato"), Type.Literal("lily")]);

interface RoleSettings {
	model: string;
	thinking: ThinkingLevel;
}

interface PowerpuffSettings {
	version: number;
	roles: Record<ConfiguredRole, RoleSettings>;
}

const DEFAULT_SETTINGS: PowerpuffSettings = {
	version: 1,
	roles: {
		misato: { model: "openai-codex/gpt-5.6-sol", thinking: "high" },
		holo: { model: "openai-codex/gpt-5.6-sol", thinking: "xhigh" },
		motoko: { model: "openai-codex/gpt-5.6-sol", thinking: "xhigh" },
		blossom: { model: "mistral/mistral-medium-3.5", thinking: "high" },
		bubbles: { model: "mistral/mistral-medium-3.5", thinking: "high" },
		buttercup: { model: "mistral/mistral-medium-3.5", thinking: "high" },
	},
};

const DispatchParams = Type.Object({
	requester: RequesterSchema,
	role: RoleSchema,
	task: Type.String({ description: "One bounded task for the delegated role" }),
	takeover: Type.Optional(
		Type.Boolean({
			description: "True only for a user-approved Lily to Motoko sequential takeover",
		}),
	),
	approvalToken: Type.Optional(
		Type.String({
			description: "One-time token issued by the user-invoked /motoko-takeover command",
		}),
	),
	change: Type.Optional(
		Type.String({
			description: "OpenSpec change id, for example add-user-search",
		}),
	),
	runDir: Type.Optional(
		Type.String({
			description: "Kotodute run directory; defaults to kotodute/",
		}),
	),
	cwd: Type.Optional(
		Type.String({
			description: "Child working directory, relative to the project root",
		}),
	),
});

function getPiInvocation(args: string[]): { command: string; args: string[] } {
	const currentScript = process.argv[1];
	const isVirtualScript = currentScript?.startsWith("/$bunfs/root/");

	if (currentScript && !isVirtualScript && fs.existsSync(currentScript)) {
		return { command: process.execPath, args: [currentScript, ...args] };
	}

	const executable = path.basename(process.execPath).toLowerCase();
	if (!/^(node|bun)(\.exe)?$/.test(executable)) {
		return { command: process.execPath, args };
	}

	return { command: "pi", args };
}

function loadPowerpuffSettings(root: string): PowerpuffSettings {
	const configPath = path.join(root, ".pi/powerpuff.json");
	if (!fs.existsSync(configPath)) return DEFAULT_SETTINGS;

	const parsed = JSON.parse(fs.readFileSync(configPath, "utf8"));
	const roles = { ...DEFAULT_SETTINGS.roles };
	for (const role of Object.keys(roles) as ConfiguredRole[]) {
		const override = parsed?.roles?.[role];
		if (!override) continue;
		roles[role] = {
			model: typeof override.model === "string" ? override.model : roles[role].model,
			thinking: THINKING_LEVELS.has(override.thinking)
				? override.thinking
				: roles[role].thinking,
		};
	}
	return {
		version: typeof parsed?.version === "number" ? parsed.version : DEFAULT_SETTINGS.version,
		roles,
	};
}

function splitModelReference(reference: string): { provider: string; model: string } | null {
	const slash = reference.indexOf("/");
	if (slash <= 0 || slash === reference.length - 1) return null;
	return { provider: reference.slice(0, slash), model: reference.slice(slash + 1) };
}

function advisorArtifact(role: AdvisorRole, runDir: string): string {
	return runDir === "kotodute/"
		? `kotodute/advice/${role}.md`
		: `${runDir.replace(/\/$/, "")}/${role}-advice.md`;
}

function textFromAssistantMessage(message: any): string {
	if (message?.role !== "assistant") return "";
	if (typeof message.content === "string") return message.content;
	if (!Array.isArray(message.content)) return "";

	return message.content
		.filter((part: any) => part?.type === "text" && typeof part.text === "string")
		.map((part: any) => part.text)
		.join("\n");
}

function resolveChildCwd(root: string, requested?: string): string | null {
	const child = path.resolve(root, requested || ".");
	const relative = path.relative(root, child);
	if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
		return child;
	}
	return null;
}

function projectRelative(root: string, candidate: unknown): string | null {
	if (typeof candidate !== "string" || !candidate.trim()) return null;
	const absolute = path.resolve(root, candidate);
	const relative = path.relative(root, absolute);
	if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) return null;
	return relative.split(path.sep).join("/");
}

function readAllowedPaths(root: string): string[] {
	try {
		const scope = fs.readFileSync(path.join(root, "kotodute/scope.md"), "utf8");
		const match = scope.match(/## Allowed Paths\s+```(?:text)?\s*\n([\s\S]*?)```/i);
		if (!match) return [];
		return match[1]
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line && !line.startsWith("#"));
	} catch {
		return [];
	}
}

function readLilyList(root: string, heading: string): string[] {
	try {
		const task = fs.readFileSync(path.join(root, "kotodute/lily/task.md"), "utf8");
		const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const match = task.match(new RegExp(`## ${escaped}\\s+\`\`\`(?:text)?\\s*\\n([\\s\\S]*?)\`\`\``, "i"));
		if (!match) return [];
		return match[1]
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line && !line.startsWith("#"));
	} catch {
		return [];
	}
}

function globPattern(pattern: string): RegExp {
	let result = "^";
	for (let i = 0; i < pattern.length; i++) {
		const char = pattern[i];
		if (char === "*" && pattern[i + 1] === "*") {
			result += ".*";
			i++;
		} else if (char === "*") {
			result += "[^/]*";
		} else {
			result += char.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
		}
	}
	return new RegExp(`${result}$`);
}

function pathMatches(pattern: string, relative: string): boolean {
	const normalized = pattern.replace(/^\.\//, "");
	if (normalized.endsWith("/")) return relative.startsWith(normalized);
	return globPattern(normalized).test(relative);
}

function roleMayWrite(root: string, role: Role, relative: string): boolean {
	const motokoTakeover = role === "motoko" && process.env.PPG_TAKEOVER === "1";
	if (role === "holo" || (role === "motoko" && !motokoTakeover)) {
		const runDir = process.env.PPG_RUN_DIR || "kotodute/";
		return relative === advisorArtifact(role, runDir);
	}
	if (motokoTakeover) {
		const records = [
			"kotodute/lily/handoff.md",
			"kotodute/lily/work-log.md",
			"kotodute/lily/human-todo.md",
		];
		if (records.includes(relative)) return true;
		const denied = readLilyList(root, "Denied Files / Areas");
		if (denied.some((pattern) => pathMatches(pattern, relative))) return false;
		return readLilyList(root, "Allowed Files / Areas").some((pattern) =>
			pathMatches(pattern, relative),
		);
	}

	const common = [`kotodute/handoff/${role}.koto`, "kotodute/human-todo.md"];
	if (common.includes(relative)) return true;

	if (role === "blossom") {
		return relative === "kotodute/scope.md" || relative.startsWith("openspec/changes/");
	}
	if (role === "buttercup") {
		return relative.startsWith("kotodute/runs/") && !fs.existsSync(path.join(root, relative));
	}

	return readAllowedPaths(root).some((pattern) => pathMatches(pattern, relative));
}

function registerChildGuards(pi: any, role: Role) {
	pi.on("tool_call", async (event: any) => {
		const root = process.cwd();

		if (event.toolName === "bash") {
			const command = String(event.input?.command || "");
			if (/^python3 powerpuff\/templates\/common\/scripts\/koto-check\.py [^;&|<>]+$/.test(command)) {
				return undefined;
			}
			if (/(^|[;&|\s])git\s+push(\s|$)/.test(command)) {
				return { block: true, reason: "git push is human-only; add a Kotodute TODO" };
			}
			if (/\bgit\s+reset\s+--hard\b|\bgit\s+(clean|filter-branch)\b/.test(command)) {
				return { block: true, reason: "destructive git is human-only" };
			}
			if (/(^|[;&|\s])rm\s+-[^\s]*r[^\s]*f|\brm\s+--recursive\s+--force\b/.test(command)) {
				return { block: true, reason: "recursive forced deletion is human-only" };
			}
			if (/\b(npm|pnpm|yarn|bun)\s+(i|install|add|remove)\b|\b(pip|pip3)\s+install\b/.test(command)) {
				return {
					block: true,
					reason: "dependency changes require a human in child-process mode; add a Kotodute TODO",
				};
			}
			if (/kotodute\/(scope|human-todo)\.md|powerpuff\/|\.pi\/|\.vibe\/|\.claude\/|\.opencode\//.test(command)) {
				return { block: true, reason: "bash access to protected workflow paths is blocked; use read/write tools" };
			}
			if (role === "motoko" && process.env.PPG_TAKEOVER === "1") {
				if (/[\n;&|<>`]|[$][(]/.test(command)) {
					return {
						block: true,
						reason: "Motoko takeover commands must be single commands without shell composition",
					};
				}
				const allowedCommands = readLilyList(root, "Allowed Commands");
				if (!allowedCommands.includes(command.trim())) {
					return {
						block: true,
						reason: "Motoko may run only exact commands frozen in kotodute/lily/task.md",
					};
				}
			}
			return undefined;
		}

		if (event.toolName !== "write" && event.toolName !== "edit") return undefined;

		const relative = projectRelative(root, event.input?.path ?? event.input?.file_path);
		if (!relative) {
			return { block: true, reason: "writes must stay inside the project root" };
		}
		if (
			relative === ".env" ||
			relative.startsWith(".git/") ||
			relative.startsWith(".pi/") ||
			relative.startsWith(".vibe/") ||
			relative.startsWith(".claude/") ||
			relative.startsWith(".opencode/") ||
			relative.startsWith("powerpuff/") ||
			relative.startsWith("openspec/specs/")
		) {
			return { block: true, reason: `protected path: ${relative}` };
		}
		if (!roleMayWrite(root, role, relative)) {
			return { block: true, reason: `${role} may not write outside its role/scope: ${relative}` };
		}
		return undefined;
	});
}

export default function powerpuffExtension(pi: any) {
	// Delegated children load project extensions too. Do not let a role spawn
	// another Powerpuff tree and recursively amplify the run.
	if (process.env.PPG_CHILD === "1") {
		const role = process.env.PPG_ROLE as Role;
		if (role in ROLE_CONFIG) registerChildGuards(pi, role);
		return;
	}

	let motokoTakeoverApproval: { token: string; expiresAt: number } | null = null;

	pi.registerTool({
		name: "powerpuff_dispatch",
		label: "Powerpuff Dispatch",
		description:
			"Delegate a Powerpuff worker or advisor to a fresh Pi process. The child uses its configured model/thinking profile, isolated context, a role-specific tool allowlist, and durable Kotodute output.",
		promptSnippet:
			"powerpuff_dispatch: run Holo, Motoko, Blossom, Bubbles, or Buttercup in an isolated Pi process",
		promptGuidelines: [
			"Use powerpuff_dispatch for the Misato workflow, or for a Lily to Motoko takeover after the user invokes /motoko-takeover.",
			"Run Blossom, Bubbles, and Buttercup sequentially unless their scopes and working directories are disjoint.",
			"Use Holo only for material business questions and Motoko only for material R&D or architecture decisions.",
			"Misato uses Motoko as an advisor. Lily may dispatch Motoko only as a user-approved sequential takeover; Lily must stop working first.",
			"Always pass the active OpenSpec change id when one exists.",
		],
		parameters: DispatchParams,

		async execute(
			_toolCallId: string,
			params: {
				requester: Requester;
				role: Role;
				task: string;
				takeover?: boolean;
				approvalToken?: string;
				change?: string;
				runDir?: string;
				cwd?: string;
			},
			signal: AbortSignal | undefined,
			onUpdate: ((result: any) => void) | undefined,
			ctx: any,
		) {
			const root = path.resolve(ctx.cwd);
			const takeover = params.requester === "lily" && params.role === "motoko" && params.takeover === true;
			if (params.requester === "lily" && !takeover) {
				return {
					content: [
						{
							type: "text",
							text: "Rejected: Lily may dispatch only a user-approved Motoko takeover.",
						},
					],
					details: { requester: params.requester, role: params.role },
					isError: true,
				};
			}
			if (params.requester === "misato" && params.takeover) {
				return {
					content: [
						{
							type: "text",
							text: "Rejected: takeover mode is reserved for the Lily to Motoko handoff.",
						},
					],
					details: { requester: params.requester, role: params.role },
					isError: true,
				};
			}
			if (takeover) {
				const approval = motokoTakeoverApproval;
				if (
					!approval ||
					approval.expiresAt < Date.now() ||
					params.approvalToken !== approval.token
				) {
					return {
						content: [
							{
								type: "text",
								text: "Rejected: Motoko takeover requires a fresh user-invoked /motoko-takeover approval.",
							},
						],
						details: { requester: params.requester, role: params.role },
						isError: true,
					};
				}
			}
			const childCwd = resolveChildCwd(root, params.cwd);
			if (!childCwd) {
				return {
					content: [{ type: "text", text: "Rejected: cwd must stay inside the project root." }],
					details: { role: params.role },
					isError: true,
				};
			}

			const roleDefinition = ROLE_CONFIG[params.role];
			const warmup = path.join(root, roleDefinition.warmup);
			if (!fs.existsSync(warmup)) {
				return {
					content: [{ type: "text", text: `Missing role instructions: ${roleDefinition.warmup}` }],
					details: { role: params.role },
					isError: true,
				};
			}

			let settings: PowerpuffSettings;
			try {
				settings = loadPowerpuffSettings(root);
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `Invalid .pi/powerpuff.json: ${error.message}` }],
					details: { role: params.role },
					isError: true,
				};
			}

			const profile = settings.roles[params.role];
			const modelReference = splitModelReference(profile.model);
			if (!modelReference) {
				return {
					content: [{ type: "text", text: `Invalid model reference for ${params.role}: ${profile.model}` }],
					details: { role: params.role },
					isError: true,
				};
			}
			const registeredModel = ctx.modelRegistry?.find(modelReference.provider, modelReference.model);
			if (!registeredModel) {
				return {
					content: [{ type: "text", text: `Configured model not found: ${profile.model}` }],
					details: { role: params.role, model: profile.model },
					isError: true,
				};
			}
			if (!ctx.modelRegistry.hasConfiguredAuth(registeredModel)) {
				return {
					content: [{ type: "text", text: `No configured authentication for ${profile.model}` }],
					details: { role: params.role, model: profile.model },
					isError: true,
				};
			}

			const model = profile.model;
			const thinking = profile.thinking;
			const runDir = takeover ? "kotodute/lily/" : params.runDir || "kotodute/";
			const changePath = params.change ? `openspec/changes/${params.change}/` : "not specified";
			const isAdvisor = params.role === "holo" || (params.role === "motoko" && !takeover);
			const artifact = takeover
				? "kotodute/lily/handoff.md"
				: isAdvisor
					? advisorArtifact(params.role as AdvisorRole, runDir)
					: runDir === "kotodute/"
						? `kotodute/handoff/${params.role}.koto`
						: `${runDir.replace(/\/$/, "")}/${params.role}-handoff.koto`;
			const requesterName = params.requester === "lily" ? "Aoi Riri" : "Misato";

			const childPrompt = [
				`You are Powerpuff role ${params.role}.`,
				`Project root: ${root}`,
				`Run directory: ${runDir}`,
				`OpenSpec change: ${changePath}`,
				`Runtime profile: ${model} / ${thinking}. Record this profile in the durable output for auditability.`,
				`Read and obey ${roleDefinition.warmup}.`,
				`Task from ${requesterName}: ${params.task}`,
				takeover
					? "The user explicitly approved this sequential takeover. Lily has stopped. Read the frozen kotodute/lily/task.md and handoff.md, solve the task directly within its allowed files and exact allowed commands, run its check plan, then update kotodute/lily/work-log.md and kotodute/lily/handoff.md. Do not delegate or return work to Lily unless blocked."
					: isAdvisor
					? `This is advisory work only. Do not modify OpenSpec or product files. Write a decision memo to ${artifact} with assumptions, evidence, options, recommendation, confidence, and unresolved questions; then return a concise status to Misato.`
					: `Write the durable handoff to ${artifact}, validate it when bash is available, then return a concise status to Misato.`,
			].join("\n");

			const childTools = takeover
				? "read,bash,edit,write,grep,find,ls"
				: roleDefinition.tools;
			const args = [
				"--mode",
				"json",
				"-p",
				"--no-session",
				"--approve",
				"--tools",
				childTools,
				"--append-system-prompt",
				warmup,
			];
			args.push("--model", model);
			args.push("--thinking", thinking);
			args.push(childPrompt);

			// Consume the approval before spawning so one slash-command approval
			// cannot authorize parallel or repeated takeovers.
			if (takeover) motokoTakeoverApproval = null;

			const invocation = getPiInvocation(args);
			let stderr = "";
			let buffer = "";
			let finalText = "";
			let turns = 0;
			let cost = 0;
			let aborted = false;

			const exitCode = await new Promise<number>((resolve) => {
				const child = spawn(invocation.command, invocation.args, {
					cwd: childCwd,
					shell: false,
					stdio: ["ignore", "pipe", "pipe"],
					env: {
						...process.env,
						PPG_CHILD: "1",
						PPG_ROLE: params.role,
						PPG_RUN_DIR: runDir,
						PPG_OPENSPEC_CHANGE: params.change || "",
						PPG_TAKEOVER: takeover ? "1" : "0",
					},
				});

				const processLine = (line: string) => {
					if (!line.trim()) return;
					let event: any;
					try {
						event = JSON.parse(line);
					} catch {
						return;
					}

					if (event.type === "message_end" && event.message) {
						const text = textFromAssistantMessage(event.message);
						if (text) {
							finalText = text;
							turns++;
							onUpdate?.({
								content: [{ type: "text", text: `${params.role}: ${text}` }],
								details: { role: params.role, model, thinking, turns, cost },
							});
						}
						cost += event.message.usage?.cost?.total || 0;
					}
				};

				child.stdout.on("data", (chunk) => {
					buffer += chunk.toString();
					const lines = buffer.split("\n");
					buffer = lines.pop() || "";
					for (const line of lines) processLine(line);
				});
				child.stderr.on("data", (chunk) => {
					stderr += chunk.toString();
				});
				child.on("close", (code) => {
					if (buffer.trim()) processLine(buffer);
					resolve(code ?? 1);
				});
				child.on("error", (error) => {
					stderr += error.message;
					resolve(1);
				});

				const stopChild = () => {
					aborted = true;
					child.kill("SIGTERM");
					setTimeout(() => {
						if (!child.killed) child.kill("SIGKILL");
					}, 5000);
				};
				if (signal?.aborted) stopChild();
				else signal?.addEventListener("abort", stopChild, { once: true });
			});

			const details = {
				requester: params.requester,
				role: params.role,
				takeover,
				change: params.change,
				runDir,
				artifact,
				model,
				thinking,
				turns,
				cost,
				exitCode,
			};

			if (aborted || exitCode !== 0 || !finalText) {
				const reason = aborted ? "aborted" : stderr.trim() || `child exited with code ${exitCode}`;
				return {
					content: [{ type: "text", text: `${params.role} failed: ${reason}` }],
					details,
					isError: true,
				};
			}

			return {
				content: [{ type: "text", text: `[${params.role} · ${model} · ${thinking}]\n\n${finalText}` }],
				details,
			};
		},
	});

	pi.registerCommand("motoko-takeover", {
		description: "Approve Motoko to take over a Lily task sequentially",
		handler: async (args: string, ctx: any) => {
			if (!ctx.isIdle()) {
				ctx.ui.notify(
					"Pi is busy; approve Motoko only after Lily has stopped.",
					"warning",
				);
				return;
			}
			const root = path.resolve(ctx.cwd);
			const handoffPath = path.join(root, "kotodute/lily/handoff.md");
			if (!fs.existsSync(handoffPath)) {
				ctx.ui.notify("No Lily handoff found.", "error");
				return;
			}
			const handoff = fs.readFileSync(handoffPath, "utf8");
			const statusBlock = handoff.match(/## Status\s+([\s\S]*?)(?=\n## |\s*$)/i);
			const handoffStatus = statusBlock?.[1]
				.replace(/<!--[\s\S]*?-->/g, "")
				.trim()
				.split(/\s+/)[0];
			if (handoffStatus !== "AWAITING_MOTOKO_APPROVAL") {
				ctx.ui.notify(
					"Lily has not stopped with AWAITING_MOTOKO_APPROVAL.",
					"error",
				);
				return;
			}
			if (readLilyList(root, "Allowed Files / Areas").length === 0) {
				ctx.ui.notify(
					"Lily must freeze at least one allowed file or area before takeover.",
					"error",
				);
				return;
			}
			const token = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
			motokoTakeoverApproval = {
				token,
				expiresAt: Date.now() + 10 * 60 * 1000,
			};
			const task = args.trim() || "Take over and complete the frozen Lily task.";
			ctx.ui.notify(
				"Motoko takeover approved for one dispatch; Lily remains stopped.",
				"info",
			);
			pi.sendUserMessage(
				`The user explicitly approved a sequential Motoko takeover. Call powerpuff_dispatch exactly once with requester "lily", role "motoko", takeover true, approvalToken "${token}", runDir "kotodute/lily/", and task "${task}". Do not implement in the parent context.`,
			);
		},
	});

	pi.registerCommand("ppg-run", {
		description: "Run an OpenSpec change through Powerpuff using Pi",
		handler: async (args: string, ctx: any) => {
			const change = args.trim();
			if (!change) {
				ctx.ui.notify("Usage: /ppg-run <openspec-change-id>", "warning");
				return;
			}
			if (!ctx.isIdle()) {
				ctx.ui.notify("Pi is busy; run /ppg-run when the current turn finishes.", "warning");
				return;
			}
			let settings: PowerpuffSettings;
			try {
				settings = loadPowerpuffSettings(ctx.cwd);
			} catch (error: any) {
				ctx.ui.notify(`Invalid .pi/powerpuff.json: ${error.message}`, "error");
				return;
			}
			const profile = settings.roles.misato;
			const modelReference = splitModelReference(profile.model);
			if (!modelReference) {
				ctx.ui.notify(`Invalid Misato model reference: ${profile.model}`, "error");
				return;
			}
			const model = ctx.modelRegistry.find(modelReference.provider, modelReference.model);
			if (!model) {
				ctx.ui.notify(`Misato model not found: ${profile.model}`, "error");
				return;
			}
			const switched = await pi.setModel(model);
			if (!switched) {
				ctx.ui.notify(`No configured authentication for ${profile.model}`, "error");
				return;
			}
			pi.setThinkingLevel(profile.thinking);
			ctx.ui.notify(`Misato: ${profile.model} / ${profile.thinking}`, "info");
			pi.sendUserMessage(
				`Use the ppg-misato skill to execute OpenSpec change "${change}". Route by complexity, call Holo or Motoko only when their decision lens is materially relevant, and use powerpuff_dispatch with requester "misato" for every delegated role. Do not implement role work in the parent context.`,
			);
		},
	});
}
