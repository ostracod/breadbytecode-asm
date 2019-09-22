
import {LabelDefinition as LabelDefinitionInterface, Identifier} from "models/objects";
import {FunctionDefinition} from "objects/functionDefinition";
import {AssemblyError} from "objects/assemblyError";
import {lineUtils} from "utils/lineUtils";

export interface LabelDefinition extends LabelDefinitionInterface {}

export class LabelDefinition {
    constructor(identifier: Identifier, index: number) {
        this.identifier = identifier;
        this.index = index;
    }
}

LabelDefinition.prototype.getDisplayString = function(): string {
    return this.identifier.getDisplayString() + " = " + this.index;
}

FunctionDefinition.prototype.extractInstructionLabelDefinitions = function(): void {
    var self = this;
    var index = 0;
    self.processLines(function(line) {
        var tempArgList = line.argList;
        if (line.directiveName == "LBL") {
            if (tempArgList.length != 1) {
                throw new AssemblyError("Expected 1 argument.");
            }
            var tempIdentifier = tempArgList[0].evaluateToIdentifier();
            var tempDefinition = new LabelDefinition(tempIdentifier, index);
            self.instructionLabelDefinitionList.push(tempDefinition);
            return [];
        }
        index += 1;
        return null;
    });
}

FunctionDefinition.prototype.extractJumpTableLabelDefinitions = function(): void {
    var self = this;
    var index = 0;
    self.processJumpTableLines(function(line) {
        var tempDirectiveName = line.directiveName;
        var tempArgList = line.argList;
        if (tempDirectiveName == "LBL") {
            if (tempArgList.length != 1) {
                throw new AssemblyError("Expected 1 argument.");
            }
            var tempIdentifier = tempArgList[0].evaluateToIdentifier();
            var tempDefinition = new LabelDefinition(tempIdentifier, index);
            self.jumpTableLabelDefinitionList.push(tempDefinition);
            return [];
        }
        if (tempDirectiveName == "DATA") {
            index += tempArgList.length;
            return null;
        }
        return null;
    });
}


