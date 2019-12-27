
import {
    DataType as DataTypeInterface,
    BetaType as BetaTypeInterface,
    NumberType as NumberTypeInterface
} from "models/delegates";
import {AssemblyError} from "objects/assemblyError";

export var dataTypeList: DataType[] = [];
export var dataTypeMap: {[name: string]: DataType} = {};
export var signedIntegerTypeList: SignedIntegerType[] = [];

export interface DataType extends DataTypeInterface {}

export abstract class DataType {
    constructor(isBuiltIn: boolean) {
        if (isBuiltIn) {
            dataTypeList.push(this);
        }
    }
}

export class PointerType extends DataType {
    constructor() {
        super(true);
    }
}

PointerType.prototype.getName = function(): string {
    return "p";
}

export interface BetaType extends BetaTypeInterface {}

export abstract class BetaType extends DataType {
    constructor(isBuiltIn: boolean, byteAmount: number) {
        super(isBuiltIn);
        this.byteAmount = byteAmount;
    }
}

export interface NumberType extends NumberTypeInterface {}

export abstract class NumberType extends BetaType {
    constructor(byteAmount: number) {
        super(true, byteAmount);
    }
}

NumberType.prototype.getName = function(): string {
    return this.getNamePrefix() + (this.byteAmount * 8);
}

export class IntegerType extends NumberType {
    constructor(byteAmount: number) {
        super(byteAmount);
    }
}

IntegerType.prototype.getByteAmountMergePriority = function(): number {
    return 1;
}

export class UnsignedIntegerType extends IntegerType {
    constructor(byteAmount: number) {
        super(byteAmount);
    }
}

UnsignedIntegerType.prototype.getNamePrefix = function(): string {
    return "u";
}

UnsignedIntegerType.prototype.getClassMergePriority = function(): number {
    return 1;
}

export class SignedIntegerType extends IntegerType {
    constructor(byteAmount: number) {
        super(byteAmount);
        signedIntegerTypeList.push(this);
    }
}

SignedIntegerType.prototype.getNamePrefix = function(): string {
    return "s";
}

SignedIntegerType.prototype.getClassMergePriority = function(): number {
    return 2;
}

export class FloatType extends NumberType {
    constructor(byteAmount: number) {
        super(byteAmount);
    }
}

FloatType.prototype.getNamePrefix = function(): string {
    return "f";
}

FloatType.prototype.getClassMergePriority = function(): number {
    return 3;
}

FloatType.prototype.getByteAmountMergePriority = function(): number {
    return 2;
}

export class StringType extends BetaType {
    constructor(byteAmount: number) {
        super(false, byteAmount);
    }
}

StringType.prototype.getName = function(): string {
    return "b" + this.byteAmount;
}

export var pointerType = new PointerType();
export var unsignedInteger8Type = new UnsignedIntegerType(1);
export var unsignedInteger16Type = new UnsignedIntegerType(2);
export var unsignedInteger32Type = new UnsignedIntegerType(4);
export var unsignedInteger64Type = new UnsignedIntegerType(8);
export var signedInteger8Type = new SignedIntegerType(1);
export var signedInteger16Type = new SignedIntegerType(2);
export var signedInteger32Type = new SignedIntegerType(4);
export var signedInteger64Type = new SignedIntegerType(8);
export var float32Type = new FloatType(4);
export var float64Type = new FloatType(8);

var index = 0;
while (index < dataTypeList.length) {
    var tempDataType = dataTypeList[index];
    dataTypeMap[tempDataType.getName()] = tempDataType;
    index += 1;
}

signedIntegerTypeList.sort(function(type1, type2) {
    return type1.byteAmount - type2.byteAmount;
});


