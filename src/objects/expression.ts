
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
    IdentifierMap, FunctionDefinition, Constant, InstructionArg, IndexDefinition, VersionNumber
} from "models/objects";

import {AssemblyError} from "objects/assemblyError";
import {Identifier, MacroIdentifier} from "objects/identifier";
import {ArgPerm} from "objects/argPerm";
import {InstructionRef, PointerInstructionRef, ConstantInstructionArg, RefInstructionArg, nameInstructionRefMap} from "objects/instruction";
import {builtInConstantSet, NumberConstant} from "objects/constant";
import {DEPENDENCY_MODIFIER} from "objects/dependencyDefinition";

import {PointerType, pointerType, signedInteger64Type, StringType} from "delegates/dataType";
import {macroIdentifierOperator} from "delegates/operator";

import {dataTypeUtils} from "utils/dataTypeUtils";

export interface Expression extends ExpressionInterface {}

export abstract class Expression {
    constructor() {
        this.line = null;
        this.scope = null;
        // We cache this value so that we can verify
        // the output of evaluateToConstant.
        // Use Expression.getConstantDataType to cache
        // and retrieve this value.
        this.constantDataType = null;
    }
}

Expression.prototype.createError = function(message: string): AssemblyError {
    throw new AssemblyError(message, this.line.lineNumber, this.line.filePath);
}

Expression.prototype.handleError = function(error: Error): void {
    if (error instanceof AssemblyError) {
        if (error.lineNumber === null) {
            error.lineNumber = this.line.lineNumber;
        }
        if (error.filePath === null) {
            error.filePath = this.line.filePath;
        }
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
        throw this.createError("Expected identifier.");
    }
    return output;
}

Expression.prototype.evaluateToIndexDefinitionOrNull = function(): IndexDefinition {
    let tempIdentifier = this.evaluateToIdentifierOrNull();
    if (tempIdentifier === null) {
        return null;
    }
    return this.scope.getIndexDefinitionByIdentifier(tempIdentifier);
}

Expression.prototype.evaluateToConstant = function(): Constant {
    var output = this.evaluateToConstantOrNull();
    if (output === null) {
        throw this.createError("Expected constant.");
    }
    if (this.constantDataType !== null
            && !this.constantDataType.equals(output.getDataType())) {
        throw this.createError("Constant has inconsistent data type.");
    }
    return output;
}

Expression.prototype.evaluateToNumber = function(): number {
    let tempConstant = this.evaluateToConstantOrNull();
    if (tempConstant === null || !(tempConstant instanceof NumberConstant)) {
        throw this.createError("Expected number constant.");
    }
    let tempNumberConstant = tempConstant as NumberConstant;
    return Number(tempNumberConstant.value);
}

