
import {DataType} from "models/delegates";
import {VariableDefinition as VariableDefinitionInterface, ArgVariableDefinition as ArgVariableDefinitionInterface, Identifier, ArgPerm, InstructionArg} from "models/objects";

import {instructionUtils} from "utils/instructionUtils";

import {IndexDefinition} from "objects/indexDefinition";
import {INSTRUCTION_REF_PREFIX} from "objects/instruction";
import {NumberConstant} from "objects/constant";

export interface VariableDefinition extends VariableDefinitionInterface {}

export class VariableDefinition extends IndexDefinition {
    constructor(identifier: Identifier, dataType: DataType, instructionRefPrefix: number) {
        super(identifier);
        this.dataType = dataType;
        this.instructionRefPrefix = instructionRefPrefix;
    }
}

VariableDefinition.prototype.getDisplayString = function(): string {
    return "VAR " + this.identifier.getDisplayString() + ", " + this.dataType.getName();
}

VariableDefinition.prototype.createInstructionArg = function(): InstructionArg {
    return instructionUtils.createInstructionArgWithIndex(
        this.instructionRefPrefix,
        this.dataType,
        this.index
    );
}

export class GlobalVariableDefinition extends VariableDefinition {
    constructor(identifier: Identifier, dataType: DataType) {
        super(identifier, dataType, INSTRUCTION_REF_PREFIX.globalFrame);
    }
}

export class LocalVariableDefinition extends VariableDefinition {
    constructor(identifier: Identifier, dataType: DataType) {
        super(identifier, dataType, INSTRUCTION_REF_PREFIX.localFrame);
    }
}

export interface ArgVariableDefinition extends ArgVariableDefinitionInterface {}

export class ArgVariableDefinition extends VariableDefinition {
    constructor(identifier: Identifier, dataType: DataType, permList: ArgPerm[]) {
        super(identifier, dataType, INSTRUCTION_REF_PREFIX.prevArgFrame);
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


