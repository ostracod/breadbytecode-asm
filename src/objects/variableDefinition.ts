
import {DataType} from "models/delegates";
import {VariableDefinition as VariableDefinitionInterface, ArgVariableDefinition as ArgVariableDefinitionInterface, Identifier, ArgPerm, InstructionArg} from "models/objects";

import {PointerType} from "delegates/dataType";

import {AssemblyError} from "objects/assemblyError";
import {IndexRefConverter, IndexDefinition} from "objects/indexDefinition";
import {INSTRUCTION_REF_PREFIX} from "objects/instruction";
import {NumberConstant} from "objects/constant";

export interface VariableDefinition extends VariableDefinitionInterface {}

export class VariableDefinition extends IndexDefinition {
    
    constructor(identifier: Identifier, dataType: DataType, instructionRefPrefix: number) {
        super(identifier, new IndexRefConverter(instructionRefPrefix, dataType));
        this.dataType = dataType;
    }
    
    getDisplayString(): string {
        return `VAR ${this.identifier.getDisplayString()}, ${this.dataType.getName()}`;
    }
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
        if (!(this.dataType instanceof PointerType) && permList.length > 0) {
            throw new AssemblyError("Beta argument cannot be associated with permissions.");
        }
        this.permList = permList;
    }
    
    getDisplayString(): string {
        let tempTextList = [
            this.identifier.getDisplayString(),
            this.dataType.getName()
        ]
        for (let perm of this.permList) {
            let tempText = perm.getDisplayString();
            tempTextList.push(tempText);
        }
        return "ARG " + tempTextList.join(", ");
    }
}


