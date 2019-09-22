
import {NiceUtils as NiceUtilsInterface} from "models/utils";
import {Definition} from "models/objects";
import {lineUtils} from "utils/lineUtils";

export interface NiceUtils extends NiceUtilsInterface {}

export function NiceUtils() {
    
}

export var niceUtils = new NiceUtils();

NiceUtils.prototype.getDefinitionListDisplayString = function(title: string, definitionList: Definition[]): string {
    if (definitionList.length <= 0) {
        return "";
    }
    var tempIndentation = lineUtils.getIndentation(1);
    var tempTextList = [title + ":"];
    var index = 0;
    while (index < definitionList.length) {
        var tempDefinition = definitionList[index];
        tempTextList.push(tempIndentation + tempDefinition.getDisplayString());
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


