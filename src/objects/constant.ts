
import {MixedNumber} from "models/items";
import {
    Constant as ConstantInterface,
    NumberConstant as NumberConstantInterface,
    StringConstant as StringConstantInterface
} from "models/objects";
import {DataType, IntegerType} from "models/delegates";

import {UnsignedIntegerType, SignedIntegerType, unsignedIntegerTypeList, signedIntegerTypeList, PointerType, pointerType, unsignedInteger64Type, BetaType, NumberType, StringType} from "delegates/dataType";

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
    constructor(value: MixedNumber, numberType: NumberType) {
        super();
        this.value = numberType.restrictNumber(value);
        this.numberType = numberType;
    }
}

NumberConstant.prototype.getDataType = function(): DataType {
    return this.numberType;
}

NumberConstant.prototype.setDataType = function(dataType: DataType): void {
    if (!(dataType instanceof BetaType)) {
        throw new AssemblyError("Cannot convert beta type to alpha type.");
    }
    if (!(dataType instanceof NumberType)) {
        throw new AssemblyError("Conversion is only supported between number types.");
    }
    this.numberType = dataType as NumberType;
    this.value = this.numberType.restrictNumber(this.value);
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

export interface StringConstant extends StringConstantInterface {}

export class StringConstant extends Constant {
    constructor(value: string) {
        super();
        this.value = value;
        this.stringType = new StringType(value.length);
    }
}

StringConstant.prototype.getDataType = function(): DataType {
    return this.stringType;
}

StringConstant.prototype.setDataType = function(dataType: DataType): void {
    if (!this.stringType.equals(dataType)) {
        throw new AssemblyError("Cannot change data type of string.");
    }
}

StringConstant.prototype.copy = function(): Constant {
    return new StringConstant(this.value);
}

StringConstant.prototype.createBuffer = function(): Buffer {
    return Buffer.from(this.value, "utf8");
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

export const builtInConstantSet = {
    null: new NullConstant()
};

let tempNumberSet = {
    errSType: 0x0001,
    funcHandleSType: 0x0002,
    threadSType: 0x0003,
    launchOptSType: 0x0004,
    agentSType: 0x0005,
    mutexSType: 0x0006,
    fileHandleSType: 0x0007,
    protabSType: 0x0008,
    permSType: 0x0009,
    
    genericErr: 0x0000,
    noImplErr: 0x0001,
    typeErr: 0x0002,
    numRangeErr: 0x0003,
    indexErr: 0x0004,
    nullErr: 0x0005,
    dataErr: 0x0006,
    argFrameErr: 0x0007,
    missingErr: 0x0008,
    stateErr: 0x0009,
    compatErr: 0x000A,
    permErr: 0x000B,
    capacityErr: 0x000C,
    throttleErr: 0x000D
};

for (let key in tempNumberSet) {
    let tempNumber = tempNumberSet[key];
    builtInConstantSet[key] = new NumberConstant(tempNumber, unsignedInteger64Type);
}


