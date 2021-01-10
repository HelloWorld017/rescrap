import ParserBase from "../ParserBase";

export function mixin(...parserMixins) {
	parserMixins.reduce((prev, curr) => curr.create(prev), ParserBase);
};

export Mixin from "./Mixin";
export MixinCheckImage from "./MixinCheckImage";
export MixinSingleEpisode from "./MixinSingleEpisode";
export MixinVolumeEpisode from "./MixinVolumeEpisode";
