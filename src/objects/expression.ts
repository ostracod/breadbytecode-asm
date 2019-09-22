
import {ExpressionProcessor} from "models/items";
import {UnaryOperator, BinaryOperator, DataType} from "models/delegates";
import {
    Expression as ExpressionInterface,
    ArgTerm as ArgTermInterface,
    ArgWord as ArgWordInterface,
    ArgNumber as ArgNumberInterface,
    ArgString as ArgStringInterface,
    UnaryExpression as UnaryExpressionInterface,
    UnaryAtExpression as UnaryAtExpressionInterface,
    BinaryExpression as BinaryExpressionInterface,
    SubscriptExpression as SubscriptExpressionInterface,
    IdentifierMap
} from "models/objects";
import {AssemblyError} from "objects/assemblyError";
import {Identifier} from "objects/identifier";
import {ArgPerm} from "objects/argPerm";
import {dataTypeUtils} from "utils/dataTypeUtils";

export interface Expression extends ExpressionInterface {}

export abstract class Expression {
    
}

Expression.prototype.processExpressions = function(processExpression: ExpressionProcessor, shouldRecurAfterProcess?: boolean): Expression {
    if (typeof shouldRecurAfterProcess === "undefined") {
        shouldRecurAfterProcess = false;
    }
    var output = this;
    while (true) {
        var tempResult = output.processExpressionsHelper(processExpression, shouldRecurAfterProcess);
        if (tempResult === null) {
            return output;
        }
        output = tempResult;
        if (!shouldRecurAfterProcess) {
            break;
        }
    }
    return output;
}

Expression.prototype.evaluateToIdentifierOrNull = function(): Identifier {
    return null;
}

Expression.prototype.evaluateToIdentifier = function(): Identifier {
    var output = this.evaluateToIdentifierOrNull();
    if (output === null) {
        throw new AssemblyError("Expected identifier.");
    }
    return output;
}

Expression.prototype.evaluateToString = function(): string {
    throw new AssemblyError("Expected string.");
}

Expression.prototype.evaluateToDataType = function(): DataType {
    throw new AssemblyError("Expected data type.");
}

Expression.prototype.evaluateToArgPerm = function(): ArgPerm {
    throw new AssemblyError("Expected arg perm.");
}

Expression.prototype.substituteIdentifiers = function(identifierExpressionMap: IdentifierMap<Expression>): Expression {
    var tempIdentifier = this.evaluateToIdentifierOrNull();
    if (tempIdentifier === null) {
        return null;
    }
    var tempExpression = identifierExpressionMap.get(tempIdentifier);
    if (tempExpression === null) {
        return null;
    }
    return tempExpression.copy();
}

Expression.prototype.populateMacroInvocationId = function(macroInvocationId: number): void {
    // Do nothing.
}

export interface ArgTerm extends ArgTermInterface {}

export abstract class ArgTerm extends Expression {
    
}

ArgTerm.prototype.processExpressionsHelper = function(processExpression: ExpressionProcessor, shouldRecurAfterProcess?: boolean): Expression {
    var tempResult = processExpression(this);
    if (tempResult !== null) {
        return tempResult;
    }
    return null;
}

export interface ArgWord extends ArgWordInterface {}

export class ArgWord extends ArgTerm {
    constructor(text: string) {
        super();
        this.text = text;
    }
}

ArgWord.prototype.copy = function(): Expression {
    return new ArgWord(this.text);
}

ArgWord.prototype.getDisplayString = function(): string {
    return this.text;
}

ArgWord.prototype.evaluateToIdentifierOrNull = function(): Identifier {
    return new Identifier(this.text, null);
}

ArgWord.prototype.evaluateToDataType = function(): DataType {
    return dataTypeUtils.getDataTypeByName(this.text);
}

ArgWord.prototype.evaluateToArgPerm = function(): ArgPerm {
    return new ArgPerm(this.text);
}

export interface ArgNumber extends ArgNumberInterface {}

export class ArgNumber extends ArgTerm {
    constructor(value: number) {
        super();
        this.value = value;
    }
}

ArgNumber.prototype.copy = function(): Expression {
    return new ArgNumber(this.value);
}

ArgNumber.prototype.getDisplayString = function(): string {
    return this.value + "";
}

export interface ArgString extends ArgStringInterface {}

export class ArgString extends ArgTerm {
    constructor(value: string) {
        super();
        this.value = value;
    }
}

ArgString.prototype.copy = function(): Expression {
    return new ArgString(this.value);
}

ArgString.prototype.getDisplayString = function(): string {
    return "\"" + this.value + "\"";
}

ArgString.prototype.evaluateToString = function(): string {
    return this.value;
}

