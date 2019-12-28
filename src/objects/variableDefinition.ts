
import {DataType} from "models/delegates";
import {VariableDefinition as VariableDefinitionInterface, ArgVariableDefinition as ArgVariableDefinitionInterface, Identifier, ArgPerm} from "models/objects";

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


