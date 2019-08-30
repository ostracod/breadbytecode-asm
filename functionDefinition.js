
var Assembler = require("./assembler").Assembler;
var AssemblyError = require("./assemblyError").AssemblyError;
var lineUtils = require("./lineUtils").lineUtils;

function FunctionDefinition(identifier, lineList) {
    this.identifier = identifier;
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

function PrivateFunctionDefinition(identifier, lineList) {
    FunctionDefinition.call(this, identifier, lineList);
}

PrivateFunctionDefinition.prototype = Object.create(FunctionDefinition.prototype);
PrivateFunctionDefinition.prototype.constructor = PrivateFunctionDefinition;

PrivateFunctionDefinition.prototype.getTitle = function() {
    return "Private function " + this.identifier.toString();
}

function InterfaceFunctionDefinition(identifier, dependencyIndexExpression, lineList) {
    this.dependencyIndexExpression = dependencyIndexExpression;
    FunctionDefinition.call(this, identifier, lineList);
}

InterfaceFunctionDefinition.prototype = Object.create(FunctionDefinition.prototype);
InterfaceFunctionDefinition.prototype.constructor = InterfaceFunctionDefinition;

// Concrete subclasses of InterfaceFunctionDefinition must implement getTitlePrefix.

InterfaceFunctionDefinition.prototype.getTitle = function() {
    return this.getTitlePrefix() + " function " + this.identifier.toString() + " (" + this.dependencyIndexExpression.toString() + ")";
}

function PublicFunctionDefinition(identifier, dependencyIndexExpression, lineList) {
    InterfaceFunctionDefinition.call(
        this,
        identifier,
        dependencyIndexExpression,
        lineList
    );
}

PublicFunctionDefinition.prototype = Object.create(InterfaceFunctionDefinition.prototype);
PublicFunctionDefinition.prototype.constructor = PublicFunctionDefinition;

PublicFunctionDefinition.prototype.getTitlePrefix = function() {
    return "Public";
}

function GuardFunctionDefinition(identifier, dependencyIndexExpression, lineList) {
    InterfaceFunctionDefinition.call(
        this,
        identifier,
        dependencyIndexExpression,
        lineList
    );
}

GuardFunctionDefinition.prototype = Object.create(InterfaceFunctionDefinition.prototype);
GuardFunctionDefinition.prototype.constructor = PublicFunctionDefinition;

GuardFunctionDefinition.prototype.getTitlePrefix = function() {
    return "Guard";
}

module.exports = {
    FunctionDefinition: FunctionDefinition
};

require("./variableDefinition");

Assembler.prototype.extractFunctionDefinitions = function(lineList) {
    var self = this;
    self.processLines(function(line) {
        var tempDirectiveName = line.directiveName;
        var tempArgList = line.argList;
        if (tempDirectiveName == "PRIVATE_FUNC") {
            if (tempArgList.length != 1) {
                throw new AssemblyError("Expected 1 argument.");
            }
            var tempIdentifier = tempArgList[0].getIdentifier();
            var tempDefinition = new PrivateFunctionDefinition(
                tempIdentifier,
                line.codeBlock
            );
            self.functionDefinitionList.push(tempDefinition);
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
            self.functionDefinitionList.push(tempDefinition);
            return [];
        }
        if (tempDirectiveName == "GUARD_FUNC") {
            if (tempArgList.length != 2) {
                throw new AssemblyError("Expected 2 arguments.");
            }
            var tempIdentifier = tempArgList[0].getIdentifier();
            var tempDefinition = new GuardFunctionDefinition(
                tempIdentifier,
                tempArgList[1],
                line.codeBlock
            );
            self.functionDefinitionList.push(tempDefinition);
            return [];
        }
        return null;
    });
}


