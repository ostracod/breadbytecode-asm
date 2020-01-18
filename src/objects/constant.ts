
import {Constant as ConstantInterface, NumberConstant as NumberConstantInterface} from "models/objects";
import {DataType, NumberType, IntegerType} from "models/delegates";

import {UnsignedIntegerType, SignedIntegerType, unsignedIntegerTypeList, signedIntegerTypeList, pointerType} from "delegates/dataType";

import {AssemblyError} from "objects/assemblyError";
import {INSTRUCTION_REF_PREFIX} from "objects/instruction";

import {instructionUtils} from "utils/instructionUtils";

export interface Constant extends ConstantInterface {}

export class Constant {
    constructor() {
        // Do nothing.
        
    }
}

Constant.prototype.compress = function(): void {
    // Do nothing.
    
}

Constant.prototype.createInstructionArg = function(): Buffer {
    return instructionUtils.createInstructionArg(
        INSTRUCTION_REF_PREFIX.constant,
        this.getDataType(),
        this.getBuffer()
    );
}

export interface NumberConstant extends NumberConstantInterface {}

export class NumberConstant extends Constant {
    constructor(value: number, numberType: NumberType) {
        super();
        this.value = value;
        this.numberType = numberType;
    }
}

NumberConstant.prototype.getDataType = function(): DataType {
    return this.numberType;
}

NumberConstant.prototype.copy = function(): Constant {
    return new NumberConstant(this.value, this.numberType);
}

NumberConstant.prototype.getBuffer = function(): Buffer {
    return this.numberType.convertNumberToBuffer(this.value);
}

NumberConstant.prototype.compress = function(): void {
    let integerTypeList: IntegerType[];
    if (this.numberType instanceof UnsignedIntegerType) {
        integerTypeList = unsignedIntegerTypeList;
    } else if (this.numberType instanceof SignedIntegerType) {
        integerTypeList = signedIntegerTypeList;
    } else {
        return;
    }
    for (let integerType of integerTypeList) {
        if (integerType.contains(this.value)) {
            this.numberType = integerType;
            return;
        }
    }
    throw new AssemblyError("Integer is out of range.");
}

export class NullConstant extends Constant {
    
}

NullConstant.prototype.getDataType = function(): DataType {
    return pointerType;
}

NullConstant.prototype.copy = function(): Constant {
    return new NullConstant();
}

NullConstant.prototype.getBuffer = function(): Buffer {
    return Buffer.alloc(0);
}


