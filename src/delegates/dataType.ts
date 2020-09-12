
import {MixedNumber} from "models/items";
import {
    DataType as DataTypeInterface,
    BetaType as BetaTypeInterface,
    NumberType as NumberTypeInterface,
    IntegerType as IntegerTypeInterface,
    StringType as StringTypeInterface
} from "models/delegates";
import {mathUtils} from "utils/mathUtils";

export let dataTypeList: DataType[] = [];
export let dataTypeMap: {[name: string]: DataType} = {};
export let unsignedIntegerTypeList: UnsignedIntegerType[] = [];
export let signedIntegerTypeList: SignedIntegerType[] = [];

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
    
    getName(): string {
        return "p";
    }
    
    equals(dataType: DataType): boolean {
        return (dataType instanceof PointerType);
    }
    
    getFrameSize(): number {
        return 1;
    }
}

export interface BetaType extends BetaTypeInterface {}

export abstract class BetaType extends DataType {
    
    constructor(argPrefix: number, byteAmount: number) {
        super(argPrefix);
        this.byteAmount = byteAmount;
        this.bitAmount = this.byteAmount * 8;
    }
    
    equals(dataType: DataType): boolean {
        if (!(dataType instanceof BetaType)) {
            return false;
        }
        let betaType = dataType as BetaType;
        return (this.byteAmount === betaType.byteAmount);
    }
    
    getFrameSize(): number {
        return this.byteAmount;
    }
}

export interface NumberType extends NumberTypeInterface {}

export abstract class NumberType extends BetaType {
    
    constructor(argPrefix: number, byteAmount: number) {
        super(argPrefix, byteAmount);
    }
    
    getName(): string {
        return this.getNamePrefix() + this.bitAmount;
    }
    
    restrictNumber(value: MixedNumber): MixedNumber {
        return value;
    }
}

export interface IntegerType extends IntegerTypeInterface {}

export class IntegerType extends NumberType {
    
    constructor(argPrefix: number, byteAmount: number) {
        super(argPrefix, byteAmount);
    }
    
    getByteAmountMergePriority(): number {
        return 1;
    }
    
    contains(value: MixedNumber): boolean {
        let tempValue = mathUtils.convertMixedNumberToBigInt(value);
        return (tempValue >= this.getMinimumNumber() && tempValue <= this.getMaximumNumber());
    }
}

export class UnsignedIntegerType extends IntegerType {
    
    constructor(argPrefix: number, byteAmount: number) {
        super(argPrefix, byteAmount);
        unsignedIntegerTypeList.push(this);
    }
    
    getNamePrefix(): string {
        return "u";
    }
    
    getClassMergePriority(): number {
        return 1;
    }
    
    convertNumberToBuffer(value: MixedNumber): Buffer {
        let output = Buffer.alloc(this.byteAmount);
        if (this.byteAmount === 8) {
            output.writeBigUInt64LE(mathUtils.convertMixedNumberToBigInt(value), 0);
        } else {
            output.writeUIntLE(Number(value), 0, this.byteAmount);
        }
        return output;
    }
    
    getMinimumNumber(): bigint {
        return 0n;
    }
    
    getMaximumNumber(): bigint {
        return (1n << BigInt(this.bitAmount)) - 1n;
    }
    
    restrictNumber(value: MixedNumber): MixedNumber {
        return mathUtils.convertMixedNumberToBigInt(value) & ((1n << BigInt(this.bitAmount)) - 1n);
    }
    
    equals(dataType: DataType) {
        if (!super.equals(dataType)) {
            return false;
        }
        return (dataType instanceof UnsignedIntegerType);
    }
}

export class SignedIntegerType extends IntegerType {
    
    constructor(argPrefix: number, byteAmount: number) {
        super(argPrefix, byteAmount);
        signedIntegerTypeList.push(this);
    }
    
    getNamePrefix(): string {
        return "s";
    }
    
    getClassMergePriority(): number {
        return 2;
    }
    
    convertNumberToBuffer(value: MixedNumber): Buffer {
        let output = Buffer.alloc(this.byteAmount);
        let tempAmount;
        if (this.byteAmount === 8) {
            output.writeBigInt64LE(mathUtils.convertMixedNumberToBigInt(value), 0);
        } else {
            output.writeIntLE(Number(value), 0, this.byteAmount);
        }
        return output;
    }
    
    getMinimumNumber(): bigint {
        return -(1n << BigInt(this.bitAmount - 1));
    }
    
    getMaximumNumber(): bigint {
        return (1n << BigInt(this.bitAmount - 1)) - 1n;
    }
    
    restrictNumber(value: MixedNumber): MixedNumber {
        let tempOffset = 1n << BigInt(this.bitAmount);
        value = mathUtils.convertMixedNumberToBigInt(value) & (tempOffset - 1n);
        if (value > this.getMaximumNumber()) {
            value -= tempOffset;
        }
        return value;
    }
    
    equals(dataType: DataType) {
        if (!super.equals(dataType)) {
            return false;
        }
        return (dataType instanceof SignedIntegerType);
    }
}

export class FloatType extends NumberType {
    
    constructor(argPrefix: number, byteAmount: number) {
        super(argPrefix, byteAmount);
    }
    
    getNamePrefix(): string {
        return "f";
    }
    
    getClassMergePriority(): number {
        return 3;
    }
    
    getByteAmountMergePriority(): number {
        return 2;
    }
    
    convertNumberToBuffer(value: MixedNumber): Buffer {
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
    
    equals(dataType: DataType) {
        if (!super.equals(dataType)) {
            return false;
        }
        return (dataType instanceof FloatType);
    }
}

export interface StringType extends StringTypeInterface {}

export class StringType extends BetaType {
    
    constructor(byteAmount: number) {
        super(null, byteAmount);
    }
    
    getName(): string {
        return "b" + this.bitAmount;
    }
    
    equals(dataType: DataType) {
        if (!super.equals(dataType)) {
            return false;
        }
        return (dataType instanceof StringType);
    }
}

export const pointerType = new PointerType();
export const unsignedInteger8Type = new UnsignedIntegerType(1, 1);
export const unsignedInteger16Type = new UnsignedIntegerType(2, 2);
export const unsignedInteger32Type = new UnsignedIntegerType(3, 4);
export const unsignedInteger64Type = new UnsignedIntegerType(4, 8);
export const signedInteger8Type = new SignedIntegerType(5, 1);
export const signedInteger16Type = new SignedIntegerType(6, 2);
export const signedInteger32Type = new SignedIntegerType(7, 4);
export const signedInteger64Type = new SignedIntegerType(8, 8);
export const float32Type = new FloatType(9, 4);
export const float64Type = new FloatType(10, 8);

for (let dataType of dataTypeList) {
    dataTypeMap[dataType.getName()] = dataType;
}

let integerComparator = ((type1, type2) => (type1.byteAmount - type2.byteAmount));
signedIntegerTypeList.sort(integerComparator);
unsignedIntegerTypeList.sort(integerComparator);


