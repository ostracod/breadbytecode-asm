
var FunctionDefinition = require("./functionDefinition").FunctionDefinition;

function VariableDefinition(identifier, dataType) {
    this.identifier = identifier;
    this.dataType = dataType;
}

function LocalVariableDefinition(identifier, dataType) {
    VariableDefinition.call(this, identifier, dataType);
}

LocalVariableDefinition.prototype = Object.create(VariableDefinition.prototype);
LocalVariableDefinition.prototype.constructor = VariableDefinition;

LocalVariableDefinition.prototype.toString = function() {
    return "VAR " + this.identifier.toString() + ", " + this.dataType.getName();
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
            // TODO: Create the argument variable.
            
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


