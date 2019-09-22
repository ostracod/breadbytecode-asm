
import {DataType} from "models/delegates";
import {VariableDefinition as VariableDefinitionInterface, ArgVariableDefinition as ArgVariableDefinitionInterface, Identifier, ArgPerm, AssemblyLine} from "models/objects";
import {FunctionDefinition} from "objects/functionDefinition";
import {Assembler} from "objects/assembler";
import {AssemblyError} from "objects/assemblyError";

export interface VariableDefinition extends VariableDefinitionInterface {}

export class VariableDefinition {
    constructor(identifier: Identifier, dataType: DataType) {
        this.identifier = identifier;
        this.dataType = dataType;
    }
}

VariableDefinition.prototype.getDisplayString = function(): string {
    return "VAR " + this.identifier.getDisplayString() + ", " + this.dataType.getName();
}

export interface ArgVariableDefinition extends ArgVariableDefinitionInterface {}

export class ArgVariableDefinition extends VariableDefinition {
    constructor(identifier: Identifier, dataType: DataType, permList: ArgPerm[]) {
        super(identifier, dataType);
        this.permList = permList;
    }
}

ArgVariableDefinition.prototype.getDisplayString = function(): string {
    var tempTextList = [
        this.identifier.getDisplayString(),
        this.dataType.getName()
    ]
    var index = 0;
    while (index < this.permList.length) {
        var tempPerm = this.permList[index];
        var tempText = tempPerm.getDisplayString();
        tempTextList.push(tempText);
        index += 1;
    }
    return "ARG " + tempTextList.join(", ");
}

function extractLocalVariableDefinition(line: AssemblyLine): VariableDefinition {
    if (line.directiveName != "VAR") {
        return null;
    }
    var tempArgList = line.argList;
    var tempIdentifier = tempArgList[0].evaluateToIdentifier();
    var tempDataType = tempArgList[1].evaluateToDataType();
    return new VariableDefinition(tempIdentifier, tempDataType);
}

function extractArgVariableDefinition(line: AssemblyLine): ArgVariableDefinition {
    if (line.directiveName != "ARG") {
        return null;
    }
    var tempArgList = line.argList;
    if (tempArgList.length < 2) {
        throw new AssemblyError("Expected at least 2 arguments.");
    }
    var tempIdentifier = tempArgList[0].evaluateToIdentifier();
    var tempDataType = tempArgList[1].evaluateToDataType();
    var tempPermList: ArgPerm[] = [];
    var index = 2;
    while (index < tempArgList.length) {
        var tempArg = tempArgList[index];
        var tempPerm = tempArg.evaluateToArgPerm();
        tempPermList.push(tempPerm);
        index += 1;
    }
    return new ArgVariableDefinition(
        tempIdentifier,
        tempDataType,
        tempPermList
    );
}

FunctionDefinition.prototype.extractVariableDefinitions = function(): void {
    var self = this;
    self.processLines(function(line) {
        var tempLocalDefinition = extractLocalVariableDefinition(line);
        if (tempLocalDefinition !== null) {
            self.localVariableDefinitionList.push(tempLocalDefinition);
            return [];
        }
        var tempArgDefinition = extractArgVariableDefinition(line);
        if (tempArgDefinition !== null) {
            self.argVariableDefinitionList.push(tempArgDefinition);
            return [];
        }
        return null;
    });
}

Assembler.prototype.extractGlobalVariableDefinitions = function(): void {
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


