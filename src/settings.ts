import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { type Config, CUSTOM_OPTION, DEFAULT_CONFIG, OFF_OPTION, OFF_VALUE, RANDOM_OPTION, RANDOM_VALUE } from "./config";
import { displayPreset } from "./display";
import { FOOTER_PREFIX_PRESETS, ICON_PRESETS, LABEL_PRESETS, WORKING_PREFIX_PRESETS } from "./presets";
import { loadStats, summarizeStats } from "./stats";
import { showReadOnlyPanel } from "./ui";

async function promptNumber(ctx: ExtensionContext, title: string, current: number) {
	const value = await ctx.ui.input(title, String(current));
	if (value === undefined) return undefined;
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

async function pickNumberPreset(ctx: ExtensionContext, title: string, current: number, presets: number[]) {
	const currentText = String(current);
	const options = [currentText, ...presets.map(String).filter((preset) => preset !== currentText), CUSTOM_OPTION];
	const choice = await ctx.ui.select(title, options);
	if (!choice) return current;
	if (choice === CUSTOM_OPTION) return (await promptNumber(ctx, title, current)) ?? current;
	const parsed = Number(choice);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : current;
}

async function pickPreset(ctx: ExtensionContext, title: string, current: string, presets: string[], allowRandom: boolean) {
	const currentDisplay = displayPreset(current);
	const options = [
		currentDisplay,
		...presets.filter((preset) => preset !== currentDisplay),
		...(allowRandom ? [RANDOM_OPTION] : []),
		CUSTOM_OPTION,
	];
	const choice = await ctx.ui.select(title, options);
	if (!choice) return current;
	if (choice === RANDOM_OPTION) return RANDOM_VALUE;
	if (choice === OFF_OPTION) return OFF_VALUE;
	if (choice === CUSTOM_OPTION)
		return (await ctx.ui.input(title, current === RANDOM_VALUE || current === OFF_VALUE ? presets[0] : current)) ?? current;
	return choice;
}

export async function openSettings(
	ctx: ExtensionContext,
	getConfig: () => Config,
	setConfig: (config: Config) => void,
	applyConfig: () => void,
) {
	while (true) {
		let config = getConfig();
		const choice = await ctx.ui.select("pi-speeed settings", [
			`Enabled: ${config.enabled ? "on" : "off"}`,
			`RunCat loader: ${config.runcat ? "on" : "off"}`,
			`Label: ${displayPreset(config.label)}`,
			`Footer status: ${config.footer ? "on" : "off"}`,
			`Footer prefix: ${config.footerPrefix}`,
			`Working prefix: ${displayPreset(config.workingPrefix)}`,
			`Speed badge icon: ${config.icon}`,
			`Render interval: ${config.renderIntervalMs}ms`,
			`RunCat default: ${config.defaultRuncatIntervalMs}ms`,
			`RunCat range: ${config.minRuncatIntervalMs}-${config.maxRuncatIntervalMs}ms`,
			`RunCat scale: ${config.runcatScale}`,
			`Correction: ${config.correction ? "on" : "off"}`,
			`Persist session stats: ${config.persistStats ? "on" : "off"}`,
			"Show aggregate stats",
			"Reset defaults",
			"Done",
		]);
		if (!choice || choice === "Done") return;

		config = { ...config };
		if (choice.startsWith("Enabled:")) config.enabled = !config.enabled;
		else if (choice.startsWith("RunCat loader:")) config.runcat = !config.runcat;
		else if (choice.startsWith("Label:")) config.label = await pickPreset(ctx, "Speed label", config.label, LABEL_PRESETS, true);
		else if (choice.startsWith("Footer status:")) config.footer = !config.footer;
		else if (choice.startsWith("Footer prefix:"))
			config.footerPrefix = await pickPreset(ctx, "Footer prefix", config.footerPrefix, FOOTER_PREFIX_PRESETS, false);
		else if (choice.startsWith("Working prefix:"))
			config.workingPrefix = await pickPreset(ctx, "Working prefix", config.workingPrefix, WORKING_PREFIX_PRESETS, true);
		else if (choice.startsWith("Speed badge icon:"))
			config.icon = await pickPreset(ctx, "Speed badge icon (first half plain, second half Nerd Font)", config.icon, ICON_PRESETS, false);
		else if (choice.startsWith("Render interval:"))
			config.renderIntervalMs = await pickNumberPreset(ctx, "Render interval ms", config.renderIntervalMs, [100, 150, 250, 500, 1000]);
		else if (choice.startsWith("RunCat default:"))
			config.defaultRuncatIntervalMs = await pickNumberPreset(
				ctx,
				"RunCat default frame interval ms",
				config.defaultRuncatIntervalMs,
				[80, 120, 167, 200, 250],
			);
		else if (choice.startsWith("RunCat range:")) {
			const min = await pickNumberPreset(ctx, "RunCat min frame interval ms", config.minRuncatIntervalMs, [30, 50, 75, 100]);
			const max = await pickNumberPreset(ctx, "RunCat max frame interval ms", config.maxRuncatIntervalMs, [167, 200, 250, 300, 500]);
			if (min <= max) {
				config.minRuncatIntervalMs = min;
				config.maxRuncatIntervalMs = max;
			}
		} else if (choice.startsWith("RunCat scale:"))
			config.runcatScale = await pickNumberPreset(
				ctx,
				"RunCat scale (higher = slower)",
				config.runcatScale,
				[3000, 4500, 6000, 9000, 12000],
			);
		else if (choice.startsWith("Correction:")) config.correction = !config.correction;
		else if (choice.startsWith("Persist session stats:")) config.persistStats = !config.persistStats;
		else if (choice === "Show aggregate stats") {
			await showReadOnlyPanel(ctx, "pi-speeed stats", summarizeStats(loadStats()));
			continue;
		} else if (choice === "Reset defaults") {
			if (await ctx.ui.confirm("Reset pi-speeed?", "Restore default settings?")) config = { ...DEFAULT_CONFIG };
		}
		setConfig(config);
		applyConfig();
		ctx.ui.notify("pi-speeed config saved", "info");
	}
}
