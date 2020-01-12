
import {IndexDefinition as IndexDefinitionInterface, Identifier} from "models/objects";
import {unsignedInteger64Type} from "delegates/dataType";
import {NumberConstant} from "objects/constant";

export interface IndexDefinition extends IndexDefinitionInterface {}

export abstract class IndexDefinition {
    constructor(identifier: Identifier) {
        this.identifier = identifier;
        this.index = null;
    }
}

IndexDefinition.prototype.createInstructionArg = function(): Buffer {
    let tempConstant = new NumberConstant(this.index, unsignedInteger64Type);
    tempConstant.compress();
    return tempConstant.createInstructionArg();
}


