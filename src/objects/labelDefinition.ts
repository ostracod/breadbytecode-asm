
import {LabelDefinition as LabelDefinitionInterface, Identifier} from "models/objects";

export interface LabelDefinition extends LabelDefinitionInterface {}

export class LabelDefinition {
    constructor(identifier: Identifier, index: number) {
        this.identifier = identifier;
        this.lineIndex = index;
        this.elementIndex = null;
    }
}

LabelDefinition.prototype.getDisplayString = function(): string {
    return this.identifier.getDisplayString() + " = " + this.elementIndex;
}


