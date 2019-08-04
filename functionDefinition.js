
var Assembler = require("./assembler").Assembler;
var AssemblyError = require("./assemblyError").AssemblyError;
var lineUtils = require("./lineUtils").lineUtils;

function FunctionDefinition(lineList) {
    this.lineList = lineList;
    this.jumpTableLineList = [];
    this.argVariableDefinitionList = [];
    this.localVariableDefinitionList = [];
    this.extractJumpTables();
    this.extractVariableDefinitions();
}

// Concrete subclasses of FunctionDefinition must implement getTitle.

FunctionDefinition.prototype.processLines = function(processLine) {
    var tempResult = lineUtils.processLines(this.lineList, processLine);
    this.lineList = tempResult.lineList;
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

FunctionDefinition.prototype.printAssembledState = function() {
    console.log(this.getTitle() + ":");
    lineUtils.printLineList(this.lineList, 1);
    if (this.jumpTableLineList.length > 0) {
        console.log("Jump table:");
        lineUtils.printLineList(this.jumpTableLineList, 1);
    }
    var tempIndentation = lineUtils.getIndentation(1);
    if (this.argVariableDefinitionList.length > 0) {
        console.log("Argument variables:");
        var index = 0;
        while (index < this.argVariableDefinitionList.length) {
            var tempDefinition = this.argVariableDefinitionList[index];
            console.log(tempIndentation + tempDefinition.toString());
            index += 1;
        }
    }
    if (this.localVariableDefinitionList.length > 0) {
        console.log("Local variables:");
        var index = 0;
        while (index < this.localVariableDefinitionList.length) {
            var tempDefinition = this.localVariableDefinitionList[index];
            console.log(tempIndentation + tempDefinition.toString());
            index += 1;
        }
    }
}

function EntryPointFunctionDefinition(lineList) {
    FunctionDefinition.call(this, lineList);
}

EntryPointFunctionDefinition.prototype = Object.create(FunctionDefinition.prototype);
EntryPointFunctionDefinition.prototype.constructor = EntryPointFunctionDefinition;

EntryPointFunctionDefinition.prototype.getTitle = function() {
    return "Entry point function";
}

function NamedFunctionDefinition(identifier, lineList) {
    this.identifier = identifier;
    FunctionDefinition.call(this, lineList);
}

NamedFunctionDefinition.prototype = Object.create(FunctionDefinition.prototype);
NamedFunctionDefinition.prototype.constructor = NamedFunctionDefinition;

function PrivateFunctionDefinition(identifier, lineList) {
    NamedFunctionDefinition.call(this, identifier, lineList);
}

PrivateFunctionDefinition.prototype = Object.create(NamedFunctionDefinition.prototype);
PrivateFunctionDefinition.prototype.constructor = PrivateFunctionDefinition;

PrivateFunctionDefinition.prototype.getTitle = function() {
    return "Private function " + this.identifier.toString();
}

function PublicFunctionDefinition(identifier, dependencyIndexExpression, lineList) {
    this.dependencyIndexExpression = dependencyIndexExpression;
    NamedFunctionDefinition.call(this, identifier, lineList);
}

PublicFunctionDefinition.prototype = Object.create(NamedFunctionDefinition.prototype);
PublicFunctionDefinition.prototype.constructor = PublicFunctionDefinition;

PublicFunctionDefinition.prototype.getTitle = function() {
    return "Public function " + this.identifier.toString();
}

module.exports = {
    FunctionDefinition: FunctionDefinition
};

require("./variableDefinition");

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
            var tempDefinition = new EntryPointFunctionDefinition(line.codeBlock);
            self.entryPointFunctionDefinition = tempDefinition;
            return [];
        }
        if (tempDirectiveName == "PRIVATE_FUNC") {
            if (tempArgList.length != 1) {
                throw new AssemblyError("Expected 1 argument.");
            }
            var tempIdentifier = tempArgList[0].getIdentifier();
            var tempDefinition = new PrivateFunctionDefinition(
                tempIdentifier,
                line.codeBlock
            );
            self.functionDefinitionMap.set(tempIdentifier, tempDefinition);
            return [];
        }
        if (tempDirectiveName == "PUBLIC_FUNC") {
            if (tempArgList.length != 2) {
                throw new AssemblyError("Expected 2 arguments.");
            }
            var tempIdentifier = tempArgList[0].getIdentifier();
            var tempDefinition = new PublicFunctionDefinition(
                tempIdentifier,
                tempArgList[1],
                line.codeBlock
            );
            self.functionDefinitionMap.set(tempIdentifier, tempDefinition);
            return [];
        }
        return null;
    });
    return tempResult.lineList;
}