Expression.prototype.evaluateToDependencyModifier = function(): number {
    let output = this.evaluateToDependencyModifierOrNull();
    if (output === null) {
        throw this.createError("Expected dependency modifier.");
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
    let tempDefinition = this.evaluateToIndexDefinitionOrNull();
    if (tempDefinition !== null) {
        return tempDefinition.createConstantOrNull();
    }
    return null;
}

Expression.prototype.evaluateToString = function(): string {
    throw this.createError("Expected string.");
}

Expression.prototype.evaluateToDataType = function(): DataType {
    throw this.createError("Expected data type.");
}

Expression.prototype.evaluateToArgPerm = function(): ArgPerm {
    throw this.createError("Expected arg perm.");
}

Expression.prototype.evaluateToVersionNumber = function(): VersionNumber {
    throw this.createError("Expected version number.");
}

Expression.prototype.evaluateToDependencyModifierOrNull = function(): number {
    return null;
}

Expression.prototype.evaluateToInstructionArg = function(): InstructionArg {
    let tempDefinition = this.evaluateToIndexDefinitionOrNull();
    if (tempDefinition !== null) {
        let tempResult = tempDefinition.createInstructionArgOrNull();
        if (tempResult !== null) {
            return tempResult;
        }
    }
    let tempConstant = this.evaluateToConstantOrNull();
    if (tempConstant !== null) {
        tempConstant.compress();
        return new ConstantInstructionArg(tempConstant);
    }
    let tempIdentifier = this.evaluateToIdentifierOrNull();
    if (tempIdentifier !== null && !tempIdentifier.getIsBuiltIn()) {
        throw this.createError(`Unknown identifier "${tempIdentifier.name}".`);
    } else {
        throw this.createError("Expected number or pointer.");
    }
}

Expression.prototype.evaluateToInstructionRef = function(): InstructionRef {
    let tempArg = this.evaluateToInstructionArg();
    if (!(tempArg.getDataType() instanceof PointerType)) {
        throw this.createError("Expected pointer for instruction ref.");
    }
    return new PointerInstructionRef(tempArg);
}

Expression.prototype.populateMacroInvocationId = function(macroInvocationId: number): void {
    // Do nothing.
}

Expression.prototype.getConstantDataTypeHelper = function(): DataType {
    throw this.createError("Expected constant value.");
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
    if (this.text in builtInConstantSet) {
        return builtInConstantSet[this.text].copy();
    }
    return ArgTerm.prototype.evaluateToConstantOrNull.call(this);
}

ArgWord.prototype.evaluateToDataType = function(): DataType {
    return dataTypeUtils.getDataTypeByName(this.text);
}

ArgWord.prototype.evaluateToArgPerm = function(): ArgPerm {
    return new ArgPerm(this.text);
}

ArgWord.prototype.evaluateToDependencyModifierOrNull = function(): number {
    if (this.text in DEPENDENCY_MODIFIER) {
        return DEPENDENCY_MODIFIER[this.text];
    }
    return ArgTerm.prototype.evaluateToDependencyModifierOrNull.call(this);
}

ArgWord.prototype.evaluateToInstructionRef = function(): InstructionRef {
    if (this.text in nameInstructionRefMap) {
        return nameInstructionRefMap[this.text];
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
    constructor(versionNumber: VersionNumber) {
        super();
        this.versionNumber = versionNumber;
    }
}

ArgVersionNumber.prototype.copy = function(): Expression {
    return new ArgVersionNumber(this.versionNumber.copy());
}

ArgVersionNumber.prototype.getDisplayString = function(): string {
    return this.versionNumber.getDisplayString();
}

ArgVersionNumber.prototype.evaluateToVersionNumber = function(): VersionNumber {
    return this.versionNumber.copy();
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
    try {
        return this.operator.createConstantOrNull(this.operand);
    } catch(error) {
        this.handleError(error);
        throw error;
    }
}

UnaryExpression.prototype.getConstantDataTypeHelper = function(): DataType {
    try {
        return this.operator.getConstantDataType(this.operand);
    } catch(error) {
        this.handleError(error);
        throw error;
    }
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
    throw this.createError("Not yet implemented.");
}

BinaryExpression.prototype.evaluateToConstantOrNull = function(): Constant {
    try {
        return this.operator.createConstantOrNull(this.operand1, this.operand2);
    } catch(error) {
        this.handleError(error);
        throw error;
    }
}

BinaryExpression.prototype.evaluateToInstructionArg = function(): InstructionArg {
    let tempResult;
    try {
        tempResult = this.operator.createInstructionArgOrNull(this.operand1, this.operand2);
    } catch(error) {
        this.handleError(error);
        throw error;
    }
    if (tempResult !== null) {
        return tempResult;
    }
    return Expression.prototype.evaluateToInstructionArg.call(this);
}

BinaryExpression.prototype.getConstantDataTypeHelper = function(): DataType {
    try {
        return this.operator.getConstantDataType(this.operand1, this.operand2);
    } catch(error) {
        this.handleError(error);
        throw error;
    }
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


