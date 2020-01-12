
import {LabelDefinition as LabelDefinitionInterface, Identifier} from "models/objects";
import {IndexDefinition} from "objects/indexDefinition";

export interface LabelDefinition extends LabelDefinitionInterface {}

export class LabelDefinition extends IndexDefinition {
    constructor(identifier: Identifier, index: number) {
        super();
        this.identifier = identifier;
        this.lineIndex = index;
    }
}

LabelDefinition.prototype.getDisplayString = function(): string {
    return this.identifier.getDisplayString() + " = " + this.index;
}


