import { DEFAULT_CONFIG, OFF_OPTION } from "./config";

export const LABEL_PRESETS = [
	DEFAULT_CONFIG.label,
	"zoomies/s",
	"nyooms/s",
	"brrrs/s",
	"purrs/s",
	"meows/s",
	"mlems/s",
	"beans/s",
	"paws/s",
	"scritches/s",
	"kibbles/s",
	"treats/s",
	"pounces/s",
	"loaves/s",
	"whiskers/s",
	"tailwags/s",
	"catnips/s",
	"goblins/s",
	"chaoses/s",
	"thoughts/s",
	"braincells/s",
	"vibes/s",
	"yaps/s",
	"noms/s",
	"tunas/s",
	"hairballs/s",
	"boops/s",
	"bonks/s",
	"zips/s",
	"skitters/s",
	"scampers/s",
];

export const WORKING_PREFIX_PRESETS = [
	DEFAULT_CONFIG.workingPrefix,
	"Catting...",
	"Nyooming...",
	"Cooking...",
	"Zooming...",
	"Purring...",
	"Chasing tokens...",
	"Doing zoomies...",
	"Cat go brrr...",
	"Generating chaos...",
	"Tiny legs running...",
	"Summoning cats...",
	"Kneading thoughts...",
	"Hunting tokens...",
	"Spinning yarn...",
	"Loafing hard...",
	"Turbo loaf...",
	"Pawing at logits...",
	"Whiskers engaged...",
	"Brain cat running...",
	"Serving kibble...",
];

export const FOOTER_PREFIX_PRESETS = [
	OFF_OPTION,
	DEFAULT_CONFIG.footerPrefix,
	"avg",
	"session",
	"overall",
	"zoomies avg",
	"nyoom avg",
	"purr avg",
	"loaf avg",
	"beans avg",
	"pounce avg",
	"whisker avg",
	"mlem avg",
	"tuna avg",
	"braincat avg",
	"chaos avg",
];

export const ICON_PRESETS = ["none", "✦", "◆", "◇", "◈", "⌁", "≋", "›", "⟡", "ฅ", "🐾", "󰓅", "󱐋", "󰄛", "󰣇", "", "", "", "", "", ""];

export function randomPreset(presets: string[]) {
	return presets[Math.floor(Math.random() * presets.length)];
}
