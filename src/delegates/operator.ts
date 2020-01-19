
import {Operator, UnaryOperator as UnaryOperatorInterface, BinaryOperator as BinaryOperatorInterface, DataType} from "/models/delegates";
import {Expression, Constant, InstructionArg} from "models/objects";
import {dataTypeUtils} from "utils/dataTypeUtils";
import {unsignedInteger64Type, signedInteger64Type, NumberType} from "delegates/dataType";
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
export var macroIdentifierOperator = new MacroIdentifierOperator();
new IndexOperator("?");

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


