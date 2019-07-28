
var Assembler = require("./assembler").Assembler;
var AssemblyError = require("./assemblyError").AssemblyError;
var lineUtils = require("./lineUtils").lineUtils;

Assembler.prototype.extractConstantDefinitions = function(lineList) {
    var self = this;
    var tempResult = lineUtils.processLines(lineList, function(line) {
        var tempArgList = line.argList;
        if (line.directiveName == "DEF") {
            if (tempArgList.length != 2) {
                throw new AssemblyError("Expected 2 arguments.");
            }
            var tempName = tempArgList[0].getIdentifier();
            var tempExpression = tempArgList[1];
            self.constantDefinitionMap[tempName] = tempExpression;
            return [];
        }
        return null;
    });
    return tempResult.lineList;
}


