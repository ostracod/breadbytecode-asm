
import {Expression, Constant, InstructionArg} from "models/objects";

export interface DataType {
    argPrefix: number;
    
    // Concrete subclasses must implement these methods:
    getName(): string;
}

export interface BetaType extends DataType {
    byteAmount: number;
    bitAmount: number;
}

export interface NumberType extends BetaType {
    // Concrete subclasses may override these methods:
    restrictNumber(value: number): number;
    
    // Concrete subclasses must implement these methods:
    getNamePrefix(): string;
    getClassMergePriority(): number;
    getByteAmountMergePriority(): number;
    convertNumberToBuffer(value: number): Buffer;
}

export interface IntegerType extends NumberType {
    contains(value: number): boolean;
    
    // Concrete subclasses must implement these methods:
    getMinimumNumber(): number;
    getMaximumNumber(): number;
}

export interface Operator {
    text: string;
}

export interface UnaryOperator extends Operator {
    // Concrete subclasses may override these methods:
    createExpression(operand: Expression): Expression;
    getConstantDataType(operand: Expression): DataType;
    createConstantOrNull(operand: Expression): Constant;
}

export interface BinaryOperator extends Operator {
    precedence: number;
    
    createExpression(operand1: Expression, operand2: Expression): Expression;
    
    // Concrete subclasses may override these methods:
    createConstantOrNull(operand1: Expression, operand2: Expression): Constant;
    createInstructionArgOrNull(operand1: Expression, operand2: Expression): InstructionArg;
    
    // Concrete subclasses must implement these methods:
    getConstantDataType(operand1: Expression, operand2: Expression): DataType;
}

export interface InstructionType {
    name: string;
    opcode: number;
    argAmount: number;
}


