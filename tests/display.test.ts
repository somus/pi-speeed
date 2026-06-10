import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, OFF_VALUE } from "../src/config";
import { renderLastMedianTokS } from "../src/display";

describe("display", () => {
	it("omits footer prefix when set to off", () => {
		expect(renderLastMedianTokS({ ...DEFAULT_CONFIG, footerPrefix: OFF_VALUE }, { label: "tok/s", workingPrefix: null }, 12.3)).toBe(
			"12.3 tok/s",
		);
	});
});
