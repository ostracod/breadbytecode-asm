
import {
    DataType as DataTypeInterface,
    BetaType as BetaTypeInterface,
    NumberType as NumberTypeInterface,
    IntegerType as IntegerTypeInterface
} from "models/delegates";

export var dataTypeList: DataType[] = [];
export var dataTypeMap: {[name: string]: DataType} = {};
export var unsignedIntegerTypeList: UnsignedIntegerType[] = [];
export var signedIntegerTypeList: SignedIntegerType[] = [];

export interface DataType extends DataTypeInterface {}

export abstract class DataType {
    constructor(argPrefix: number) {
        this.argPrefix = argPrefix;
        if (argPrefix !== null) {
            dataTypeList.push(this);
        }
    }
}

export class PointerType extends DataType {
    constructor() {
        super(0);
    }
}

PointerType.prototype.getName = function(): string {
    return "p";
}

export interface BetaType extends BetaTypeInterface {}

export abstract class BetaType extends DataType {
    constructor(argPrefix: number, byteAmount: number) {
        super(argPrefix);
        this.byteAmount = byteAmount;
    }
}

export interface NumberType extends NumberTypeInterface {}

export abstract class NumberType extends BetaType {
    constructor(argPrefix: number, byteAmount: number) {
        super(argPrefix, byteAmount);
    }
}

NumberType.prototype.getName = function(): string {
    return this.getNamePrefix() + (this.byteAmount * 8);
}

export interface IntegerType extends IntegerTypeInterface {}

export class IntegerType extends NumberType {
    constructor(argPrefix: number, byteAmount: number) {
        super(argPrefix, byteAmount);
    }
}

IntegerType.prototype.getByteAmountMergePriority = function(): number {
    return 1;
}

export class UnsignedIntegerType extends IntegerType {
    constructor(argPrefix: number, byteAmount: number) {
        super(argPrefix, byteAmount);
        unsignedIntegerTypeList.push(this);
    }
}

UnsignedIntegerType.prototype.getNamePrefix = function(): string {
    return "u";
}

UnsignedIntegerType.prototype.getClassMergePriority = function(): number {
    return 1;
}

UnsignedIntegerType.prototype.convertNumberToBuffer = function(value: number): Buffer {
    let output = Buffer.alloc(this.byteAmount);
    let tempAmount;
    if (this.byteAmount > 6) {
        tempAmount = 6;
    } else {
        tempAmount = this.byteAmount;
    }
    output.writeUIntLE(value, 0, tempAmount);
    return output;
}

UnsignedIntegerType.prototype.contains = function(value: number): boolean {
    return (value >= 0 && value < Math.pow(2, this.byteAmount * 8));
}

export class SignedIntegerType extends IntegerType {
    constructor(argPrefix: number, byteAmount: number) {
        super(argPrefix, byteAmount);
        signedIntegerTypeList.push(this);
    }
}

SignedIntegerType.prototype.getNamePrefix = function(): string {
    return "s";
}

SignedIntegerType.prototype.getClassMergePriority = function(): number {
    return 2;
}

SignedIntegerType.prototype.convertNumberToBuffer = function(value: number): Buffer {
    let output = Buffer.alloc(this.byteAmount);
    let tempAmount;
    if (this.byteAmount > 6) {
        tempAmount = 6;
    } else {
        tempAmount = this.byteAmount;
    }
    output.writeIntLE(value, 0, tempAmount);
    return output;
}

SignedIntegerType.prototype.contains = function(value: number): boolean {
    let tempThreshold = Math.pow(2, (this.byteAmount * 8 - 1));
    return (value >= -tempThreshold && value < tempThreshold);
}

export class FloatType extends NumberType {
    constructor(argPrefix: number, byteAmount: number) {
        super(argPrefix, byteAmount);
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

FloatType.prototype.convertNumberToBuffer = function(value: number): Buffer {
    let output;
    if (this.byteAmount <= 4) {
        output = Buffer.alloc(4);
        output.writeFloatLE(value, 0);
    } else {
        output = Buffer.alloc(8);
        output.writeDoubleLE(value, 0);
    }
    return output;
}

export class StringType extends BetaType {
    constructor(byteAmount: number) {
        super(null, byteAmount);
    }
}

StringType.prototype.getName = function(): string {
    return "b" + this.byteAmount;
}

export var pointerType = new PointerType();
export var unsignedInteger8Type = new UnsignedIntegerType(1, 1);
export var unsignedInteger16Type = new UnsignedIntegerType(2, 2);
export var unsignedInteger32Type = new UnsignedIntegerType(3, 4);
export var unsignedInteger64Type = new UnsignedIntegerType(4, 8);
export var signedInteger8Type = new SignedIntegerType(5, 1);
export var signedInteger16Type = new SignedIntegerType(6, 2);
export var signedInteger32Type = new SignedIntegerType(7, 4);
export var signedInteger64Type = new SignedIntegerType(8, 8);
export var float32Type = new FloatType(9, 4);
export var float64Type = new FloatType(10, 8);

var index = 0;
while (index < dataTypeList.length) {
    var tempDataType = dataTypeList[index];
    dataTypeMap[tempDataType.getName()] = tempDataType;
    index += 1;
}

let integerComparator = ((type1, type2) => (type1.byteAmount - type2.byteAmount));
signedIntegerTypeList.sort(integerComparator);
unsignedIntegerTypeList.sort(integerComparator);


