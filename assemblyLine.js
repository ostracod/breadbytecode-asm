
var parseUtils = require("./parseUtils").parseUtils;
var lineUtils = require("./lineUtils").lineUtils;
var expressionUtils = require("./expressionUtils").expressionUtils;

function AssemblyLine(directiveName, argList) {
    this.directiveName = directiveName;
    this.argList = argList;
    this.lineNumber = null;
    // List of AssemblyLine or null.
    this.codeBlock = null;
}

AssemblyLine.prototype.copy = function() {
    var tempArgList = expressionUtils.copyExpressions(this.argList);
    var output = new AssemblyLine(this.directiveName, tempArgList);
    output.lineNumber = this.lineNumber;
    if (this.codeBlock === null) {
        output.codeBlock = null;
    } else {
        output.codeBlock = copyLines(this.codeBlock);
    }
    return output;
}

AssemblyLine.prototype.getDisplayString = function(indentationLevel) {
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

AssemblyLine.prototype.processExpressions = function(processExpression, shouldRecurAfterProcess) {
    expressionUtils.processExpressions(this.argList, processExpression, shouldRecurAfterProcess);
    if (this.codeBlock !== null) {
        lineUtils.processExpressionsInLines(this.codeBlock, processExpression, shouldRecurAfterProcess);
    }
}

module.exports = {
    AssemblyLine: AssemblyLine,
};


