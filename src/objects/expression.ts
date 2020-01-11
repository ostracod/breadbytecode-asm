
import {ExpressionProcessor} from "models/items";
import {UnaryOperator, BinaryOperator, DataType, NumberType} from "models/delegates";
import {
    Expression as ExpressionInterface,
    ArgTerm as ArgTermInterface,
    ArgWord as ArgWordInterface,
    ArgNumber as ArgNumberInterface,
    ArgVersionNumber as ArgVersionNumberInterface,
    ArgString as ArgStringInterface,
    UnaryExpression as UnaryExpressionInterface,
    MacroIdentifierExpression as MacroIdentifierExpressionInterface,
    BinaryExpression as BinaryExpressionInterface,
    SubscriptExpression as SubscriptExpressionInterface,
    IdentifierMap, FunctionDefinition, NumberConstant
} from "models/objects";

import {AssemblyError} from "objects/assemblyError";
import {Identifier, MacroIdentifier} from "objects/identifier";
import {ArgPerm} from "objects/argPerm";
import {InstructionRef, PointerInstructionRef, INSTRUCTION_REF_PREFIX} from "objects/instruction";

import {pointerType, signedInteger64Type, StringType} from "delegates/dataType";
import {macroIdentifierOperator} from "delegates/operator";

import {dataTypeUtils} from "utils/dataTypeUtils";
import {instructionUtils} from "utils/instructionUtils";

const keywordInstructionRefMap = {
    globalFrame: new InstructionRef(INSTRUCTION_REF_PREFIX.globalFrame),
    localFrame: new InstructionRef(INSTRUCTION_REF_PREFIX.localFrame),
    prevArgFrame: new InstructionRef(INSTRUCTION_REF_PREFIX.prevArgFrame),
    nextArgFrame: new InstructionRef(INSTRUCTION_REF_PREFIX.nextArgFrame),
    appData: new InstructionRef(INSTRUCTION_REF_PREFIX.appData)
};

export interface Expression extends ExpressionInterface {}

