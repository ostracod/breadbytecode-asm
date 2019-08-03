
var Assembler = require("./assembler").Assembler;
var AssemblyError = require("./assemblyError").AssemblyError;
var lineUtils = require("./lineUtils").lineUtils;

function ConstantDefinition(identifier, expression) {
    this.identifier = identifier;
    this.expression = expression;
}

ConstantDefinition.prototype.printAssembledState = function() {
    console.log(this.identifier.toString() + " = " + this.expression.toString());
}

Assembler.prototype.extractConstantDefinitions = function(lineList) {
    var self = this;
    var tempResult = lineUtils.processLines(lineList, function(line) {
        var tempArgList = line.argList;
        if (line.directiveName == "DEF") {
            if (tempArgList.length != 2) {
                throw new AssemblyError("Expected 2 arguments.");
            }
            var tempIdentifier = tempArgList[0].getIdentifier();
            var tempExpression = tempArgList[1];
            var tempDefinition = new ConstantDefinition(tempIdentifier, tempExpression);
            self.constantDefinitionMap.set(tempIdentifier, tempDefinition);
            return [];
        }
        return null;
    });
    return tempResult.lineList;
}


