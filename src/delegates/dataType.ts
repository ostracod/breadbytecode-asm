
import {MixedNumber} from "models/items";
import {
    DataType as DataTypeInterface,
    BetaType as BetaTypeInterface,
    NumberType as NumberTypeInterface,
    IntegerType as IntegerTypeInterface
} from "models/delegates";
import {mathUtils} from "utils/mathUtils";

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

PointerType.prototype.equals = function(dataType: DataType) {
    return (dataType instanceof PointerType);
}

export interface BetaType extends BetaTypeInterface {}

export abstract class BetaType extends DataType {
    constructor(argPrefix: number, byteAmount: number) {
        super(argPrefix);
        this.byteAmount = byteAmount;
        this.bitAmount = this.byteAmount * 8;
    }
}

BetaType.prototype.equals = function(dataType: DataType) {
    if (!(dataType instanceof BetaType)) {
        return false;
    }
    let betaType = dataType as BetaType;
    return (this.byteAmount === betaType.byteAmount);
}

export interface NumberType extends NumberTypeInterface {}

export abstract class NumberType extends BetaType {
    constructor(argPrefix: number, byteAmount: number) {
        super(argPrefix, byteAmount);
    }
}

NumberType.prototype.getName = function(): string {
    return this.getNamePrefix() + this.bitAmount;
}

NumberType.prototype.restrictNumber = function(value: MixedNumber): MixedNumber {
    return value;
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

IntegerType.prototype.contains = function(value: MixedNumber): boolean {
    let tempValue = mathUtils.convertMixedNumberToBigInt(value);
    return (tempValue >= this.getMinimumNumber() && tempValue <= this.getMaximumNumber());
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

UnsignedIntegerType.prototype.convertNumberToBuffer = function(value: MixedNumber): Buffer {
    let output = Buffer.alloc(this.byteAmount);
    if (this.byteAmount === 8) {
        output.writeBigUInt64LE(mathUtils.convertMixedNumberToBigInt(value), 0);
    } else {
        output.writeUIntLE(Number(value), 0, this.byteAmount);
    }
    return output;
}

UnsignedIntegerType.prototype.getMinimumNumber = function(): bigint {
    return 0n;
}

UnsignedIntegerType.prototype.getMaximumNumber = function(): bigint {
    return (1n << BigInt(this.bitAmount)) - 1n;
}

UnsignedIntegerType.prototype.restrictNumber = function(value: MixedNumber): MixedNumber {
    return mathUtils.convertMixedNumberToBigInt(value) & ((1n << BigInt(this.bitAmount)) - 1n);
}

UnsignedIntegerType.prototype.equals = function(dataType: DataType) {
    if (!BetaType.prototype.equals.call(this, dataType)) {
        return false;
    }
    return (dataType instanceof UnsignedIntegerType);
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

SignedIntegerType.prototype.convertNumberToBuffer = function(value: MixedNumber): Buffer {
    let output = Buffer.alloc(this.byteAmount);
    let tempAmount;
    if (this.byteAmount === 8) {
        output.writeBigInt64LE(mathUtils.convertMixedNumberToBigInt(value), 0);
    } else {
        output.writeIntLE(Number(value), 0, this.byteAmount);
    }
    return output;
}

SignedIntegerType.prototype.getMinimumNumber = function(): bigint {
    return -(1n << BigInt(this.bitAmount - 1));
}

SignedIntegerType.prototype.getMaximumNumber = function(): bigint {
    return (1n << BigInt(this.bitAmount - 1)) - 1n;
}

SignedIntegerType.prototype.restrictNumber = function(value: MixedNumber): MixedNumber {
    let tempOffset = 1n << BigInt(this.bitAmount);
    value = mathUtils.convertMixedNumberToBigInt(value) & (tempOffset - 1n);
    if (value > this.getMaximumNumber()) {
        value -= tempOffset;
    }
    return value;
}

SignedIntegerType.prototype.equals = function(dataType: DataType) {
    if (!BetaType.prototype.equals.call(this, dataType)) {
        return false;
    }
    return (dataType instanceof SignedIntegerType);
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

FloatType.prototype.convertNumberToBuffer = function(value: MixedNumber): Buffer {
    let tempNumber = Number(value);
    let output;
    if (this.byteAmount <= 4) {
        output = Buffer.alloc(4);
        output.writeFloatLE(tempNumber, 0);
    } else {
        output = Buffer.alloc(8);
        output.writeDoubleLE(tempNumber, 0);
    }
    return output;
}

FloatType.prototype.equals = function(dataType: DataType) {
    if (!BetaType.prototype.equals.call(this, dataType)) {
        return false;
    }
    return (dataType instanceof FloatType);
}

export class StringType extends BetaType {
    constructor(byteAmount: number) {
        super(null, byteAmount);
    }
}

StringType.prototype.getName = function(): string {
    return "b" + this.byteAmount;
}

StringType.prototype.equals = function(dataType: DataType) {
    if (!BetaType.prototype.equals.call(this, dataType)) {
        return false;
    }
    return (dataType instanceof StringType);
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


