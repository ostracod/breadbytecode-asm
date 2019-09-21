
var Assembler = require("./assembler").Assembler;
var AssemblyError = require("./assemblyError").AssemblyError;
var lineUtils = require("./lineUtils").lineUtils;

var tempResource = require("./identifier");
var Identifier = tempResource.Identifier;
var IdentifierMap = tempResource.IdentifierMap;

function MacroDefinition(name, argIdentifierList, lineList) {
    this.name = name;
    this.argIdentifierList = argIdentifierList;
    this.lineList = lineList;
}

MacroDefinition.prototype.invoke = function(argList, macroInvocationId) {
    if (argList.length != this.argIdentifierList.length) {
        throw new AssemblyError("Wrong number of macro arguments.");
    }
    // Map from argument identifier to expression.
    var identifierExpressionMap = new IdentifierMap();
    var index = 0;
    while (index < this.argIdentifierList.length) {
        var tempIdentifier = this.argIdentifierList[index];
        var tempExpression = argList[index];
        identifierExpressionMap.set(tempIdentifier, tempExpression);
        index += 1;
    }
    var output = lineUtils.copyLines(this.lineList);
    lineUtils.substituteIdentifiersInLines(output, identifierExpressionMap);
    lineUtils.populateMacroInvocationIdInLines(output, macroInvocationId);
    return output;
}

MacroDefinition.prototype.printAssembledState = function() {
    var tempTextList = [];
    var index = 0;
    while (index < this.argIdentifierList.length) {
        var tempIdentifier = this.argIdentifierList[index];
        tempTextList.push(tempIdentifier.getDisplayString());
        index += 1;
    }
    console.log(this.name + " " + tempTextList.join(", ") + ":");
    lineUtils.printLineList(this.lineList, 1);
}

Assembler.prototype.extractMacroDefinitions = function(lineList) {
    var self = this;
    var tempResult = lineUtils.processLines(lineList, function(line) {
        var tempArgList = line.argList;
        if (line.directiveName == "MACRO") {
            if (tempArgList.length < 1) {
                throw new AssemblyError("Expected at least 1 argument.");
            }
            var tempNameIdentifier = tempArgList[0].evaluateToIdentifier();
            var tempName = tempNameIdentifier.name;
            var tempIdentifierList = [];
            var index = 1;
            while (index < tempArgList.length) {
                var tempIdentifier = tempArgList[index].evaluateToIdentifier();
                tempIdentifierList.push(tempIdentifier);
                index += 1;
            }
            var tempDefinition = new MacroDefinition(
                tempName,
                tempIdentifierList,
                line.codeBlock
            );
            self.macroDefinitionMap[tempName] = tempDefinition;
            return [];
        }
        return null;
    });
    return tempResult.lineList;
}

Assembler.prototype.expandMacroInvocations = function(lineList) {
    var self = this;
    var tempResult = lineUtils.processLines(lineList, function(line) {
        var tempDirectiveName = line.directiveName;
        if (tempDirectiveName in self.macroDefinitionMap) {
            var tempDefinition = self.macroDefinitionMap[tempDirectiveName];
            var macroInvocationId = self.getNextMacroInvocationId();
            return tempDefinition.invoke(line.argList, macroInvocationId);
        }
        return null;
    }, true);
    return {
        lineList: tempResult.lineList,
        expandCount: tempResult.processCount
    };
}


