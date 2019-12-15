
import {NiceUtils as NiceUtilsInterface} from "models/utils";
import {Definition} from "models/objects";
import {lineUtils} from "utils/lineUtils";

export interface NiceUtils extends NiceUtilsInterface {}

export function NiceUtils() {
    
}

export var niceUtils = new NiceUtils();

NiceUtils.prototype.getDefinitionListDisplayString = function(
    title: string,
    definitionList: Definition[],
    indentationLevel?: number
): string {
    if (typeof indentationLevel === "undefined") {
        indentationLevel = 0
    }
    if (definitionList.length <= 0) {
        return "";
    }
    var tempIndentation1 = lineUtils.getIndentation(indentationLevel);
    var tempIndentation2 = lineUtils.getIndentation(indentationLevel + 1);
    var tempTextList = [tempIndentation1 + title + ":"];
    var index = 0;
    while (index < definitionList.length) {
        var tempDefinition = definitionList[index];
        tempTextList.push(tempIndentation2 + tempDefinition.getDisplayString());
        index += 1;
    }
    return tempTextList.join("\n");
}

// Excludes empty strings.
NiceUtils.prototype.joinTextList = function(textList: string[]): string {
    var tempTextList = [];
    var index = 0;
    while (index < textList.length) {
        var tempText = textList[index];
        if (tempText.length > 0) {
            tempTextList.push(tempText);
        }
        index += 1;
    }
    return tempTextList.join("\n");
}

NiceUtils.prototype.getReverseMap = function(map: {[key: string]: any}): {[key: string]: any} {
    var output = {};
    var key;
    for (key in map) {
        var tempValue = map[key];
        output[tempValue] = key;
    }
    return output;
}

