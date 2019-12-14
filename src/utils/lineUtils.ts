
import {ExpressionProcessor, LineProcessor} from "models/items";
import {LineUtils as LineUtilsInterface} from "models/utils";
import {AssemblyLine, IdentifierMap, Expression} from "models/objects";
import {AssemblyError} from "objects/assemblyError";

export interface LineUtils extends LineUtilsInterface {}

export class LineUtils {
    
}

export var lineUtils = new LineUtils();

LineUtils.prototype.copyLines = function(lineList: AssemblyLine[]): AssemblyLine[] {
    var output = [];
    var index = 0;
    while (index < lineList.length) {
        var tempLine = lineList[index];
        output.push(tempLine.copy());
        index += 1;
    }
    return output;
}

LineUtils.prototype.processExpressionsInLines = function(
    lineList: AssemblyLine[],
    processExpression: ExpressionProcessor,
    shouldRecurAfterProcess?: boolean
): void {
    var index = 0;
    while (index < lineList.length) {
        var tempLine = lineList[index];
        tempLine.processExpressions(processExpression, shouldRecurAfterProcess);
        index += 1;
    }
}

LineUtils.prototype.substituteIdentifiersInLines = function(lineList: AssemblyLine[], identifierExpressionMap: IdentifierMap<Expression>): void {
    lineUtils.processExpressionsInLines(lineList, function(expression) {
        return expression.substituteIdentifiers(identifierExpressionMap);
    });
}

LineUtils.prototype.populateMacroInvocationIdInLines = function(lineList: AssemblyLine[], macroInvocationId: number): void {
    lineUtils.processExpressionsInLines(lineList, function(expression) {
        expression.populateMacroInvocationId(macroInvocationId);
        return null;
    });
}

LineUtils.prototype.getIndentation = function(indentationLevel: number): string {
    var output = "";
    var tempCount = 0;
    while (tempCount < indentationLevel) {
        output = output + "    ";
        tempCount += 1;
    }
    return output;
}

LineUtils.prototype.getLineListDisplayString = function(lineList: AssemblyLine[], indentationLevel?: number): string {
    if (typeof indentationLevel === "undefined") {
        indentationLevel = 0;
    }
    var tempTextList = [];
    var index = 0;
    while (index < lineList.length) {
        var tempLine = lineList[index];
        tempTextList.push(tempLine.getDisplayString(indentationLevel));
        index += 1;
    }
    return tempTextList.join("\n");
}

// processLine accepts a single line and returns
// either a list of lines or null. If the return
// value is null, no modification takes place.
LineUtils.prototype.processLines = function(
    lineList: AssemblyLine[],
    processLine: LineProcessor,
    shouldProcessCodeBlocks?: boolean
): {lineList: AssemblyLine[], processCount: number} {
    if (typeof shouldProcessCodeBlocks === "undefined") {
        shouldProcessCodeBlocks = false;
    }
    var outputLineList: AssemblyLine[] = [];
    var processCount = 0;
    var index = 0;
    while (index < lineList.length) {
        var tempLine: AssemblyLine = lineList[index];
        try {
            var tempResult1 = processLine(tempLine);
        } catch(error) {
            if (error instanceof AssemblyError && error.lineNumber === null) {
                error.lineNumber = tempLine.lineNumber;
            }
            throw error;
        }
        if (tempResult1 === null) {
            outputLineList.push(tempLine);
        } else {
            var tempIndex = 0;
            while (tempIndex < tempResult1.length) {
                var tempLine2 = tempResult1[tempIndex];
                outputLineList.push(tempLine2);
                tempIndex += 1;
            }
            processCount += 1;
        }
        index += 1;
    }
    if (shouldProcessCodeBlocks) {
        var index = 0;
        while (index < outputLineList.length) {
            var tempLine: AssemblyLine = outputLineList[index];
            index += 1;
            if (tempLine.codeBlock === null) {
                continue;
            }
            var tempResult2 = lineUtils.processLines(
                tempLine.codeBlock,
                processLine,
                shouldProcessCodeBlocks
            );
            tempLine.codeBlock = tempResult2.lineList;
            processCount += tempResult2.processCount;
        }
    }
    return {
        lineList: outputLineList,
        processCount: processCount
    };
}


