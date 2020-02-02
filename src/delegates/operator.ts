
import {MixedNumber} from "models/items";
import {
    UnaryOperator as UnaryOperatorInterface,
    UnaryNumberOperator as UnaryNumberOperatorInterface,
    BinaryOperator as BinaryOperatorInterface,
    BinaryNumberOperator as BinaryNumberOperatorInterface,
    BinaryTypeMergeOperator as BinaryTypeMergeOperatorInterface,
    BinaryBitshiftOperator as BinaryBitshiftOperatorInterface,
    Operator, DataType
} from "models/delegates";
import {Expression, Constant, InstructionArg} from "models/objects";

import {dataTypeUtils} from "utils/dataTypeUtils";
import {mathUtils} from "utils/mathUtils";

import {unsignedInteger64Type, signedInteger64Type, NumberType, IntegerType} from "delegates/dataType";

import {UnaryExpression, MacroIdentifierExpression, BinaryExpression} from "objects/expression";
import {AssemblyError} from "objects/assemblyError";
import {NumberConstant} from "objects/constant";

export var unaryOperatorList = [];
export var binaryOperatorList = [];

export interface UnaryOperator extends UnaryOperatorInterface {}

export class UnaryOperator {
    constructor(text: string) {
        this.text = text;
        unaryOperatorList.push(this);
    }
}

UnaryOperator.prototype.createExpression = function(operand: Expression): Expression {
    return new UnaryExpression(this, operand);
}

UnaryOperator.prototype.getConstantDataType = function(operand: Expression): DataType {
    return operand.getConstantDataType();
}

UnaryOperator.prototype.createConstantOrNull = function(operand: Expression): Constant {
    return null;
}

export interface UnaryNumberOperator extends UnaryNumberOperatorInterface {}

export class UnaryNumberOperator extends UnaryOperator {
    
}

UnaryNumberOperator.prototype.createConstantOrNull = function(operand: Expression): Constant {
    let tempConstant = operand.evaluateToConstantOrNull();
    if (tempConstant === null) {
        return null;
    }
    if (!(tempConstant instanceof NumberConstant)) {
        throw new AssemblyError("Expected numeric value.");
    }
    let tempNumberConstant = tempConstant.copy() as NumberConstant;
    let tempNumberType = this.getConstantDataType(operand);
    let tempValue: MixedNumber;
    if (tempNumberType instanceof IntegerType) {
        tempValue = this.calculateInteger(
            mathUtils.convertMixedNumberToBigInt(tempNumberConstant.value)
        );
    } else {
        tempValue = this.calculateFloat(Number(tempNumberConstant.value));
    }
    return new NumberConstant(tempValue, tempNumberType);
}

UnaryNumberOperator.prototype.calculateInteger = function(value: bigint): bigint {
    throw new AssemblyError("Unsupported operation on integer.");
}

UnaryNumberOperator.prototype.calculateFloat = function(value: number): number {
    throw new AssemblyError("Unsupported operation on floating point number.");
}

export class NegationOperator extends UnaryNumberOperator {
    constructor() {
        super("-");
    }
}

NegationOperator.prototype.calculateInteger = function(value: bigint): bigint {
    return -value;
}

NegationOperator.prototype.calculateFloat = function(value: number): number {
    return -value;
}

export class BitwiseInversionOperator extends UnaryNumberOperator {
    constructor() {
        super("~");
    }
}

BitwiseInversionOperator.prototype.calculateInteger = function(value: bigint): bigint {
    return ~value;
}

export class MacroIdentifierOperator extends UnaryOperator {
    constructor() {
        super("@");
    }
}

MacroIdentifierOperator.prototype.createExpression = function(operand: Expression): Expression {
    return new MacroIdentifierExpression(operand);
}

export class IndexOperator extends UnaryOperator {
    constructor() {
        super("?");
    }
}

IndexOperator.prototype.createConstantOrNull = function(operand: Expression): Constant {
    let tempIdentifier = operand.evaluateToIdentifier();
    let tempDefinition = operand.scope.getIndexDefinitionByIdentifier(
        tempIdentifier
    );
    if (tempDefinition === null) {
        throw new AssemblyError("Expected index definition.");
    }
    let output = new NumberConstant(tempDefinition.index, unsignedInteger64Type);
    output.compress();
    return output;
}

export interface BinaryOperator extends BinaryOperatorInterface {}

export abstract class BinaryOperator {
    constructor(text: string, precedence: number) {
        this.text = text;
        this.precedence = precedence;
        binaryOperatorList.push(this);
    }
}

BinaryOperator.prototype.createExpression = function(operand1: Expression, operand2: Expression): Expression {
    return new BinaryExpression(this, operand1, operand2);
}

