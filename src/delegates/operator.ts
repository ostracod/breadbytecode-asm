
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
import {Expression, Constant, InstructionArg, Identifier} from "models/objects";

import {dataTypeUtils} from "utils/dataTypeUtils";
import {mathUtils} from "utils/mathUtils";

import {unsignedInteger64Type, signedInteger64Type, NumberType, IntegerType} from "delegates/dataType";

import {UnaryExpression, MacroIdentifierExpression, BinaryExpression} from "objects/expression";
import {AssemblyError} from "objects/assemblyError";
import {NumberConstant, StringConstant} from "objects/constant";

export let unaryOperatorList = [];
export let binaryOperatorList = [];

export interface UnaryOperator extends UnaryOperatorInterface {}

export class UnaryOperator {
    
    constructor(text: string) {
        this.text = text;
        unaryOperatorList.push(this);
    }
    
    createExpression(operand: Expression): Expression {
        return new UnaryExpression(this, operand);
    }
    
    getConstantDataType(operand: Expression): DataType {
        return operand.getConstantDataType();
    }
    
    createConstantOrNull(operand: Expression): Constant {
        return null;
    }
}

export interface UnaryNumberOperator extends UnaryNumberOperatorInterface {}

export class UnaryNumberOperator extends UnaryOperator {
    
    createConstantOrNull(operand: Expression): Constant {
        let tempConstant = operand.evaluateToConstantOrNull();
        if (tempConstant === null) {
            return null;
        }
        if (!(tempConstant instanceof NumberConstant)) {
            throw new AssemblyError("Expected numeric value.");
        }
        let tempNumberConstant = tempConstant.copy() as NumberConstant;
        let tempNumberType = this.getConstantDataType(operand) as NumberType;
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
    
    calculateInteger(value: bigint): bigint {
        throw new AssemblyError("Unsupported operation on integer.");
    }
    
    calculateFloat(value: number): number {
        throw new AssemblyError("Unsupported operation on floating point number.");
    }
}

export class NegationOperator extends UnaryNumberOperator {
    
    constructor() {
        super("-");
    }
    
    calculateInteger(value: bigint): bigint {
        return -value;
    }
    
    calculateFloat(value: number): number {
        return -value;
    }
}

export class BitwiseInversionOperator extends UnaryNumberOperator {
    
    constructor() {
        super("~");
    }
    
    calculateInteger(value: bigint): bigint {
        return ~value;
    }
}

export class MacroIdentifierOperator extends UnaryOperator {
    
    constructor() {
        super("@");
    }
    
    createExpression(operand: Expression): Expression {
        return new MacroIdentifierExpression(operand);
    }
}

export class IndexOperator extends UnaryOperator {
    
    constructor() {
        super("?");
    }
    
    createConstantOrNull(operand: Expression): Constant {
        let tempIdentifier = operand.evaluateToIdentifier();
        let tempDefinition = operand.scope.getIndexDefinitionByIdentifier(
            tempIdentifier
        );
        if (tempDefinition === null) {
            throw new AssemblyError("Expected index definition.");
        }
        return new NumberConstant(tempDefinition.index, unsignedInteger64Type);
    }
}

export interface BinaryOperator extends BinaryOperatorInterface {}

export abstract class BinaryOperator {
    
    constructor(text: string, precedence: number) {
        this.text = text;
        this.precedence = precedence;
        binaryOperatorList.push(this);
    }
    
    createExpression(operand1: Expression, operand2: Expression): Expression {
        return new BinaryExpression(this, operand1, operand2);
    }
    
    createConstantOrNull(operand1: Expression, operand2: Expression): Constant {
        return null;
    }
    
    createInstructionArgOrNull(operand1: Expression, operand2: Expression): InstructionArg {
        return null;
    }
    
    createIdentifierOrNull(operand1: Expression, operand2: Expression): Identifier {
        return null;
    }
}

export class TypeCoercionOperator extends BinaryOperator {
    
    constructor() {
        super(":", 1);
    }
    
    getConstantDataType(operand1: Expression, operand2: Expression): DataType {
        return operand2.evaluateToDataType();
    }
    
    createConstantOrNull(operand1: Expression, operand2: Expression): Constant {
        let tempConstant = operand1.evaluateToConstantOrNull();
        if (tempConstant === null) {
            return null;
        }
        let tempDataType = operand2.evaluateToDataType();
        tempConstant.setDataType(tempDataType);
        return tempConstant;
    }
    
    createInstructionArgOrNull(operand1: Expression, operand2: Expression): InstructionArg {
        let tempArg = operand1.evaluateToInstructionArg();
        let tempDataType = operand2.evaluateToDataType();
        tempArg.setDataType(tempDataType);
        return tempArg;
    }
}

export class PublicFunctionOperator extends BinaryOperator {
    
    constructor() {
        super(".", 1);
    }
    
    getConstantDataType(operand1: Expression, operand2: Expression): DataType {
        return signedInteger64Type;
    }
    
    createConstantOrNull(operand1: Expression, operand2: Expression): Constant {
        let tempInterfaceIndex = operand1.evaluateToNumber();
        let tempIdentifier = operand2.evaluateToIdentifier();
        let tempDefinition = operand1.scope.getPublicFunctionDefinition(
            tempIdentifier,
            tempInterfaceIndex
        );
        if (tempDefinition === null) {
            throw new AssemblyError("Unknown public function.");
        }
        return new NumberConstant(tempDefinition.index, unsignedInteger64Type)
    }
}

export interface BinaryNumberOperator extends BinaryNumberOperatorInterface {}

export abstract class BinaryNumberOperator extends BinaryOperator {
    
