
import {Expression} from "models/objects";

export interface DataType {
    getName(): string;
}

export interface NumberType extends DataType {
    byteAmount: number;
    
    getNamePrefix(): string;
}

export interface Operator {
    text: string;
}

export interface UnaryOperator extends Operator {
    createExpression(operand: Expression): Expression; 
}

export interface BinaryOperator extends Operator {
    precedence: number;
    
    createExpression(operand1: Expression, operand2: Expression): Expression;
}


