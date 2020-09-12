
import {DataType} from "models/delegates";
import {VariableDefinition as VariableDefinitionInterface, ArgVariableDefinition as ArgVariableDefinitionInterface, Identifier, ArgPerm, InstructionArg} from "models/objects";

import {PointerType} from "delegates/dataType";

import {AssemblyError} from "objects/assemblyError";
import {IndexRefConverter, IndexDefinition} from "objects/indexDefinition";
import {INSTRUCTION_REF_PREFIX} from "objects/instruction";
import {NumberConstant} from "objects/constant";

export interface VariableDefinition extends VariableDefinitionInterface {}

export class VariableDefinition extends IndexDefinition {
    
    constructor(
        identifier: Identifier,
        dataType: DataType,
        arrayLength: number,
        instructionRefPrefix: number
    ) {
        super(identifier, new IndexRefConverter(instructionRefPrefix, dataType));
        this.dataType = dataType;
        this.arrayLength = arrayLength;
    }
    
    getFrameSize(): number {
        return this.dataType.getFrameSize() * this.arrayLength;
    }
    
    getDisplayStringPrefix(): string {
        return "VAR";
    }
    
    getDisplayString(): string {
        let output = `${this.getDisplayStringPrefix()} ${this.identifier.getDisplayString()}, ${this.dataType.getName()}`;
        if (this.arrayLength !== 1) {
            output += ", " + this.arrayLength;
        }
        return output;
    }
}

export class GlobalVariableDefinition extends VariableDefinition {
    
    constructor(identifier: Identifier, dataType: DataType, arrayLength: number) {
        super(identifier, dataType, arrayLength, INSTRUCTION_REF_PREFIX.globalFrame);
    }
}

export class LocalVariableDefinition extends VariableDefinition {
    
    constructor(identifier: Identifier, dataType: DataType, arrayLength: number) {
        super(identifier, dataType, arrayLength, INSTRUCTION_REF_PREFIX.localFrame);
    }
}

export interface ArgVariableDefinition extends ArgVariableDefinitionInterface {}

export class ArgVariableDefinition extends VariableDefinition {
    
    constructor(
        identifier: Identifier,
        dataType: DataType,
        arrayLength: number,
        permList: ArgPerm[]
    ) {
        super(identifier, dataType, arrayLength, INSTRUCTION_REF_PREFIX.prevArgFrame);
        if (!(this.dataType instanceof PointerType) && permList.length > 0) {
            throw new AssemblyError("Beta argument cannot be associated with permissions.");
        }
        this.permList = permList;
    }
    
    getDisplayString(): string {
        const tempTextList = [super.getDisplayString()];
        for (const perm of this.permList) {
            let tempText = perm.getDisplayString();
            tempTextList.push(tempText);
        }
        return tempTextList.join(", ");
    }
}


