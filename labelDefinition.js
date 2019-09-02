
var FunctionDefinition = require("./functionDefinition").FunctionDefinition;
var AssemblyError = require("./assemblyError").AssemblyError;
var lineUtils = require("./lineUtils").lineUtils;

function LabelDefinition(identifier, index) {
    this.identifier = identifier;
    this.index = index;
}

LabelDefinition.prototype.toString = function() {
    return this.identifier.toString() + " = " + this.index;
}

FunctionDefinition.prototype.extractLabelDefinitions = function() {
    var self = this;
    self.processLines(function(line, index) {
        var tempArgList = line.argList;
        if (line.directiveName == "LBL") {
            if (tempArgList.length != 1) {
                throw new AssemblyError("Expected 1 argument.");
            }
            var tempIdentifier = tempArgList[0].getIdentifier();
            var tempDefinition = new LabelDefinition(tempIdentifier, index);
            self.instructionLabelDefinitionList.push(tempDefinition);
            return [];
        }
        return null;
    });
}


