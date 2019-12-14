
import {ExpressionProcessor} from "models/items";
import {Expression, AssemblyLine as AssemblyLineInterface} from "models/objects";
import {parseUtils} from "utils/parseUtils";
import {lineUtils} from "utils/lineUtils";
import {expressionUtils} from "utils/expressionUtils";

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
    var tempIndentation = lineUtils.getIndentation(indentationLevel);
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

