
var parseUtils = require("./parseUtils").parseUtils;
var lineUtils = require("./lineUtils").lineUtils;
var expressionUtils = require("./expressionUtils").expressionUtils;

function AssemblyLine(directiveName, argTextList) {
    this.directiveName = directiveName;
    this.argTextList = argTextList;
    this.argList = [];
    if (typeof argTextList !== "undefined") {
        var index = 0;
        while (index < this.argTextList.length) {
            var tempArg = parseUtils.parseArgText(this.argTextList[index]);
            this.argList.push(tempArg);
            index += 1;
        }
    }
    this.lineNumber = null;
    // List of AssemblyLine or null.
    this.codeBlock = null;
}

AssemblyLine.prototype.copy = function() {
    var output = new AssemblyLine(this.directiveName);
    output.argList = expressionUtils.copyExpressions(this.argList);
    output.lineNumber = this.lineNumber;
    if (this.codeBlock === null) {
        output.codeBlock = null;
    } else {
        output.codeBlock = copyLines(this.codeBlock);
    }
    return output;
}

AssemblyLine.prototype.toString = function(indentationLevel) {
    if (typeof indentationLevel === "undefined") {
        indentationLevel = 0;
    }
    var tempIndentation = lineUtils.getIndentation(indentationLevel);
    var tempTextList = [];
    var index = 0;
    while (index < this.argList.length) {
        var tempArg = this.argList[index];
        tempTextList.push(tempArg.toString());
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
            tempLineTextList.push(tempLine.toString(indentationLevel + 1));
            index += 1;
        }
        tempLineTextList.push("END");
        return tempLineTextList.join("\n");
    }
}

AssemblyLine.prototype.processExpressions = function(processExpression) {
    expressionUtils.processExpressions(this.argList, processExpression);
    if (this.codeBlock !== null) {
        lineUtils.processExpressionsInLines(this.codeBlock, processExpression);
    }
}

module.exports = {
    AssemblyLine: AssemblyLine,
};


