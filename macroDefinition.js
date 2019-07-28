
var Assembler = require("./assembler").Assembler;
var AssemblyError = require("./assemblyError").AssemblyError;
var lineUtils = require("./lineUtils").lineUtils;

function MacroDefinition(name, argNameList, lineList) {
    this.name = name;
    this.argNameList = argNameList;
    this.lineList = lineList;
}

MacroDefinition.prototype.invoke = function(argList, macroInvocationId) {
    if (argList.length != this.argNameList.length) {
        throw new AssemblyError("Wrong number of macro arguments.");
    }
    // Map from argument name to expression.
    var nameExpressionMap = {};
    var index = 0;
    while (index < this.argNameList.length) {
        var tempName = this.argNameList[index];
        var tempExpression = argList[index];
        nameExpressionMap[tempName] = tempExpression;
        index += 1;
    }
    var output = lineUtils.copyLines(this.lineList);
    lineUtils.substituteIdentifiersInLines(output, nameExpressionMap);
    lineUtils.populateMacroInvocationIdInLines(output, macroInvocationId);
    return output;
}

Assembler.prototype.extractMacroDefinitions = function(lineList) {
    var self = this;
    var tempResult = lineUtils.processLines(lineList, function(line) {
        var tempArgList = line.argList;
        if (line.directiveName == "MACRO") {
            if (tempArgList.length < 1) {
                throw new AssemblyError("Expected at least 1 argument.");
            }
            var tempName = tempArgList[0].getIdentifier();
            var tempArgNameList = [];
            var index = 1;
            while (index < tempArgList.length) {
                var tempArgName = tempArgList[index].getIdentifier();
                tempArgNameList.push(tempArgName);
                index += 1;
            }
            var tempDefinition = new MacroDefinition(
                tempName,
                tempArgNameList,
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


