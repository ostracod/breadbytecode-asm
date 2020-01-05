
import {NumberConstant as NumberConstantInterface} from "models/objects";
import {NumberType, IntegerType} from "models/delegates";
import {UnsignedIntegerType, SignedIntegerType, unsignedIntegerTypeList, signedIntegerTypeList} from "delegates/dataType";

import {AssemblyError} from "objects/assemblyError";
import {INSTRUCTION_REF_PREFIX} from "objects/instruction";

import {instructionUtils} from "utils/instructionUtils";

export interface NumberConstant extends NumberConstantInterface {}

export class NumberConstant {
    constructor(value: number, dataType: NumberType) {
        this.value = value;
        this.dataType = dataType;
    }
}

NumberConstant.prototype.copy = function(): NumberConstant {
    return new NumberConstant(this.value, this.dataType);
}

NumberConstant.prototype.getBuffer = function(): Buffer {
    return this.dataType.convertNumberToBuffer(this.value);
}

NumberConstant.prototype.compress = function(): void {
    let integerTypeList: IntegerType[];
    if (this.dataType instanceof UnsignedIntegerType) {
        integerTypeList = unsignedIntegerTypeList;
    } else if (this.dataType instanceof SignedIntegerType) {
        integerTypeList = signedIntegerTypeList;
    } else {
        return;
    }
    for (let integerType of integerTypeList) {
        if (integerType.contains(this.value)) {
            this.dataType = integerType;
            return;
        }
    }
    throw new AssemblyError("Integer is out of range.");
}

NumberConstant.prototype.createInstructionArg = function(): Buffer {
    return instructionUtils.createInstructionArg(
        INSTRUCTION_REF_PREFIX.constant,
        this.dataType,
        this.getBuffer()
    );
}


