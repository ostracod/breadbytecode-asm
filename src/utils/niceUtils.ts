
import {NiceUtils as NiceUtilsInterface} from "models/utils";
import {Displayable, IdentifierMap} from "models/objects";

export interface NiceUtils extends NiceUtilsInterface {}

export class NiceUtils {
    
    getIndentation(indentationLevel: number): string {
        let output = "";
        for (let count = 0; count < indentationLevel; count++) {
            output = output + "    ";
        }
        return output;
    }
    
    getTextListDisplayString(
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
    
    getDisplayableListDisplayString(
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
    
    getIdentifierMapDisplayString(
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
    joinTextList(textList: string[]): string {
        let tempTextList = [];
        for (let text of textList) {
            if (text.length > 0) {
                tempTextList.push(text);
            }
        }
        return tempTextList.join("\n");
    }
    
    getReverseMap(map: {[key: string]: any}): {[key: string]: any} {
        let output = {};
        for (let key in map) {
            let tempValue = map[key];
            output[tempValue] = key;
        }
        return output;
    }
    
    pluralize(word: string, amount: number): string {
        if (amount == 1) {
            return word;
        } else {
            return word + "s";
        }
    }
}

export const niceUtils = new NiceUtils();


