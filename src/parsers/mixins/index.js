import ParserBase from "../ParserBase";

export function mixin(...parserMixins) {
	return parserMixins.reduce((prev, curr) => curr.create(prev), ParserBase);
};

export { default as Mixin } from "./Mixin";
export { default as MixinCheckImage } from "./MixinCheckImage";
export { default as MixinSingleEpisode } from "./MixinSingleEpisode";
export { default as MixinVolumeEpisode } from "./MixinVolumeEpisode";
