import type { ExtensionAPI, ExtensionCommandContext, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { type Config, loadConfig, saveConfig } from "./config";
import { chooseOccurrenceText, clearUi, type OccurrenceText, renderFooterTokS, renderWorkingTokS, updateStatus } from "./display";
import { deltaChars, medianTokS, rescaleSamplesToFinalTokens, type TokenSample, tokensForUpdate } from "./metrics";
import { applyRunCatIndicator, type RunCatState } from "./runcat";
import { openSettings } from "./settings";
import { loadStats, recordStat, saveStats, summarizeStats } from "./stats";
import { showReadOnlyPanel } from "./ui";

export default function (pi: ExtensionAPI) {
	let config: Config = loadConfig();
	let startedAt = 0;
	let lastRenderedAt = 0;
	let streamedChars = 0;
	let lastOutputTokens = 0;
	let lastMedianTokS: number | null = null;
	let sessionOutputTokens = 0;
	let sessionDurationMs = 0;
	let tokenSamples: TokenSample[] = [];
	let occurrence: OccurrenceText = { label: null, workingPrefix: null };
	let aggregateStats = loadStats();
	const runcatState: RunCatState = { appliedAt: 0, intervalMs: 0 };

	function resetMessageMetrics() {
		startedAt = 0;
		lastRenderedAt = 0;
		streamedChars = 0;
		lastOutputTokens = 0;
		tokenSamples = [];
	}

	function sessionAvgTokS() {
		return sessionDurationMs > 0 ? sessionOutputTokens / (sessionDurationMs / 1000) : null;
	}

	function renderFooterStatus() {
		return renderFooterTokS(config, occurrence, sessionAvgTokS());
	}

	function applyConfig(ctx: ExtensionContext) {
		saveConfig(config);
		if (!config.enabled) clearUi(ctx);
		else {
			applyRunCatIndicator(ctx, config, runcatState, lastMedianTokS, true);
			updateStatus(ctx, config, renderFooterStatus());
		}
	}

	pi.on("session_start", async (_event, ctx) => {
		config = loadConfig();
		sessionOutputTokens = 0;
		sessionDurationMs = 0;
		applyRunCatIndicator(ctx, config, runcatState, lastMedianTokS, true);
		if (config.enabled && ctx.hasUI) updateStatus(ctx, config, renderFooterStatus());
	});

	pi.on("agent_start", async (_event, ctx) => {
		if (!config.enabled) return;
		occurrence = chooseOccurrenceText(config);
		applyRunCatIndicator(ctx, config, runcatState, null, true);
		if (ctx.hasUI) ctx.ui.setWorkingMessage(renderWorkingTokS(config, occurrence, null));
	});

	pi.on("turn_start", async (_event, ctx) => {
		if (!config.enabled) return;
		if (occurrence.label === null || occurrence.workingPrefix === null) occurrence = chooseOccurrenceText(config);
		applyRunCatIndicator(ctx, config, runcatState, null, true);
		if (ctx.hasUI) ctx.ui.setWorkingMessage(renderWorkingTokS(config, occurrence, null));
	});

	pi.on("message_update", async (event, ctx) => {
		if (!config.enabled || event.message.role !== "assistant") return;

		const now = Date.now();
		if (event.assistantMessageEvent.type === "start" || startedAt === 0) {
			startedAt = now;
			lastRenderedAt = 0;
			streamedChars = 0;
			lastOutputTokens = 0;
			if (!occurrence.label || !occurrence.workingPrefix) occurrence = chooseOccurrenceText(config);
			applyRunCatIndicator(ctx, config, runcatState, null, true);
			if (ctx.hasUI) ctx.ui.setWorkingMessage(renderWorkingTokS(config, occurrence, null));
		}

		streamedChars += deltaChars(event.assistantMessageEvent);
		lastOutputTokens = Math.max(lastOutputTokens, tokensForUpdate(event, streamedChars));
		if (tokenSamples.length === 0 || lastOutputTokens > tokenSamples[tokenSamples.length - 1].tokens)
			tokenSamples.push({ time: now, tokens: lastOutputTokens });

		if (now - lastRenderedAt < config.renderIntervalMs && event.assistantMessageEvent.type !== "done") return;
		lastRenderedAt = now;
		const liveMedianTokS = medianTokS(tokenSamples);
		applyRunCatIndicator(ctx, config, runcatState, liveMedianTokS);
		if (ctx.hasUI) ctx.ui.setWorkingMessage(renderWorkingTokS(config, occurrence, liveMedianTokS));
	});

	pi.on("message_end", async (event, ctx) => {
		if (!config.enabled || event.message.role !== "assistant" || startedAt === 0) return;

		const usageOutput = event.message.usage?.output ?? 0;
		const tokens = usageOutput > 0 ? usageOutput : lastOutputTokens;
		const endedAt = Date.now();
		const rawSamples = tokenSamples;
		const correctedSamples =
			usageOutput > 0 ? rescaleSamplesToFinalTokens(rawSamples, usageOutput, endedAt, config.correction) : rawSamples;
		lastMedianTokS = medianTokS(correctedSamples);
		const avgTokS = endedAt > startedAt ? tokens / ((endedAt - startedAt) / 1000) : null;
		const recentStat = {
			endedAt,
			model: event.message.model,
			provider: event.message.provider,
			api: event.message.api,
			outputTokens: tokens,
			durationMs: endedAt - startedAt,
			medianTokS: lastMedianTokS,
			avgTokS,
			stopReason: event.message.stopReason,
		};
		recordStat(aggregateStats, recentStat);
		saveStats(aggregateStats);
		if (config.persistStats) {
			pi.appendEntry("pi-speeed-stats", {
				schemaVersion: 1,
				startedAt,
				endedAt,
				durationMs: endedAt - startedAt,
				outputTokens: tokens,
				medianTokS: lastMedianTokS,
				samples: correctedSamples,
				rawSamples,
				corrected: usageOutput > 0 && config.correction,
				model: event.message.model,
				provider: event.message.provider,
				api: event.message.api,
				responseId: event.message.responseId,
				stopReason: event.message.stopReason,
			});
		}
		if (event.message.stopReason !== "error" && event.message.stopReason !== "aborted") {
			sessionOutputTokens += tokens;
			sessionDurationMs += endedAt - startedAt;
		}
		updateStatus(ctx, config, renderFooterStatus());
		applyRunCatIndicator(ctx, config, runcatState, lastMedianTokS, true);
		if (ctx.hasUI) ctx.ui.setWorkingMessage();
		resetMessageMetrics();
	});

	pi.on("agent_end", async (_event, ctx) => {
		applyRunCatIndicator(ctx, config, runcatState, lastMedianTokS, true);
		if (ctx.hasUI) ctx.ui.setWorkingMessage();
		if (!config.enabled && ctx.hasUI) clearUi(ctx);
		occurrence = { label: null, workingPrefix: null };
	});

	pi.on("session_shutdown", async (_event, ctx) => clearUi(ctx));

	async function handleConfigCommand(args: string, ctx: ExtensionCommandContext) {
		const [cmd] = args.trim().split(/\s+/).filter(Boolean);
		if (!cmd || cmd === "settings") {
			await openSettings(
				ctx,
				() => config,
				(next) => (config = next),
				() => applyConfig(ctx),
			);
			return;
		}
		if (cmd === "stats") {
			aggregateStats = loadStats();
			await showReadOnlyPanel(ctx, "pi-speeed stats", summarizeStats(aggregateStats));
			return;
		}
		ctx.ui.notify("Use /pi-speeed for settings or /pi-speeed stats for aggregate stats.", "error");
	}

	pi.registerCommand("pi-speeed", {
		description: "Open pi-speeed settings; use /pi-speeed stats for aggregate speed stats",
		handler: handleConfigCommand,
	});
}
