
import {Operator, UnaryOperator as UnaryOperatorInterface, BinaryOperator as BinaryOperatorInterface} from "/models/delegates";
import {Expression} from "models/objects";
import {UnaryExpression, UnaryAtExpression, BinaryExpression} from "objects/expression";

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

export class UnaryAtOperator extends UnaryOperator {
    constructor() {
        super("@");
    }
}

UnaryAtOperator.prototype.createExpression = function(operand: Expression): Expression {
    return new UnaryAtExpression(operand);
}

export interface BinaryOperator extends BinaryOperatorInterface {}

export class BinaryOperator {
    constructor(text: string, precedence: number) {
        this.text = text;
        this.precedence = precedence;
        binaryOperatorList.push(this);
    }
}

BinaryOperator.prototype.createExpression = function(operand1: Expression, operand2: Expression): Expression {
    return new BinaryExpression(this, operand1, operand2);
}

new UnaryOperator("-");
new UnaryOperator("~");
export var unaryAtOperator = new UnaryAtOperator();

new BinaryOperator(":", 1);
new BinaryOperator(".", 1);
new BinaryOperator("*", 3);
new BinaryOperator("/", 3);
new BinaryOperator("%", 3);
new BinaryOperator("+", 4);
new BinaryOperator("-", 4);
new BinaryOperator(">>", 5);
new BinaryOperator("<<", 5);
new BinaryOperator("&", 6);
new BinaryOperator("^", 7);
new BinaryOperator("|", 8);


