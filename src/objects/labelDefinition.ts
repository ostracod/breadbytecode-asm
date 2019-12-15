
import {LabelDefinition as LabelDefinitionInterface, Identifier} from "models/objects";
import {FunctionDefinition} from "objects/functionDefinition";

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

FunctionDefinition.prototype.extractLabelDefinitions = function(): void {
    this.lineList.extractLabelDefinitions();
    this.jumpTableLineList.extractLabelDefinitions();
}


