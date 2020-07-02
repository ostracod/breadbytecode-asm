
import {LineProcessor, LabelDefinitionClass} from "models/items";
import {
    LabeledLineList as LabeledLineListInterface,
    InstructionLineList as InstructionLineListInterface,
    DataLineList as DataLineListInterface,
    AssemblyLine, FunctionDefinition, Instruction, Scope, Expression, Constant
} from "models/objects";

import {BetaType, unsignedInteger64Type} from "delegates/dataType";

import {AssemblyError} from "objects/assemblyError";
import {InstructionLabelDefinition, JumpTableLabelDefinition, AppDataLabelDefinition} from "objects/labelDefinition";
import {IdentifierMap} from "objects/identifier";

import {niceUtils} from "utils/niceUtils";
import {lineUtils} from "utils/lineUtils";

export interface LabeledLineList extends LabeledLineListInterface {}

export class LabeledLineList {
    
    constructor(lineList: AssemblyLine[]) {
        this.lineList = lineList;
        this.labelDefinitionMap = null;
    }
    
    populateScope(scope: Scope) {
        lineUtils.processExpressionsInLines(this.lineList, expression => {
            expression.scope = scope;
            return null;
        });
    }
    
    processLines(processLine: LineProcessor): void {
        var tempResult = lineUtils.processLines(this.lineList, processLine);
        this.lineList = tempResult.lineList;
    }
    
    getLineElementIndexMap(): {[lineIndex: number]: number} {
        var output = {};
        var elementIndex = 0;
        var lineIndex = 0;
        output[lineIndex] = elementIndex;
        this.processLines(line => {
            lineIndex += 1;
            elementIndex += this.getLineElementLength(line);
            output[lineIndex] = elementIndex;
            return null;
        });
        return output;
    }
    
    extractLabelDefinitions(): void {
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
    
    getDisplayString(title: string, indentationLevel?: number): string {
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
}

export interface InstructionLineList extends InstructionLineListInterface {}

export class InstructionLineList extends LabeledLineList {
    
    getLabelDefinitionClass(): LabelDefinitionClass {
        return InstructionLabelDefinition;
    }
    
    getLineElementLength(line: AssemblyLine): number {
        return 1;
    }
    
    assembleInstructions(): Instruction[] {
        let output = [];
        this.processLines(line => {
            output.push(line.assembleInstruction());
            return null;
        });
        return output;
    }
}

export interface DataLineList extends DataLineListInterface {}

export class DataLineList extends LabeledLineList {
    
    constructor(lineList: AssemblyLine[], scope: Scope) {
        super(lineList);
        this.populateScope(scope);
    }
    
    extractLabelDefinitions(): void {
        super.extractLabelDefinitions();
        this.processLines(line => {
            if (line.directiveName != "DATA") {
                throw new AssemblyError("Expected DATA directive.");
            }
            return null;
        });
    }
    
    createBuffer(): Buffer {
        let bufferList = [];
        this.processLines(line => {
            let tempBufferList = line.argList.map(arg => {
                let tempConstant = this.convertExpressionToConstant(arg);
                if (!(tempConstant.getDataType() instanceof BetaType)) {
                    throw new AssemblyError("Expected beta type.");
                }
                return tempConstant.createBuffer();
            });
            bufferList.push(Buffer.concat(tempBufferList));
            return null;
        });
        return Buffer.concat(bufferList);
    }
}

export class JumpTableLineList extends DataLineList {
    
    getLabelDefinitionClass(): LabelDefinitionClass {
        return JumpTableLabelDefinition;
    }
    
    getLineElementLength(line: AssemblyLine): number {
        return line.argList.length;
    }
    
    convertExpressionToConstant(expression: Expression): Constant {
        let output = expression.evaluateToConstant();
        output.setDataType(unsignedInteger64Type);
        return output;
    }
}

export class AppDataLineList extends DataLineList {
    
    getLabelDefinitionClass(): LabelDefinitionClass {
        return AppDataLabelDefinition;
    }
    
    getLineElementLength(line: AssemblyLine): number {
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
    
    convertExpressionToConstant(expression: Expression): Constant {
        return expression.evaluateToConstant();
    }
}


