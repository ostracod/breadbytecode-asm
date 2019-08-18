
var FunctionDefinition = require("./functionDefinition").FunctionDefinition;
var Assembler = require("./assembler").Assembler;

function VariableDefinition(identifier, dataType) {
    this.identifier = identifier;
    this.dataType = dataType;
}

VariableDefinition.prototype.toString = function() {
    return "VAR " + this.identifier.toString() + ", " + this.dataType.getName();
}

function ArgVariableDefinition(identifier, dataType, permList) {
    this.permList = permList;
    VariableDefinition.call(this, identifier, dataType);
}

ArgVariableDefinition.prototype = Object.create(VariableDefinition.prototype);
ArgVariableDefinition.prototype.constructor = ArgVariableDefinition;

ArgVariableDefinition.prototype.toString = function() {
    var tempTextList = [
        this.identifier.toString(),
        this.dataType.getName()
    ]
    var index = 0;
    while (index < this.permList.length) {
        var tempPerm = this.permList[index]
        var tempText = tempPerm.toString();
        tempTextList.push(tempText);
        index += 1;
    }
    return "ARG " + tempTextList.join(", ");
}

function extractLocalVariableDefinition(line) {
    if (line.directiveName != "VAR") {
        return null;
    }
    var tempArgList = line.argList;
    var tempIdentifier = tempArgList[0].getIdentifier();
    var tempDataType = tempArgList[1].getDataType();
    return new VariableDefinition(tempIdentifier, tempDataType);
}

function extractArgVariableDefinition(line) {
    if (line.directiveName != "ARG") {
        return null;
    }
    var tempArgList = line.argList;
    if (tempArgList.length < 2) {
        throw new AssemblyError("Expected at least 2 arguments.");
    }
    var tempIdentifier = tempArgList[0].getIdentifier();
    var tempDataType = tempArgList[1].getDataType();
    var tempPermList = [];
    var index = 2;
    while (index < tempArgList.length) {
        var tempArg = tempArgList[index];
        var tempPerm = tempArg.getArgPerm();
        tempPermList.push(tempPerm);
        index += 1;
    }
    return new ArgVariableDefinition(
        tempIdentifier,
        tempDataType,
        tempPermList
    );
}

FunctionDefinition.prototype.extractVariableDefinitions = function() {
    var self = this;
    self.processLines(function(line) {
        var tempDefinition = extractLocalVariableDefinition(line);
        if (tempDefinition !== null) {
            self.localVariableDefinitionList.push(tempDefinition);
            return [];
        }
        var tempDefinition = extractArgVariableDefinition(line);
        if (tempDefinition !== null) {
            self.argVariableDefinitionList.push(tempDefinition);
            return [];
        }
        return null;
    });
}

Assembler.prototype.extractGlobalVariableDefinitions = function() {
    var self = this;
    self.processLines(function(line) {
        var tempDefinition = extractLocalVariableDefinition(line);
        if (tempDefinition !== null) {
            self.globalVariableDefinitionList.push(tempDefinition);
            return [];
        }
        return null;
    });
}


