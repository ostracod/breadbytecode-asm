
var Assembler = require("./assembler").Assembler;
var AssemblyError = require("./assemblyError").AssemblyError;
var lineUtils = require("./lineUtils").lineUtils;

// If name is null, then the function is the entry point.
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
    this.argVariableList = [];
    this.localVariableList = [];
    this.extractJumpTables();
    this.extractVariableDefinitions();
}

FunctionDefinition.prototype.processLines = function(processLine) {
    var self = this;
    var tempResult = lineUtils.processLines(self.lineList, processLine);
    self.lineList = tempResult.lineList;
}

FunctionDefinition.prototype.extractJumpTables = function() {
    var self = this;
    self.processLines(function(line) {
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
}

FunctionDefinition.prototype.extractVariableDefinitions = function() {
    var self = this;
    self.processLines(function(line) {
        var tempDirectiveName = line.directiveName;
        if (line.directiveName == "ARG") {
            if (line.argList.length < 2) {
                throw new AssemblyError("Expected at least 2 arguments.");
            }
            // TODO: Create the argument variable.
            
            return [];
        }
        if (line.directiveName == "VAR") {
            if (line.argList.length != 2) {
                throw new AssemblyError("Expected 2 arguments.");
            }
            // TODO: Create the local variable.
            
            return [];
        }
        return null;
    });
}

FunctionDefinition.prototype.printAssembledState = function() {
    var tempText;
    if (this.name === null) {
        console.log("Entry point function:");
    } else {
        if (this.isPublic) {
            tempText = "Public function";
        } else {
            tempText = "Private function";
        }
        console.log(tempText + " " + this.name + ":");
    }
    lineUtils.printLineList(this.lineList, 1);
    if (this.jumpTableLineList.length > 0) {
        console.log("Jump table:");
        lineUtils.printLineList(this.jumpTableLineList, 1);
    }
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


