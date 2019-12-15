
import {LineProcessor} from "models/items";
import {LabeledLineList as LabeledLineListInterface, AssemblyLine} from "models/objects";

import {AssemblyError} from "objects/assemblyError";
import {LabelDefinition} from "objects/labelDefinition";

import {niceUtils} from "utils/niceUtils";
import {lineUtils} from "utils/lineUtils";

export interface LabeledLineList extends LabeledLineListInterface {}

export class LabeledLineList {
    constructor(lineList: AssemblyLine[]) {
        this.lineList = lineList;
        this.labelDefinitionList = null;
    }
}

LabeledLineList.prototype.processLines = function(processLine: LineProcessor): void {
    var tempResult = lineUtils.processLines(this.lineList, processLine);
    this.lineList = tempResult.lineList;
}

LabeledLineList.prototype.extractLabelDefinitions = function(): void {
    var self = this;
    self.labelDefinitionList = [];
    var index = 0;
    self.processLines(function(line) {
        var tempArgList = line.argList;
        if (line.directiveName == "LBL") {
            if (tempArgList.length != 1) {
                throw new AssemblyError("Expected 1 argument.");
            }
            var tempIdentifier = tempArgList[0].evaluateToIdentifier();
            var tempDefinition = new LabelDefinition(tempIdentifier, index);
            self.labelDefinitionList.push(tempDefinition);
            return [];
        }
        index += 1;
        return null;
    });
}

LabeledLineList.prototype.getDisplayString = function(title: string, indentationLevel?: number): string {
    if (typeof indentationLevel === "undefined") {
        indentationLevel = 0
    }
    if (this.lineList.length <= 0) {
        return "";
    }
    var tempIndentation = lineUtils.getIndentation(indentationLevel);
    var tempTextList = [tempIndentation + title + ":"];
    tempTextList.push(lineUtils.getLineListDisplayString(this.lineList, indentationLevel + 1));
    tempTextList.push(niceUtils.getDefinitionListDisplayString(
        title + " labels",
        this.labelDefinitionList,
        indentationLevel
    ));
    return niceUtils.joinTextList(tempTextList);
}


