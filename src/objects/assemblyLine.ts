
import {ExpressionProcessor} from "models/items";
import {AssemblyLine as AssemblyLineInterface, Expression, FunctionDefinition} from "models/objects";

import {niceUtils} from "utils/niceUtils";
import {lineUtils} from "utils/lineUtils";
import {expressionUtils} from "utils/expressionUtils";

import {instructionTypeMap} from "delegates/instructionType";

import {AssemblyError} from "objects/assemblyError";
import {Instruction} from "objects/instruction";

export interface AssemblyLine extends AssemblyLineInterface {}

export class AssemblyLine {
    constructor(directiveName: string, argList: Expression[]) {
        this.directiveName = directiveName;
        this.argList = argList;
        this.lineNumber = null;
        // List of AssemblyLine or null.
        this.codeBlock = null;
    }
}

AssemblyLine.prototype.copy = function(): AssemblyLine {
    var tempArgList = expressionUtils.copyExpressions(this.argList);
    var output = new AssemblyLine(this.directiveName, tempArgList);
    output.lineNumber = this.lineNumber;
    if (this.codeBlock === null) {
        output.codeBlock = null;
    } else {
        output.codeBlock = lineUtils.copyLines(this.codeBlock);
    }
    return output;
}

AssemblyLine.prototype.getDisplayString = function(indentationLevel: number): string {
    if (typeof indentationLevel === "undefined") {
        indentationLevel = 0;
    }
    var tempIndentation = niceUtils.getIndentation(indentationLevel);
    var tempTextList = [];
    var index = 0;
    while (index < this.argList.length) {
        var tempArg = this.argList[index];
        tempTextList.push(tempArg.getDisplayString());
        index += 1;
    }
    var tempLineText = tempIndentation + this.directiveName + " " + tempTextList.join(", ");
    if (this.codeBlock === null) {
        return tempLineText;
    } else {
        var tempLineTextList = [tempLineText];
        var index = 0;
        while (index < this.codeBlock.length) {
            var tempLine = this.codeBlock[index];
            tempLineTextList.push(tempLine.getDisplayString(indentationLevel + 1));
            index += 1;
        }
        tempLineTextList.push("END");
        return tempLineTextList.join("\n");
    }
}

AssemblyLine.prototype.processExpressions = function(
    processExpression: ExpressionProcessor,
    shouldRecurAfterProcess?: boolean
): void {
    expressionUtils.processExpressions(this.argList, processExpression, shouldRecurAfterProcess);
    if (this.codeBlock !== null) {
        lineUtils.processExpressionsInLines(this.codeBlock, processExpression, shouldRecurAfterProcess);
    }
}

AssemblyLine.prototype.assembleInstruction = function(): Instruction {
    if (!(this.directiveName in instructionTypeMap)) {
        throw new AssemblyError("Unrecognized opcode mnemonic.");
    }
    let tempInstructionType = instructionTypeMap[this.directiveName];
    let tempAmount = tempInstructionType.argAmount;
    if (this.argList.length !== tempAmount) {
        throw new AssemblyError(`Expected ${tempInstructionType.argAmount} ${niceUtils.pluralize("argument", tempAmount)}.`);
    }
    var tempArgList = this.argList.map(expression => {
        return expression.evaluateToInstructionArg();
    });
    return new Instruction(tempInstructionType, tempArgList);
}