BinaryOperator.prototype.createConstantOrNull = function(operand1: Expression, operand2: Expression): Constant {
    return null;
}

BinaryOperator.prototype.createInstructionArgOrNull = function(operand1: Expression, operand2: Expression): InstructionArg {
    return null;
}

export class TypeCoercionOperator extends BinaryOperator {
    constructor() {
        super(":", 1);
    }
}

TypeCoercionOperator.prototype.getConstantDataType = function(operand1: Expression, operand2: Expression): DataType {
    return operand2.evaluateToDataType();
}

TypeCoercionOperator.prototype.createConstantOrNull = function(operand1: Expression, operand2: Expression): Constant {
    let tempConstant = operand1.evaluateToConstantOrNull();
    if (tempConstant === null) {
        return null;
    }
    let tempDataType = operand2.evaluateToDataType();
    tempConstant.setDataType(tempDataType);
    return tempConstant;
}

TypeCoercionOperator.prototype.createInstructionArgOrNull = function(operand1: Expression, operand2: Expression): InstructionArg {
    let tempArg = operand1.evaluateToInstructionArg();
    let tempDataType = operand2.evaluateToDataType();
    tempArg.setDataType(tempDataType);
    return tempArg;
}

export class InterfaceFunctionOperator extends BinaryOperator {
    constructor() {
        super(".", 1);
    }
}

InterfaceFunctionOperator.prototype.getConstantDataType = function(operand1: Expression, operand2: Expression): DataType {
    return signedInteger64Type;
}

export interface BinaryNumberOperator extends BinaryNumberOperatorInterface {}

export abstract class BinaryNumberOperator extends BinaryOperator {
    
}

BinaryNumberOperator.prototype.createConstantOrNull = function(operand1: Expression, operand2: Expression): Constant {
    let tempConstant1 = operand1.evaluateToConstantOrNull();
    let tempConstant2 = operand2.evaluateToConstantOrNull();
    if (tempConstant1 === null || tempConstant2 === null) {
        return null;
    }
    if (!(tempConstant1 instanceof NumberConstant
            && tempConstant2 instanceof NumberConstant)) {
        throw new AssemblyError("Expected numeric value.");
    }
    let tempNumberConstant1 = tempConstant1.copy() as NumberConstant;
    let tempNumberConstant2 = tempConstant2.copy() as NumberConstant;
    return this.createConstantOrNullHelper(tempNumberConstant1, tempNumberConstant2);
}

BinaryNumberOperator.prototype.getConstantDataType = function(operand1: Expression, operand2: Expression): DataType {
    var tempDataType1 = operand1.getConstantDataType();
    var tempDataType2 = operand2.getConstantDataType();
    if (!(tempDataType1 instanceof NumberType && tempDataType1 instanceof NumberType)) {
        throw new AssemblyError("Expected numeric value.");
    }
    return this.getConstantDataTypeHelper(
        tempDataType1 as NumberType,
        tempDataType2 as NumberType
    );
}

export interface BinaryTypeMergeOperator extends BinaryTypeMergeOperatorInterface {}

export class BinaryTypeMergeOperator extends BinaryNumberOperator {
    
}

BinaryTypeMergeOperator.prototype.getConstantDataTypeHelper = function(numberType1: NumberType, numberType2: NumberType): NumberType {
    return dataTypeUtils.mergeNumberTypes(numberType1, numberType2);
}

BinaryTypeMergeOperator.prototype.createConstantOrNullHelper = function(numberConstant1: NumberConstant, numberConstant2: NumberConstant): NumberConstant {
    let tempNumberType = this.getConstantDataTypeHelper(
        numberConstant1.numberType,
        numberConstant2.numberType
    );
    numberConstant1.setDataType(tempNumberType);
    numberConstant2.setDataType(tempNumberType);
    let tempValue: MixedNumber;
    if (tempNumberType instanceof IntegerType) {
        tempValue = this.calculateInteger(
            mathUtils.convertMixedNumberToBigInt(numberConstant1.value),
            mathUtils.convertMixedNumberToBigInt(numberConstant2.value)
        );
    } else {
        tempValue = this.calculateFloat(
            Number(numberConstant1.value),
            Number(numberConstant2.value)
        );
    }
    return new NumberConstant(tempValue, tempNumberType);
}

BinaryTypeMergeOperator.prototype.calculateInteger = function(value1: bigint, value2: bigint): bigint {
    throw new AssemblyError("Unsupported operation between integers.");
}

BinaryTypeMergeOperator.prototype.calculateFloat = function(value1: number, value2: number): number {
    throw new AssemblyError("Unsupported operation between floating point numbers.");
}

