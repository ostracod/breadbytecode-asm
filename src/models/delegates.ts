
import {Expression} from "models/objects";

export interface DataType {
    // Concrete subclasses must implement these methods:
    getName(): string;
}

export interface BetaType extends DataType {
    byteAmount: number;
}

export interface NumberType extends BetaType {
    // Concrete subclasses must implement these methods:
    getNamePrefix(): string;
    getClassMergePriority(): number;
    getByteAmountMergePriority(): number;
}

export interface Operator {
    text: string;
}

export interface UnaryOperator extends Operator {
    createExpression(operand: Expression): Expression;
    getConstantDataType(operand: Expression): DataType;
}

export interface BinaryOperator extends Operator {
    precedence: number;
    
    createExpression(operand1: Expression, operand2: Expression): Expression;
    
    // Concrete subclasses must implement these methods:
    getConstantDataType(operand1: Expression, operand2: Expression): DataType;
}

export interface InstructionType {
    name: string;
    opcode: number;
    argumentAmount: number;
}


