
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
    IdentifierMap, FunctionDefinition, Constant, NumberConstant, InstructionArg
} from "models/objects";

import {AssemblyError} from "objects/assemblyError";
import {Identifier, MacroIdentifier} from "objects/identifier";
import {ArgPerm} from "objects/argPerm";
import {InstructionRef, PointerInstructionRef, ConstantInstructionArg, RefInstructionArg, INSTRUCTION_REF_PREFIX} from "objects/instruction";
import {NullConstant} from "objects/constant";

import {PointerType, pointerType, signedInteger64Type, StringType} from "delegates/dataType";
import {macroIdentifierOperator} from "delegates/operator";

import {dataTypeUtils} from "utils/dataTypeUtils";

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
        this.scope = null;
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

Expression.prototype.evaluateToConstant = function(): Constant {
    var output = this.evaluateToConstantOrNull();
    if (output === null) {
        throw new AssemblyError("Expected constant.");
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

Expression.prototype.evaluateToConstantOrNull = function(): Constant {
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

Expression.prototype.evaluateToInstructionArg = function(): InstructionArg {
    let tempConstant = this.evaluateToConstantOrNull();
    if (tempConstant !== null) {
        tempConstant.compress();
        return new ConstantInstructionArg(tempConstant);
    }
    let tempIdentifier = this.evaluateToIdentifierOrNull();
    if (tempIdentifier !== null) {
        let tempDefinition = this.scope.getIndexDefinitionByIdentifier(
            tempIdentifier
        );
        return tempDefinition.createInstructionArg();
    }
    throw new AssemblyError("Expected number or pointer.");
}

Expression.prototype.evaluateToInstructionRef = function(): InstructionRef {
    let tempArg = this.evaluateToInstructionArg();
    if (!(tempArg.getDataType() instanceof PointerType)) {
        throw new AssemblyError("Expected pointer for instruction ref.");
    }
    return new PointerInstructionRef(tempArg);
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

ArgWord.prototype.evaluateToConstantOrNull = function(): Constant {
    if (this.text === "null") {
        return new NullConstant();
    }
    return ArgTerm.prototype.evaluateToConstantOrNull.call(this);
}

ArgWord.prototype.evaluateToDataType = function(): DataType {
    return dataTypeUtils.getDataTypeByName(this.text);
}

ArgWord.prototype.evaluateToArgPerm = function(): ArgPerm {
    return new ArgPerm(this.text);
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

ArgNumber.prototype.evaluateToConstantOrNull = function(): Constant {
    return this.constant.copy();
}

ArgNumber.prototype.getConstantDataTypeHelper = function(): DataType {
    return this.constant.numberType;
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

UnaryExpression.prototype.evaluateToConstantOrNull = function(): Constant {
    return this.operator.createConstantOrNull(this.operand);
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

BinaryExpression.prototype.evaluateToConstantOrNull = function(): Constant {
    return this.operator.createConstantOrNull(this.operand1, this.operand2);
}

BinaryExpression.prototype.evaluateToInstructionArg = function(): InstructionArg {
    let tempResult = this.operator.createInstructionArgOrNull(this.operand1, this.operand2);
    if (tempResult !== null) {
        return tempResult;
    }
    return Expression.prototype.evaluateToInstructionArg.call(this);
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

SubscriptExpression.prototype.evaluateToInstructionArg = function(): InstructionArg {
    return new RefInstructionArg(
        this.sequenceExpression.evaluateToInstructionRef(),
        this.dataTypeExpression.evaluateToDataType(),
        this.indexExpression.evaluateToInstructionArg()
    );
}

SubscriptExpression.prototype.getConstantDataTypeHelper = function(): DataType {
    return this.dataTypeExpression.evaluateToDataType()
}


