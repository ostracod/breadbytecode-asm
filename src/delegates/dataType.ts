
import {DataType as DataTypeInterface, NumberType as NumberTypeInterface} from "models/delegates";
import {AssemblyError} from "objects/assemblyError";

var dataTypeList: DataType[] = [];

export var dataTypeMap: {[name: string]: DataType} = {};

export interface DataType extends DataTypeInterface {}

export abstract class DataType {
    constructor() {
        dataTypeList.push(this);
    }
}

export class PointerType extends DataType {
    constructor() {
        super();
    }
}

PointerType.prototype.getName = function(): string {
    return "p";
}

export interface NumberType extends NumberTypeInterface {}

export abstract class NumberType extends DataType {
    constructor(byteAmount: number) {
        super();
        this.byteAmount = byteAmount;
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

export class UnsignedIntegerType extends IntegerType {
    constructor(byteAmount: number) {
        super(byteAmount);
    }
}

UnsignedIntegerType.prototype.getNamePrefix = function(): string {
    return "u";
}

export class SignedIntegerType extends IntegerType {
    constructor(byteAmount: number) {
        super(byteAmount);
    }
}

SignedIntegerType.prototype.getNamePrefix = function(): string {
    return "s";
}

export class FloatType extends NumberType {
    constructor(byteAmount: number) {
        super(byteAmount);
    }
}

FloatType.prototype.getNamePrefix = function(): string {
    return "f";
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


