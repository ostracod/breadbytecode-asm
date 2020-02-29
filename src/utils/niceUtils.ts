
import {NiceUtils as NiceUtilsInterface} from "models/utils";
import {Displayable, IdentifierMap} from "models/objects";

export interface NiceUtils extends NiceUtilsInterface {}

export function NiceUtils() {
    
}

export var niceUtils = new NiceUtils();

NiceUtils.prototype.getIndentation = function(indentationLevel: number): string {
    var output = "";
    var tempCount = 0;
    while (tempCount < indentationLevel) {
        output = output + "    ";
        tempCount += 1;
    }
    return output;
}

NiceUtils.prototype.getTextListDisplayString = function(
    title: string,
    textList: string[],
    indentationLevel?: number
): string {
    if (typeof indentationLevel === "undefined") {
        indentationLevel = 0
    }
    if (textList.length <= 0) {
        return "";
    }
    let tempIndentation1 = niceUtils.getIndentation(indentationLevel);
    let tempIndentation2 = niceUtils.getIndentation(indentationLevel + 1);
    let tempTextList = [tempIndentation1 + title + ":"];
    for (let text of textList) {
        tempTextList.push(tempIndentation2 + text);
    }
    return tempTextList.join("\n");
}

NiceUtils.prototype.getDisplayableListDisplayString = function(
    title: string,
    displayableList: Displayable[],
    indentationLevel?: number
): string {
    return niceUtils.getTextListDisplayString(
        title,
        displayableList.map(displayable => displayable.getDisplayString()),
        indentationLevel
    );
}

NiceUtils.prototype.getIdentifierMapDisplayString = function(
    title: string,
    identifierMap: IdentifierMap<Displayable>,
    indentationLevel?: number
): string {
    return niceUtils.getDisplayableListDisplayString(
        title,
        identifierMap.getValueList(),
        indentationLevel
    );
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

NiceUtils.prototype.pluralize = function(word: string, amount: number): string {
    if (amount == 1) {
        return word;
    } else {
        return word + "s";
    }
}


