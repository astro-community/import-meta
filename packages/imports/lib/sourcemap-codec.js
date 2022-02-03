/*! sourcemap-codec (modified) | MIT License | Rich Harris | https://github.com/Rich-Harris/sourcemap-codec */

var charToInteger = {};
var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
for (var i = 0; i < chars.length; i++) {
	charToInteger[chars.charCodeAt(i)] = i;
}
function segmentify(line, segment, j) {
	// This looks ugly, but we're creating specialized arrays with a specific
	// length. This is much faster than creating a new array (which v8 expands to
	// a capacity of 17 after pushing the first item), or slicing out a subarray
	// (which is slow). Length 4 is assumed to be the most frequent, followed by
	// length 5 (since not everything will have an associated name), followed by
	// length 1 (it's probably rare for a source substring to not have an
	// associated segment data).
	if (j === 4)
		line.push([segment[0], segment[1], segment[2], segment[3]]);
	else if (j === 5)
		line.push([segment[0], segment[1], segment[2], segment[3], segment[4]]);
	else if (j === 1)
		line.push([segment[0]]);
}
function encode(decoded) {
	var sourceFileIndex = 0; // second field
	var sourceCodeLine = 0; // third field
	var sourceCodeColumn = 0; // fourth field
	var nameIndex = 0; // fifth field
	var mappings = '';
	for (var i = 0; i < decoded.length; i++) {
		var line = decoded[i];
		if (i > 0)
			mappings += ';';
		if (line.length === 0)
			continue;
		var generatedCodeColumn = 0; // first field
		var lineMappings = [];
		for (var _i = 0, line_1 = line; _i < line_1.length; _i++) {
			var segment = line_1[_i];
			var segmentMappings = encodeInteger(segment[0] - generatedCodeColumn);
			generatedCodeColumn = segment[0];
			if (segment.length > 1) {
				segmentMappings +=
					encodeInteger(segment[1] - sourceFileIndex) +
						encodeInteger(segment[2] - sourceCodeLine) +
						encodeInteger(segment[3] - sourceCodeColumn);
				sourceFileIndex = segment[1];
				sourceCodeLine = segment[2];
				sourceCodeColumn = segment[3];
			}
			if (segment.length === 5) {
				segmentMappings += encodeInteger(segment[4] - nameIndex);
				nameIndex = segment[4];
			}
			lineMappings.push(segmentMappings);
		}
		mappings += lineMappings.join(',');
	}
	return mappings;
}
function encodeInteger(num) {
	var result = '';
	num = num < 0 ? (-num << 1) | 1 : num << 1;
	do {
		var clamped = num & 31;
		num >>>= 5;
		if (num > 0) {
			clamped |= 32;
		}
		result += chars[clamped];
	} while (num > 0);
	return result;
}

export { encode };