    createConstantOrNull(operand1: Expression, operand2: Expression): Constant {
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
    
    getConstantDataType(operand1: Expression, operand2: Expression): DataType {
        let tempDataType1 = operand1.getConstantDataType();
        let tempDataType2 = operand2.getConstantDataType();
        if (!(tempDataType1 instanceof NumberType && tempDataType1 instanceof NumberType)) {
            throw new AssemblyError("Expected numeric value.");
        }
        return this.getConstantDataTypeHelper(
            tempDataType1 as NumberType,
            tempDataType2 as NumberType
        );
    }
}

export interface BinaryTypeMergeOperator extends BinaryTypeMergeOperatorInterface {}

export class BinaryTypeMergeOperator extends BinaryNumberOperator {
    
    getConstantDataTypeHelper(numberType1: NumberType, numberType2: NumberType): NumberType {
        return dataTypeUtils.mergeNumberTypes(numberType1, numberType2);
    }
    
    createConstantOrNullHelper(numberConstant1: NumberConstant, numberConstant2: NumberConstant): NumberConstant {
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
    
    calculateInteger(value1: bigint, value2: bigint): bigint {
        throw new AssemblyError("Unsupported operation between integers.");
    }
    
    calculateFloat(value1: number, value2: number): number {
        throw new AssemblyError("Unsupported operation between floating point numbers.");
    }
}

export class AdditionOperator extends BinaryTypeMergeOperator {
    
    constructor() {
        super("+", 4);
    }
    
    createConstantOrNull(operand1: Expression, operand2: Expression): Constant {
        let tempConstant1 = operand1.evaluateToConstantOrNull();
        let tempConstant2 = operand2.evaluateToConstantOrNull();
        if (tempConstant1 !== null && tempConstant2 !== null
                && tempConstant1 instanceof StringConstant
                && tempConstant2 instanceof StringConstant) {
            let tempStringConstant1 = tempConstant1 as StringConstant;
            let tempStringConstant2 = tempConstant2 as StringConstant;
            return new StringConstant(tempStringConstant1.value + tempStringConstant2.value);
        } else {
            return super.createConstantOrNull(operand1, operand2);
        }
    }
    
    calculateInteger(value1: bigint, value2: bigint): bigint {
        return value1 + value2;
    }
    
    calculateFloat(value1: number, value2: number): number {
        return value1 + value2;
    }
}

export class SubtractionOperator extends BinaryTypeMergeOperator {
    
    constructor() {
        super("-", 4);
    }
    
    calculateInteger(value1: bigint, value2: bigint): bigint {
        return value1 - value2;
    }
    
    calculateFloat(value1: number, value2: number): number {
        return value1 - value2;
    }
}

export class MultiplicationOperator extends BinaryTypeMergeOperator {
    
    constructor() {
        super("*", 3);
    }
    
    calculateInteger(value1: bigint, value2: bigint): bigint {
        return value1 * value2;
    }
    
    calculateFloat(value1: number, value2: number): number {
        return value1 * value2;
    }
}

export class DivisionOperator extends BinaryTypeMergeOperator {
    
    constructor() {
        super("/", 3);
    }
    
    calculateInteger(value1: bigint, value2: bigint): bigint {
        return value1 / value2;
    }
    
    calculateFloat(value1: number, value2: number): number {
        return value1 / value2;
    }
}

export class ModulusOperator extends BinaryTypeMergeOperator {
    
    constructor() {
        super("%", 3);
    }
    
    calculateInteger(value1: bigint, value2: bigint): bigint {
        return value1 % value2;
    }
    
    calculateFloat(value1: number, value2: number): number {
        return value1 % value2;
    }
}

export class BitwiseAndOperator extends BinaryTypeMergeOperator {
    
    constructor() {
        super("&", 6);
    }
    
    calculateInteger(value1: bigint, value2: bigint): bigint {
        return value1 & value2;
    }
}

export class BitwiseXorOperator extends BinaryTypeMergeOperator {
    
    constructor() {
        super("^", 7);
    }
    
    calculateInteger(value1: bigint, value2: bigint): bigint {
        return value1 ^ value2;
    }
}

export class BitwiseOrOperator extends BinaryTypeMergeOperator {
    
    constructor() {
        super("|", 8);
    }
    
    calculateInteger(value1: bigint, value2: bigint): bigint {
        return value1 | value2;
    }
}

export interface BinaryBitshiftOperator extends BinaryBitshiftOperatorInterface {}

export class BinaryBitshiftOperator extends BinaryNumberOperator {
    
    getConstantDataTypeHelper(numberType1: NumberType, numberType2: NumberType): NumberType {
        if (!(numberType1 instanceof IntegerType)) {
            throw new AssemblyError("Unsupported operation on floating point number.");
        }
        return numberType1;
    }
    
    createConstantOrNullHelper(numberConstant1: NumberConstant, numberConstant2: NumberConstant): NumberConstant {
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
}

export class BitshiftLeftOperator extends BinaryBitshiftOperator {
    
    constructor() {
        super("<<", 5);
    }
    
    calculateInteger(value: bigint, offset: bigint): bigint {
        return value << offset;
    }
}

export class BitshiftRightOperator extends BinaryBitshiftOperator {
    
    constructor() {
        super(">>", 5);
    }
    
    calculateInteger(value: bigint, offset: bigint): bigint {
        return value >> offset;
    }
}

new NegationOperator();
new BitwiseInversionOperator();
export const macroIdentifierOperator = new MacroIdentifierOperator();
new IndexOperator();

new TypeCoercionOperator();
new PublicFunctionOperator();
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


