
import {ExpressionProcessor, LineProcessor} from "models/items";
import {LineUtils as LineUtilsInterface} from "models/utils";
import {AssemblyLine, IdentifierMap, Expression} from "models/objects";
import {AssemblyError} from "objects/assemblyError";

export interface LineUtils extends LineUtilsInterface {}

export class LineUtils {
    
    copyLines(lineList: AssemblyLine[]): AssemblyLine[] {
        let output = [];
        for (let line of lineList) {
            output.push(line.copy());
        }
        return output;
    }
    
    processExpressionsInLines(
        lineList: AssemblyLine[],
        processExpression: ExpressionProcessor,
        shouldRecurAfterProcess?: boolean
    ): void {
        for (let line of lineList) {
            line.processExpressions(processExpression, shouldRecurAfterProcess);
        }
    }
    
    substituteIdentifiersInLines(lineList: AssemblyLine[], identifierExpressionMap: IdentifierMap<Expression>): void {
        lineUtils.processExpressionsInLines(lineList, expression => {
            return expression.substituteIdentifiers(identifierExpressionMap);
        });
    }
    
    populateMacroInvocationIdInLines(lineList: AssemblyLine[], macroInvocationId: number): void {
        lineUtils.processExpressionsInLines(lineList, expression => {
            expression.populateMacroInvocationId(macroInvocationId);
            return null;
        });
    }
    
    getLineListDisplayString(lineList: AssemblyLine[], indentationLevel?: number): string {
        if (typeof indentationLevel === "undefined") {
            indentationLevel = 0;
        }
        let tempTextList = [];
        for (let line of lineList) {
            tempTextList.push(line.getDisplayString(indentationLevel));
        }
        return tempTextList.join("\n");
    }
    
    // processLine accepts a single line and returns
    // either a list of lines or null. If the return
    // value is null, no modification takes place.
    processLines(
        lineList: AssemblyLine[],
        processLine: LineProcessor,
        shouldProcessCodeBlocks?: boolean
    ): {lineList: AssemblyLine[], processCount: number} {
        if (typeof shouldProcessCodeBlocks === "undefined") {
            shouldProcessCodeBlocks = false;
        }
        let outputLineList: AssemblyLine[] = [];
        let processCount = 0;
        for (let line of lineList) {
            try {
                var tempResult1 = processLine(line);
            } catch(error) {
                if (error instanceof AssemblyError) {
                    if (error.lineNumber === null) {
                        error.lineNumber = line.lineNumber;
                    }
                    if (error.filePath === null) {
                        error.filePath = line.filePath;
                    }
                }
                throw error;
            }
            if (tempResult1 === null) {
                outputLineList.push(line);
            } else {
                for (let tempLine of tempResult1) {
                    outputLineList.push(tempLine);
                }
                processCount += 1;
            }
        }
        if (shouldProcessCodeBlocks) {
            for (let line of outputLineList) {
                if (line.codeBlock === null) {
                    continue;
                }
                let tempResult2 = lineUtils.processLines(
                    line.codeBlock,
                    processLine,
                    shouldProcessCodeBlocks
                );
                line.codeBlock = tempResult2.lineList;
                processCount += tempResult2.processCount;
            }
        }
        return {
            lineList: outputLineList,
            processCount: processCount
        };
    }
}

export const lineUtils = new LineUtils();


