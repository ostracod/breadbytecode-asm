
var Assembler = require("./assembler").Assembler;
var AssemblyError = require("./assemblyError").AssemblyError;
var lineUtils = require("./lineUtils").lineUtils;

function FunctionDefinition(name, dependencyIndexExpression, lineList) {
    this.name = name;
    if (dependencyIndexExpression === null) {
        this.isPublic = false;
    } else {
        this.isPublic = true;
        this.dependencyIndexExpression = dependencyIndexExpression;
    }
    this.lineList = lineList;
    this.jumpTableLineList = [];
    this.extractJumpTables();
}

FunctionDefinition.prototype.extractJumpTables = function() {
    var self = this;
    var tempResult = lineUtils.processLines(self.lineList, function(line) {
        if (line.directiveName == "JMP_TABLE") {
            if (line.argList.length != 0) {
                throw new AssemblyError("Expected 0 arguments.");
            }
            var index = 0;
            while (index < line.codeBlock.length) {
                var tempLine = line.codeBlock[index];
                self.jumpTableLineList.push(tempLine);
                index += 1;
            }
            return [];
        }
        return null;
    });
    self.lineList = tempResult.lineList;
}

Assembler.prototype.extractFunctionDefinitions = function(lineList) {
    var self = this;
    var tempResult = lineUtils.processLines(lineList, function(line) {
        var tempDirectiveName = line.directiveName;
        var tempArgList = line.argList;
        if (tempDirectiveName == "ENTRY_FUNC") {
            if (tempArgList.length != 0) {
                throw new AssemblyError("Expected 0 arguments.");
            }
            if (self.entryPointFunctionDefinition !== null) {
                throw new AssemblyError("Application must contain exactly one entry point.");
            }
            var tempDefinition = new FunctionDefinition(
                null,
                null,
                line.codeBlock
            );
            self.entryPointFunctionDefinition = tempDefinition;
            return [];
        }
        if (tempDirectiveName == "PRIVATE_FUNC") {
            if (tempArgList.length != 1) {
                throw new AssemblyError("Expected 1 argument.");
            }
            var tempName = tempArgList[0].getIdentifier();
            var tempDefinition = new FunctionDefinition(
                tempName,
                null,
                line.codeBlock
            );
            self.functionDefinitionMap[tempName] = tempDefinition;
            return [];
        }
        if (tempDirectiveName == "PUBLIC_FUNC") {
            if (tempArgList.length != 2) {
                throw new AssemblyError("Expected 2 arguments.");
            }
            var tempName = tempArgList[0].getIdentifier();
            var tempDefinition = new FunctionDefinition(
                tempName,
                tempArgList[1],
                line.codeBlock
            );
            self.functionDefinitionMap[tempName] = tempDefinition;
            return [];
        }
        return null;
    });
    return tempResult.lineList;
}


