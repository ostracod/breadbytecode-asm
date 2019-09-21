
var AssemblyError = require("./assemblyError").AssemblyError;

function LineUtils() {
    
}

var lineUtils = new LineUtils();

LineUtils.prototype.copyLines = function(lineList) {
    var output = [];
    var index = 0;
    while (index < lineList.length) {
        var tempLine = lineList[index];
        output.push(tempLine.copy());
        index += 1;
    }
    return output;
}

LineUtils.prototype.processExpressionsInLines = function(lineList, processExpression, shouldRecurAfterProcess) {
    var index = 0;
    while (index < lineList.length) {
        var tempLine = lineList[index];
        tempLine.processExpressions(processExpression, shouldRecurAfterProcess);
        index += 1;
    }
}

LineUtils.prototype.substituteIdentifiersInLines = function(lineList, identifierExpressionMap) {
    lineUtils.processExpressionsInLines(lineList, function(expression) {
        return expression.substituteIdentifiers(identifierExpressionMap);
    });
}

LineUtils.prototype.populateMacroInvocationIdInLines = function(lineList, macroInvocationId) {
    lineUtils.processExpressionsInLines(lineList, function(expression) {
        expression.populateMacroInvocationId(macroInvocationId);
        return null;
    });
}

LineUtils.prototype.getIndentation = function(indentationLevel) {
    var output = "";
    var tempCount = 0;
    while (tempCount < indentationLevel) {
        output = output + "    ";
        tempCount += 1;
    }
    return output;
}

LineUtils.prototype.printLineList = function(lineList, indentationLevel) {
    if (typeof indentationLevel === "undefined") {
        indentationLevel = 0;
    }
    var index = 0;
    while (index < lineList.length) {
        var tempLine = lineList[index];
        console.log(tempLine.getDisplayString(indentationLevel));
        index += 1;
    }
}

// processLine accepts a single line and returns
// either a list of lines or null. If the return
// value is null, no modification takes place.
// Output format of processLines:
// {
//   lineList: LineList[],
//   processCount: number
// }
LineUtils.prototype.processLines = function(lineList, processLine, shouldProcessCodeBlocks) {
    if (typeof shouldProcessCodeBlocks === "undefined") {
        shouldProcessCodeBlocks = false;
    }
    var outputLineList = [];
    var processCount = 0;
    var index = 0;
    while (index < lineList.length) {
        var tempLine = lineList[index];
        try {
            var tempResult = processLine(tempLine);
        } catch(error) {
            if (error instanceof AssemblyError && error.lineNumber === null) {
                error.lineNumber = tempLine.lineNumber;
            }
            throw error;
        }
        if (tempResult === null) {
            outputLineList.push(tempLine);
        } else {
            var tempIndex = 0;
            while (tempIndex < tempResult.length) {
                var tempLine2 = tempResult[tempIndex];
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
            var tempLine = outputLineList[index];
            index += 1;
            if (tempLine.codeBlock === null) {
                continue;
            }
            var tempResult = lineUtils.processLines(
                tempLine.codeBlock,
                processLine,
                shouldProcessCodeBlocks
            );
            tempLine.codeBlock = tempResult.lineList;
            processCount += tempResult.processCount;
        }
    }
    return {
        lineList: outputLineList,
        processCount: processCount
    };
}

module.exports = {
    lineUtils: lineUtils
};