export interface UnaryExpression extends UnaryExpressionInterface {}

export class UnaryExpression extends Expression {
    constructor(operator: UnaryOperator, operand: Expression) {
        super();
        this.operator = operator;
        this.operand = operand;
    }
}

UnaryExpression.prototype.copy = function(): Expression {
    return new UnaryExpression(this.operator, this.operand.copy());
}

UnaryExpression.prototype.getDisplayString = function(): string {
    return this.operator.text + this.operand.getDisplayString();
}

UnaryExpression.prototype.processExpressionsHelper = function(processExpression: ExpressionProcessor, shouldRecurAfterProcess?: boolean): Expression {
    var tempResult = processExpression(this);
    if (tempResult !== null) {
        return tempResult;
    }
    this.operand = this.operand.processExpressions(processExpression, shouldRecurAfterProcess);
    return null;
}

export interface UnaryAtExpression extends UnaryAtExpressionInterface {}

export class UnaryAtExpression extends UnaryExpression {
    constructor(operand: Expression) {
        super(unaryAtOperator, operand);
        this.macroInvocationId = null;
    }
}

UnaryAtExpression.prototype.copy = function(): Expression {
    var output = new UnaryAtExpression(this.operand.copy());
    output.macroInvocationId = this.macroInvocationId;
    return output;
}

UnaryAtExpression.prototype.getDisplayString = function(): string {
    if (this.macroInvocationId === null) {
        return UnaryExpression.prototype.getDisplayString.call(this);
    }
    return this.operator.text + "{" + this.macroInvocationId + "}" + this.operand.getDisplayString();
}

UnaryAtExpression.prototype.evaluateToIdentifierOrNull = function(): Identifier {
    if (!(this.operand instanceof ArgTerm)) {
        return null;
    }
    return new Identifier(this.operand.text, this.macroInvocationId);
}

UnaryAtExpression.prototype.populateMacroInvocationId = function(macroInvocationId: number): void {
    if (this.macroInvocationId === null) {
        this.macroInvocationId = macroInvocationId;
    }
}

export interface BinaryExpression extends BinaryExpressionInterface {}

export class BinaryExpression extends Expression {
    constructor(operator: BinaryOperator, operand1: Expression, operand2: Expression) {
        super();
        this.operator = operator;
        this.operand1 = operand1;
        this.operand2 = operand2;
    }
}

BinaryExpression.prototype.copy = function(): Expression {
    return new BinaryExpression(
        this.operator,
        this.operand1.copy(),
        this.operand2.copy()
    );
}

BinaryExpression.prototype.getDisplayString = function(): string {
    return "(" + this.operand1.getDisplayString() + " " + this.operator.text + " " + this.operand2.getDisplayString() + ")";
}

BinaryExpression.prototype.processExpressionsHelper = function(processExpression: ExpressionProcessor, shouldRecurAfterProcess?: boolean): Expression {
    var tempResult = processExpression(this);
    if (tempResult !== null) {
        return tempResult;
    }
    this.operand1 = this.operand1.processExpressions(processExpression, shouldRecurAfterProcess);
    this.operand2 = this.operand2.processExpressions(processExpression, shouldRecurAfterProcess);
    return null;
}

BinaryExpression.prototype.evaluateToString = function(): string {
    // TODO: Accommodate string concatenation.
    throw new AssemblyError("Not yet implemented.");
}

export interface SubscriptExpression extends SubscriptExpressionInterface {}

export class SubscriptExpression extends Expression {
    constructor(sequence: Expression, index: Expression, dataType: Expression) {
        super();
        this.sequence = sequence;
        this.index = index;
        this.dataType = dataType;
    }
}

SubscriptExpression.prototype.copy = function(): Expression {
    return new SubscriptExpression(
        this.sequence.copy(),
        this.index.copy(),
        this.dataType.copy()
    );
}

SubscriptExpression.prototype.getDisplayString = function(): string {
    return "(" + this.sequence.getDisplayString() + "[" + this.index.getDisplayString() + "]:" + this.dataType.getDisplayString() + ")";
}

SubscriptExpression.prototype.processExpressionsHelper = function(processExpression: ExpressionProcessor, shouldRecurAfterProcess?: boolean): Expression {
    var tempResult = processExpression(this);
    if (tempResult !== null) {
        return tempResult;
    }
    this.sequence = this.sequence.processExpressions(processExpression, shouldRecurAfterProcess);
    this.index = this.index.processExpressions(processExpression, shouldRecurAfterProcess);
    this.dataType = this.dataType.processExpressions(processExpression, shouldRecurAfterProcess);
    return null;
}

import {unaryAtOperator} from "delegates/operator";