export abstract class Expression {
    constructor() {
        this.functionDefinition = null;
        // We cache this value so that we can verify
        // the output of evaluateToConstant.
        // Use Expression.getConstantDataType to cache
        // and retrieve this value.
        this.constantDataType = null;
    }
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

Expression.prototype.evaluateToIdentifier = function(): Identifier {
    var output = this.evaluateToIdentifierOrNull();
    if (output === null) {
        throw new AssemblyError("Expected identifier.");
    }
    return output;
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

Expression.prototype.getConstantDataType = function(): DataType {
    if (this.constantDataType === null) {
        this.constantDataType = this.getConstantDataTypeHelper();
    }
    return this.constantDataType;
}

Expression.prototype.evaluateToIdentifierOrNull = function(): Identifier {
    return null;
}

Expression.prototype.evaluateToNumberConstantOrNull = function(): NumberConstant {
    return null;
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

Expression.prototype.evaluateToInstructionArg = function(): Buffer {
    let tempIdentifier = this.evaluateToIdentifierOrNull();
    if (tempIdentifier !== null) {
        return this.functionDefinition.convertIdentifierToInstructionArg(tempIdentifier);
    }
    let tempConstant = this.evaluateToNumberConstantOrNull();
    if (tempConstant !== null) {
        return tempConstant.createInstructionArg();
    }
    throw new AssemblyError("Expected number or pointer.");
    
}

Expression.prototype.evaluateToInstructionRef = function(): InstructionRef {
    let tempBuffer = this.evaluateToInstructionArg();
    return new PointerInstructionRef(tempBuffer);
}

Expression.prototype.populateMacroInvocationId = function(macroInvocationId: number): void {
    // Do nothing.
}

Expression.prototype.getConstantDataTypeHelper = function(): DataType {
    throw new AssemblyError("Expected constant value.");
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
    return new Identifier(this.text);
}

ArgWord.prototype.evaluateToDataType = function(): DataType {
    return dataTypeUtils.getDataTypeByName(this.text);
}

ArgWord.prototype.evaluateToArgPerm = function(): ArgPerm {
    return new ArgPerm(this.text);
}

ArgWord.prototype.evaluateToInstructionArg = function(): Buffer {
    if (this.text === "null") {
        return instructionUtils.createInstructionArg(
            INSTRUCTION_REF_PREFIX.constant,
            pointerType,
            Buffer.alloc(0)
        );
    }
    return ArgTerm.prototype.evaluateToInstructionArg.call(this);
}

ArgWord.prototype.evaluateToInstructionRef = function(): InstructionRef {
    if (this.text in keywordInstructionRefMap) {
        return keywordInstructionRefMap[this.text];
    }
    return ArgTerm.prototype.evaluateToInstructionRef.call(this);
}

ArgWord.prototype.getConstantDataTypeHelper = function(): DataType {
    return signedInteger64Type;
}

export interface ArgNumber extends ArgNumberInterface {}

export class ArgNumber extends ArgTerm {
    constructor(constant: NumberConstant) {
        super();
        this.constant = constant;
    }
}

ArgNumber.prototype.copy = function(): Expression {
    return new ArgNumber(this.constant.copy());
}

ArgNumber.prototype.getDisplayString = function(): string {
    return this.constant.value + "";
}

ArgNumber.prototype.evaluateToNumberConstantOrNull = function(): NumberConstant {
    let output = this.constant.copy();
    output.compress();
    return output;
}

ArgNumber.prototype.getConstantDataTypeHelper = function(): DataType {
    return this.constant.dataType;
}

export interface ArgVersionNumber extends ArgVersionNumberInterface {}

export class ArgVersionNumber extends ArgTerm {
    constructor(majorNumber: number, minorNumber: number, patchNumber: number) {
        super();
        this.majorNumber = majorNumber;
        this.minorNumber = minorNumber;
        this.patchNumber = patchNumber;
    }
}

ArgVersionNumber.prototype.copy = function(): Expression {
    return new ArgVersionNumber(this.majorNumber, this.minorNumber, this.patchNumber);
}

ArgVersionNumber.prototype.getDisplayString = function(): string {
    return this.majorNumber + "." + this.minorNumber + "." + this.patchNumber;
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

ArgString.prototype.getConstantDataTypeHelper = function(): DataType {
    return new StringType(this.value.length);
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

UnaryExpression.prototype.evaluateToNumberConstantOrNull = function(): NumberConstant {
    return this.operator.createNumberConstantOrNull(this.operand);
}

UnaryExpression.prototype.getConstantDataTypeHelper = function(): DataType {
    return this.operator.getConstantDataType(this.operand);
}

export interface MacroIdentifierExpression extends MacroIdentifierExpressionInterface {}

export class MacroIdentifierExpression extends UnaryExpression {
    constructor(operand: Expression) {
        super(macroIdentifierOperator, operand);
        this.macroInvocationId = null;
    }
}

MacroIdentifierExpression.prototype.copy = function(): Expression {
    var output = new MacroIdentifierExpression(this.operand.copy());
    output.macroInvocationId = this.macroInvocationId;
    return output;
}

MacroIdentifierExpression.prototype.getDisplayString = function(): string {
    if (this.macroInvocationId === null) {
        return UnaryExpression.prototype.getDisplayString.call(this);
    }
    return this.operator.text + "{" + this.macroInvocationId + "}" + this.operand.getDisplayString();
}

MacroIdentifierExpression.prototype.evaluateToIdentifierOrNull = function(): Identifier {
    if (!(this.operand instanceof ArgTerm)) {
        return null;
    }
    return new MacroIdentifier(this.operand.text, this.macroInvocationId);
}

MacroIdentifierExpression.prototype.populateMacroInvocationId = function(macroInvocationId: number): void {
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

BinaryExpression.prototype.getConstantDataTypeHelper = function(): DataType {
    return this.operator.getConstantDataType(this.operand1, this.operand2);
}

export interface SubscriptExpression extends SubscriptExpressionInterface {}

export class SubscriptExpression extends Expression {
    constructor(
        sequenceExpression: Expression,
        indexExpression: Expression,
        dataTypeExpression: Expression
    ) {
        super();
        this.sequenceExpression = sequenceExpression;
        this.indexExpression = indexExpression;
        this.dataTypeExpression = dataTypeExpression;
    }
}

SubscriptExpression.prototype.copy = function(): Expression {
    return new SubscriptExpression(
        this.sequenceExpression.copy(),
        this.indexExpression.copy(),
        this.dataTypeExpression.copy()
    );
}

SubscriptExpression.prototype.getDisplayString = function(): string {
    return "(" + this.sequenceExpression.getDisplayString() + "[" + this.indexExpression.getDisplayString() + "]:" + this.dataTypeExpression.getDisplayString() + ")";
}

SubscriptExpression.prototype.processExpressionsHelper = function(processExpression: ExpressionProcessor, shouldRecurAfterProcess?: boolean): Expression {
    var tempResult = processExpression(this);
    if (tempResult !== null) {
        return tempResult;
    }
    this.sequenceExpression = this.sequenceExpression.processExpressions(
        processExpression,
        shouldRecurAfterProcess
    );
    this.indexExpression = this.indexExpression.processExpressions(
        processExpression,
        shouldRecurAfterProcess
    );
    this.dataTypeExpression = this.dataTypeExpression.processExpressions(
        processExpression,
        shouldRecurAfterProcess
    );
    return null;
}

SubscriptExpression.prototype.evaluateToInstructionArg = function(): Buffer {
    let tempRef = this.sequenceExpression.evaluateToInstructionRef();
    return tempRef.createInstructionArg(
        this.indexExpression.evaluateToInstructionArg(),
        this.dataTypeExpression.evaluateToDataType()
    );
}

SubscriptExpression.prototype.getConstantDataTypeHelper = function(): DataType {
    return this.dataTypeExpression.evaluateToDataType()
}


