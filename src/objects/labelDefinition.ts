
import {LabelDefinition as LabelDefinitionInterface, Identifier, InstructionArg} from "models/objects";

import {instructionUtils} from "utils/instructionUtils";

import {unsignedInteger64Type} from "delegates/dataType";

import {INSTRUCTION_REF_PREFIX} from "objects/instruction";
import {IndexDefinition} from "objects/indexDefinition";

export interface LabelDefinition extends LabelDefinitionInterface {}

export class LabelDefinition extends IndexDefinition {
    constructor(identifier: Identifier, index: number) {
        super(identifier);
        this.lineIndex = index;
    }
}

LabelDefinition.prototype.getDisplayString = function(): string {
    return this.identifier.getDisplayString() + " = " + this.index;
}

export class AppDataLabelDefinition extends LabelDefinition {
    
}

AppDataLabelDefinition.prototype.createInstructionArg = function(): InstructionArg {
    return instructionUtils.createInstructionArgWithIndex(
        INSTRUCTION_REF_PREFIX.appData,
        unsignedInteger64Type,
        this.index
    );
}


