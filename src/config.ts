import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const STATUS_ID = "pi-speeed";
export const CONFIG_PATH = join(process.env.HOME ?? "", ".pi/agent/pi-speeed.json");
export const CUSTOM_OPTION = "Custom...";
export const RANDOM_OPTION = "Random";
export const RANDOM_VALUE = "__random__";
export const OFF_OPTION = "Off";
export const OFF_VALUE = "__off__";

export type Config = {
	enabled: boolean;
	runcat: boolean;
	label: string;
	footerPrefix: string;
	workingPrefix: string;
	icon: string;
	footer: boolean;
	renderIntervalMs: number;
	defaultRuncatIntervalMs: number;
	minRuncatIntervalMs: number;
	maxRuncatIntervalMs: number;
	runcatScale: number;
	correction: boolean;
	persistStats: boolean;
};

export const DEFAULT_CONFIG: Config = {
	enabled: true,
	runcat: true,
	label: "tok/s",
	footerPrefix: "session avg",
	workingPrefix: "Working...",
	icon: "✦",
	footer: true,
	renderIntervalMs: 250,
	defaultRuncatIntervalMs: 167,
	minRuncatIntervalMs: 50,
	maxRuncatIntervalMs: 250,
	runcatScale: 6000,
	correction: true,
	persistStats: true,
};

export function loadConfig(): Config {
	try {
		if (!existsSync(CONFIG_PATH)) return { ...DEFAULT_CONFIG };
		const parsed = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
		return { ...DEFAULT_CONFIG, ...parsed };
	} catch {
		return { ...DEFAULT_CONFIG };
	}
}

export function saveConfig(config: Config) {
	writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`);
}
