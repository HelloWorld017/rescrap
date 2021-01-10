import ParserBase from "../ParserBase";

export function mixin(...parserMixins) {
	parserMixins.reduce((prev, curr) => curr.create(prev), ParserBase);
};
