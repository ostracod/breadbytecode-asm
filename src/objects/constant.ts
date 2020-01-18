
import {
    Constant as ConstantInterface,
    NumberConstant as NumberConstantInterface
} from "models/objects";
import {DataType, NumberType, IntegerType} from "models/delegates";

import {UnsignedIntegerType, SignedIntegerType, unsignedIntegerTypeList, signedIntegerTypeList, PointerType, pointerType} from "delegates/dataType";

import {AssemblyError} from "objects/assemblyError";

export interface Constant extends ConstantInterface {}

export class Constant {
    constructor() {
        // Do nothing.
        
    }
}

Constant.prototype.compress = function(): void {
    // Do nothing.
    
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

NumberConstant.prototype.setDataType = function(dataType: DataType): void {
    // TODO: Implement.
    throw new AssemblyError("Not yet implemented.");
}

NumberConstant.prototype.copy = function(): Constant {
    return new NumberConstant(this.value, this.numberType);
}

NumberConstant.prototype.createBuffer = function(): Buffer {
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

NullConstant.prototype.setDataType = function(dataType: DataType): void {
    if (!(dataType instanceof PointerType)) {
        throw new AssemblyError("Cannot convert alpha type to beta type.");
    }
}

NullConstant.prototype.copy = function(): Constant {
    return new NullConstant();
}

NullConstant.prototype.createBuffer = function(): Buffer {
    return Buffer.alloc(0);
}


