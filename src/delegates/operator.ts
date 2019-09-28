
import {Operator, UnaryOperator as UnaryOperatorInterface, BinaryOperator as BinaryOperatorInterface, DataType} from "/models/delegates";
import {Expression} from "models/objects";
import {dataTypeUtils} from "utils/dataTypeUtils";
import {signedInteger64Type, NumberType} from "delegates/dataType";
import {UnaryExpression, UnaryAtExpression, BinaryExpression} from "objects/expression";
import {AssemblyError} from "objects/assemblyError";

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

export class UnaryAtOperator extends UnaryOperator {
    constructor() {
        super("@");
    }
}

UnaryAtOperator.prototype.createExpression = function(operand: Expression): Expression {
    return new UnaryAtExpression(operand);
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

export class TypeCoercionOperator extends BinaryOperator {
    constructor() {
        super(":", 1);
    }
}

TypeCoercionOperator.prototype.getConstantDataType = function(operand1: Expression, operand2: Expression): DataType {
    return operand2.evaluateToDataType();
}

export class InterfaceFunctionOperator extends BinaryOperator {
    constructor() {
        super(".", 1);
    }
}

InterfaceFunctionOperator.prototype.getConstantDataType = function(operand1: Expression, operand2: Expression): DataType {
    return signedInteger64Type;
}

export class BinaryTypeMergeOperator extends BinaryOperator {
    
}

BinaryTypeMergeOperator.prototype.getConstantDataType = function(operand1: Expression, operand2: Expression): DataType {
    var tempDataType1 = operand1.getConstantDataType();
    var tempDataType2 = operand2.getConstantDataType();
    if (!(tempDataType1 instanceof NumberType) || !(tempDataType1 instanceof NumberType)) {
        throw new AssemblyError("Expected numeric value.");
    }
    return dataTypeUtils.mergeNumberTypes(
        tempDataType1 as NumberType,
        tempDataType2 as NumberType
    );
}

export class BinaryBitshiftOperator extends BinaryOperator {
    
}

BinaryBitshiftOperator.prototype.getConstantDataType = function(operand1: Expression, operand2: Expression): DataType {
    return operand1.getConstantDataType();
}

new UnaryOperator("-");
new UnaryOperator("~");
export var unaryAtOperator = new UnaryAtOperator();

new TypeCoercionOperator();
new InterfaceFunctionOperator();
new BinaryTypeMergeOperator("*", 3);
new BinaryTypeMergeOperator("/", 3);
new BinaryTypeMergeOperator("%", 3);
new BinaryTypeMergeOperator("+", 4);
new BinaryTypeMergeOperator("-", 4);
new BinaryBitshiftOperator(">>", 5);
new BinaryBitshiftOperator("<<", 5);
new BinaryTypeMergeOperator("&", 6);
new BinaryTypeMergeOperator("^", 7);
new BinaryTypeMergeOperator("|", 8);


