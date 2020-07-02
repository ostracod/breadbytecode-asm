
import {LabelDefinition as LabelDefinitionInterface, Identifier, InstructionArg, IndexConverter} from "models/objects";
import {IndexDefinition, indexConstantConverter, appDataIndexConverter} from "objects/indexDefinition";

export interface LabelDefinition extends LabelDefinitionInterface {}

export abstract class LabelDefinition extends IndexDefinition {
    
    constructor(identifier: Identifier, indexConverter: IndexConverter, lineIndex: number) {
        super(identifier, indexConverter);
        this.lineIndex = lineIndex;
    }
    
    getDisplayString(): string {
        return this.identifier.getDisplayString() + " = " + this.index;
    }
}

export class InstructionLabelDefinition extends LabelDefinition {
    
    constructor(identifier: Identifier, lineIndex: number) {
        super(identifier, indexConstantConverter, lineIndex);
    }
}

export class JumpTableLabelDefinition extends LabelDefinition {
    
    constructor(identifier: Identifier, lineIndex: number) {
        super(identifier, indexConstantConverter, lineIndex);
    }
}

export class AppDataLabelDefinition extends LabelDefinition {
    
    constructor(identifier: Identifier, lineIndex: number) {
        super(identifier, appDataIndexConverter, lineIndex);
    }
}