export class AdditionOperator extends BinaryTypeMergeOperator {
    constructor() {
        super("+", 4);
    }
}

AdditionOperator.prototype.calculateInteger = function(value1: bigint, value2: bigint): bigint {
    return value1 + value2;
}

AdditionOperator.prototype.calculateFloat = function(value1: number, value2: number): number {
    return value1 + value2;
}

export class SubtractionOperator extends BinaryTypeMergeOperator {
    constructor() {
        super("-", 4);
    }
}

SubtractionOperator.prototype.calculateInteger = function(value1: bigint, value2: bigint): bigint {
    return value1 - value2;
}

SubtractionOperator.prototype.calculateFloat = function(value1: number, value2: number): number {
    return value1 - value2;
}

export class MultiplicationOperator extends BinaryTypeMergeOperator {
    constructor() {
        super("*", 3);
    }
}

MultiplicationOperator.prototype.calculateInteger = function(value1: bigint, value2: bigint): bigint {
    return value1 * value2;
}

MultiplicationOperator.prototype.calculateFloat = function(value1: number, value2: number): number {
    return value1 * value2;
}

export class DivisionOperator extends BinaryTypeMergeOperator {
    constructor() {
        super("/", 3);
    }
}

DivisionOperator.prototype.calculateInteger = function(value1: bigint, value2: bigint): bigint {
    return value1 / value2;
}

DivisionOperator.prototype.calculateFloat = function(value1: number, value2: number): number {
    return value1 / value2;
}

export class ModulusOperator extends BinaryTypeMergeOperator {
    constructor() {
        super("%", 3);
    }
}

ModulusOperator.prototype.calculateInteger = function(value1: bigint, value2: bigint): bigint {
    return value1 % value2;
}

ModulusOperator.prototype.calculateFloat = function(value1: number, value2: number): number {
    return value1 % value2;
}

export class BitwiseAndOperator extends BinaryTypeMergeOperator {
    constructor() {
        super("&", 6);
    }
}

BitwiseAndOperator.prototype.calculateInteger = function(value1: bigint, value2: bigint): bigint {
    return value1 & value2;
}

export class BitwiseXorOperator extends BinaryTypeMergeOperator {
    constructor() {
        super("^", 7);
    }
}

BitwiseXorOperator.prototype.calculateInteger = function(value1: bigint, value2: bigint): bigint {
    return value1 ^ value2;
}

export class BitwiseOrOperator extends BinaryTypeMergeOperator {
    constructor() {
        super("|", 8);
    }
}

BitwiseOrOperator.prototype.calculateInteger = function(value1: bigint, value2: bigint): bigint {
    return value1 | value2;
}

export interface BinaryBitshiftOperator extends BinaryBitshiftOperatorInterface {}

export class BinaryBitshiftOperator extends BinaryNumberOperator {
    
}

BinaryBitshiftOperator.prototype.getConstantDataTypeHelper = function(numberType1: NumberType, numberType2: NumberType): NumberType {
    if (!(numberType1 instanceof IntegerType)) {
        throw new AssemblyError("Unsupported operation on floating point number.");
    }
    return numberType1;
}

BinaryBitshiftOperator.prototype.createConstantOrNullHelper = function(numberConstant1: NumberConstant, numberConstant2: NumberConstant): NumberConstant {
    let tempNumberType = this.getConstantDataTypeHelper(
        numberConstant1.numberType,
        numberConstant2.numberType
    );
    let tempValue = this.calculateInteger(
        mathUtils.convertMixedNumberToBigInt(numberConstant1.value),
        mathUtils.convertMixedNumberToBigInt(numberConstant2.value)
    );
    return new NumberConstant(tempValue, tempNumberType);
}

export class BitshiftLeftOperator extends BinaryBitshiftOperator {
    constructor() {
        super("<<", 5);
    }
}

BitshiftLeftOperator.prototype.calculateInteger = function(value: bigint, offset: bigint): bigint {
    return value << offset;
}

export class BitshiftRightOperator extends BinaryBitshiftOperator {
    constructor() {
        super(">>", 5);
    }
}

BitshiftRightOperator.prototype.calculateInteger = function(value: bigint, offset: bigint): bigint {
    return value >> offset;
}

new NegationOperator();
new BitwiseInversionOperator();
export var macroIdentifierOperator = new MacroIdentifierOperator();
new IndexOperator();

new TypeCoercionOperator();
new InterfaceFunctionOperator();
new AdditionOperator();
new SubtractionOperator();
new MultiplicationOperator();
new DivisionOperator();
new ModulusOperator();
new BitwiseAndOperator();
new BitwiseXorOperator();
new BitwiseOrOperator();
new BitshiftLeftOperator();
new BitshiftRightOperator();


