
var ArgPerms = require("./argPerms").ArgPerms;
var FunctionDefinition = require("./functionDefinition").FunctionDefinition;

function VariableDefinition(identifier, dataType) {
    this.identifier = identifier;
    this.dataType = dataType;
}

function LocalVariableDefinition(identifier, dataType) {
    VariableDefinition.call(this, identifier, dataType);
}

LocalVariableDefinition.prototype = Object.create(VariableDefinition.prototype);
LocalVariableDefinition.prototype.constructor = LocalVariableDefinition;

LocalVariableDefinition.prototype.toString = function() {
    return "VAR " + this.identifier.toString() + ", " + this.dataType.getName();
}

function ArgVariableDefinition(identifier, dataType, perms) {
    this.perms = perms;
    VariableDefinition.call(this, identifier, dataType);
}

ArgVariableDefinition.prototype = Object.create(VariableDefinition.prototype);
ArgVariableDefinition.prototype.constructor = ArgVariableDefinition;

ArgVariableDefinition.prototype.toString = function() {
    var tempTextList = [
        this.identifier.toString(),
        this.dataType.getName()
    ]
    var tempPermsTextList = this.perms.toStrings();
    var index = 0;
    while (index < tempPermsTextList.length) {
        var tempText = tempPermsTextList[index];
        tempTextList.push(tempText);
        index += 1;
    }
    return "ARG " + tempTextList.join(", ");
}

FunctionDefinition.prototype.extractVariableDefinitions = function() {
    var self = this;
    self.processLines(function(line) {
        var tempDirectiveName = line.directiveName;
        var tempArgList = line.argList;
        if (tempDirectiveName == "ARG") {
            if (tempArgList.length < 2) {
                throw new AssemblyError("Expected at least 2 arguments.");
            }
            var tempIdentifier = tempArgList[0].getIdentifier();
            var tempDataType = tempArgList[1].getDataType();
            var tempPerms = new ArgPerms();
            var index = 2;
            while (index < tempArgList.length) {
                var tempArg = tempArgList[index];
                var tempPerm = tempArg.getArgDirectionPerm();
                tempPerms.addDirectionPerm(tempPerm);
                index += 1;
            }
            var tempDefinition = new ArgVariableDefinition(
                tempIdentifier,
                tempDataType,
                tempPerms
            );
            self.argVariableDefinitionList.push(tempDefinition);
            return [];
        }
        if (tempDirectiveName == "VAR") {
            if (tempArgList.length != 2) {
                throw new AssemblyError("Expected 2 arguments.");
            }
            var tempIdentifier = tempArgList[0].getIdentifier();
            var tempDataType = tempArgList[1].getDataType();
            var tempDefinition = new LocalVariableDefinition(tempIdentifier, tempDataType);
            self.localVariableDefinitionList.push(tempDefinition);
            return [];
        }
        return null;
    });
}


