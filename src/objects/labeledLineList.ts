
import {LineProcessor, LabelDefinitionClass} from "models/items";
import {LabeledLineList as LabeledLineListInterface, AssemblyLine, FunctionDefinition} from "models/objects";

import {BetaType} from "delegates/dataType";

import {AssemblyError} from "objects/assemblyError";
import {LabelDefinition, AppDataLabelDefinition} from "objects/labelDefinition";
import {IdentifierMap} from "objects/identifier";

import {niceUtils} from "utils/niceUtils";
import {lineUtils} from "utils/lineUtils";

export interface LabeledLineList extends LabeledLineListInterface {}

export class LabeledLineList {
    constructor(lineList: AssemblyLine[]) {
        this.lineList = lineList;
        this.labelDefinitionMap = null;
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
    let tempLabelDefinitionClass = this.getLabelDefinitionClass();
    this.labelDefinitionMap = new IdentifierMap();
    let index = 0;
    this.processLines(line => {
        var tempArgList = line.argList;
        if (line.directiveName == "LBL") {
            if (tempArgList.length != 1) {
                throw new AssemblyError("Expected 1 argument.");
            }
            var tempIdentifier = tempArgList[0].evaluateToIdentifier();
            var tempDefinition = new tempLabelDefinitionClass(tempIdentifier, index);
            this.labelDefinitionMap.setIndexDefinition(tempDefinition);
            return [];
        }
        index += 1;
        return null;
    });
    let lineElementIndexMap = this.getLineElementIndexMap();
    this.labelDefinitionMap.iterate(labelDefinition => {
        labelDefinition.index = lineElementIndexMap[labelDefinition.lineIndex];
        index += 1;
    });
}

LabeledLineList.prototype.getDisplayString = function(title: string, indentationLevel?: number): string {
    if (typeof indentationLevel === "undefined") {
        indentationLevel = 0
    }
    if (this.lineList.length <= 0) {
        return "";
    }
    var tempIndentation = niceUtils.getIndentation(indentationLevel);
    var tempTextList = [tempIndentation + title + ":"];
    tempTextList.push(lineUtils.getLineListDisplayString(this.lineList, indentationLevel + 1));
    tempTextList.push(niceUtils.getIdentifierMapDisplayString(
        title + " labels",
        this.labelDefinitionMap,
        indentationLevel
    ));
    return niceUtils.joinTextList(tempTextList);
}

LabeledLineList.prototype.getLabelDefinitionClass = function(): LabelDefinitionClass {
    return LabelDefinition;
}

export class InstructionLineList extends LabeledLineList {
    constructor(lineList: AssemblyLine[], functionDefinition: FunctionDefinition) {
        super(lineList);
        lineUtils.processExpressionsInLines(this.lineList, expression => {
            expression.functionDefinition = functionDefinition;
            return null;
        });
    }
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

AppDataLineList.prototype.getLabelDefinitionClass = function(): LabelDefinitionClass {
    return AppDataLabelDefinition;
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


