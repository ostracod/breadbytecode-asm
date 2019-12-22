
import {LineProcessor} from "models/items";
import {LabeledLineList as LabeledLineListInterface, AssemblyLine} from "models/objects";

import {BetaType} from "delegates/dataType";

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

LabeledLineList.prototype.getLineElementIndexMap = function(): {[lineIndex: number]: number} {
    var output = {};
    var elementIndex = 0;
    var lineIndex = 0;
    output[lineIndex] = elementIndex;
    while (lineIndex < this.lineList.length) {
        var tempLine = this.lineList[lineIndex];
        lineIndex += 1;
        try {
            elementIndex += this.getLineElementLength(tempLine);
            output[lineIndex] = elementIndex;
        } catch (error) {
            if (error instanceof AssemblyError) {
                error.lineNumber = tempLine.lineNumber;
            }
            throw error;
        }
    }
    return output;
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
    var lineElementIndexMap = this.getLineElementIndexMap();
    var index = 0;
    while (index < this.labelDefinitionList.length) {
        var tempLabel = this.labelDefinitionList[index];
        tempLabel.elementIndex = lineElementIndexMap[tempLabel.lineIndex];
        index += 1;
    }
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

export class InstructionLineList extends LabeledLineList {
    
}

InstructionLineList.prototype.getLineElementLength = function(line: AssemblyLine): number {
    return 1;
}

export class JumpTableLineList extends LabeledLineList {
    
}

JumpTableLineList.prototype.getLineElementLength = function(line: AssemblyLine): number {
    if (line.directiveName != "DATA") {
        throw new AssemblyError("Expected DATA directive.");
    }
    return line.argList.length;
}

export class AppDataLineList extends LabeledLineList {
    
}

AppDataLineList.prototype.getLineElementLength = function(line: AssemblyLine): number {
    if (line.directiveName != "DATA") {
        throw new AssemblyError("Expected DATA directive.");
    }
    var output = 0;
    var index = 0;
    while (index < line.argList.length) {
        var tempExpression = line.argList[index];
        var tempDataType = tempExpression.getConstantDataType();
        if (!(tempDataType instanceof BetaType)) {
            throw new AssemblyError("Expected beta type.");
        }
        output += (tempDataType as BetaType).byteAmount;
        index += 1;
    }
    return output;
}


