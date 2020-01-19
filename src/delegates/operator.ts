
import {MixedNumber} from "models/items";
import {
    UnaryOperator as UnaryOperatorInterface,
    BinaryOperator as BinaryOperatorInterface,
    BinaryNumberOperator as BinaryNumberOperatorInterface,
    BinaryTypeMergeOperator as BinaryTypeMergeOperatorInterface,
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

export class MacroIdentifierOperator extends UnaryOperator {
    constructor() {
        super("@");
    }
}

MacroIdentifierOperator.prototype.createExpression = function(operand: Expression): Expression {
    return new MacroIdentifierExpression(operand);
}

export class IndexOperator extends UnaryOperator {
    
}

IndexOperator.prototype.createConstantOrNull = function(operand: Expression): Constant {
    let tempIdentifier = operand.evaluateToIdentifier();
    let tempDefinition = operand.functionDefinition.getIndexDefinitionByIdentifier(
        tempIdentifier
    );
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
    tempValue = tempNumberType.restrictNumber(tempValue);
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

export class BinaryBitshiftOperator extends BinaryNumberOperator {
    
}

BinaryBitshiftOperator.prototype.getConstantDataTypeHelper = function(numberType1: NumberType, numberType2: NumberType): NumberType {
    return numberType1;
}

new UnaryOperator("-");
new UnaryOperator("~");
export var macroIdentifierOperator = new MacroIdentifierOperator();
new IndexOperator("?");

new TypeCoercionOperator();
new InterfaceFunctionOperator();
new BinaryTypeMergeOperator("*", 3);
new BinaryTypeMergeOperator("/", 3);
new BinaryTypeMergeOperator("%", 3);
new AdditionOperator();
new BinaryTypeMergeOperator("-", 4);
new BinaryBitshiftOperator(">>", 5);
new BinaryBitshiftOperator("<<", 5);
new BinaryTypeMergeOperator("&", 6);
new BinaryTypeMergeOperator("^", 7);
new BinaryTypeMergeOperator("|", 8);


