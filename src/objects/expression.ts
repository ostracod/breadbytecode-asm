
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
import {builtInConstantSet, NumberConstant, StringConstant} from "objects/constant";
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
    
    createError(message: string): AssemblyError {
        throw new AssemblyError(message, this.line.lineNumber, this.line.filePath);
    }
    
    handleError(error: Error): void {
        if (error instanceof AssemblyError) {
            if (error.lineNumber === null) {
                error.lineNumber = this.line.lineNumber;
            }
            if (error.filePath === null) {
                error.filePath = this.line.filePath;
            }
        }
    }
    
    processExpressions(processExpression: ExpressionProcessor, shouldRecurAfterProcess?: boolean): Expression {
        if (typeof shouldRecurAfterProcess === "undefined") {
            shouldRecurAfterProcess = false;
        }
        var output: Expression = this;
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
    
    evaluateToIdentifier(): Identifier {
        var output = this.evaluateToIdentifierOrNull();
        if (output === null) {
            throw this.createError("Expected identifier.");
        }
        return output;
    }
    
    evaluateToIndexDefinitionOrNull(): IndexDefinition {
        let tempIdentifier = this.evaluateToIdentifierOrNull();
        if (tempIdentifier === null) {
            return null;
        }
        return this.scope.getIndexDefinitionByIdentifier(tempIdentifier);
    }
    
    evaluateToConstant(): Constant {
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
    
    evaluateToNumber(): number {
        let tempConstant = this.evaluateToConstantOrNull();
        if (tempConstant === null || !(tempConstant instanceof NumberConstant)) {
            throw this.createError("Expected number constant.");
        }
        let tempNumberConstant = tempConstant as NumberConstant;
        return Number(tempNumberConstant.value);
    }
    
    evaluateToDependencyModifier(): number {
        let output = this.evaluateToDependencyModifierOrNull();
        if (output === null) {
            throw this.createError("Expected dependency modifier.");
        }
        return output;
    }
    
    substituteIdentifiers(identifierExpressionMap: IdentifierMap<Expression>): Expression {
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
    
    getConstantDataType(): DataType {
        if (this.constantDataType === null) {
            this.constantDataType = this.getConstantDataTypeHelper();
        }
        return this.constantDataType;
    }
    
    evaluateToIdentifierName(): string {
        throw this.createError("Expected identifier name.");
    }
    
    evaluateToIdentifierOrNull(): Identifier {
        return null;
    }
    
    evaluateToConstantOrNull(): Constant {
        let tempDefinition = this.evaluateToIndexDefinitionOrNull();
        if (tempDefinition !== null) {
            return tempDefinition.createConstantOrNull();
        }
        return null;
    }
    
    evaluateToString(): string {
        let tempConstant = this.evaluateToConstantOrNull();
        if (tempConstant === null || !(tempConstant instanceof StringConstant)) {
            throw this.createError("Expected string.");
        }
        let tempStringConstant = tempConstant as StringConstant;
        return tempStringConstant.value;
    }
    
    evaluateToDataType(): DataType {
        throw this.createError("Expected data type.");
    }
    
    evaluateToArgPerm(): ArgPerm {
        throw this.createError("Expected arg perm.");
    }
    
    evaluateToVersionNumber(): VersionNumber {
        throw this.createError("Expected version number.");
    }
    
    evaluateToDependencyModifierOrNull(): number {
        return null;
    }
    
    evaluateToInstructionArg(): InstructionArg {
        let tempDefinition = this.evaluateToIndexDefinitionOrNull();
        if (tempDefinition !== null) {
            let tempResult = tempDefinition.createInstructionArgOrNull();
            if (tempResult !== null) {
                return tempResult;
            }
        }
        let tempConstant = this.evaluateToConstantOrNull();
        if (tempConstant !== null && tempConstant.getDataType().argPrefix !== null) {
            tempConstant.compress();
            return new ConstantInstructionArg(tempConstant);
        }
        let tempIdentifier = this.evaluateToIdentifierOrNull();
        if (tempIdentifier !== null && !tempIdentifier.getIsBuiltIn()) {
            throw this.createError(`Unknown identifier "${tempIdentifier.getDisplayString()}".`);
        } else {
            throw this.createError("Expected number or pointer.");
        }
    }
    
    evaluateToInstructionRef(): InstructionRef {
        let tempArg = this.evaluateToInstructionArg();
        if (!(tempArg.getDataType() instanceof PointerType)) {
            throw this.createError("Expected pointer for instruction ref.");
        }
        return new PointerInstructionRef(tempArg);
    }
    
    populateMacroInvocationId(macroInvocationId: number): void {
        // Do nothing.
    }
    
    getConstantDataTypeHelper(): DataType {
        throw this.createError("Expected constant value.");
    }
}

export interface ArgTerm extends ArgTermInterface {}

export abstract class ArgTerm extends Expression {
    
    processExpressionsHelper(processExpression: ExpressionProcessor, shouldRecurAfterProcess?: boolean): Expression {
        var tempResult = processExpression(this);
        if (tempResult !== null) {
            return tempResult;
        }
        return null;
    }
}

export interface ArgWord extends ArgWordInterface {}

export class ArgWord extends ArgTerm {
    
    constructor(text: string) {
        super();
        this.text = text;
    }
    
    copy(): Expression {
        return new ArgWord(this.text);
    }
    
    getDisplayString(): string {
        return this.text;
    }
    
    evaluateToIdentifierName(): string {
        return this.text;
    }
    
    evaluateToIdentifierOrNull(): Identifier {
        return new Identifier(this.text);
    }
    
    evaluateToConstantOrNull(): Constant {
        if (this.text in builtInConstantSet) {
            return builtInConstantSet[this.text].copy();
        }
        return super.evaluateToConstantOrNull();
    }
    
    evaluateToDataType(): DataType {
        return dataTypeUtils.getDataTypeByName(this.text);
    }
    
    evaluateToArgPerm(): ArgPerm {
        return new ArgPerm(this.text);
    }
    
    evaluateToDependencyModifierOrNull(): number {
        if (this.text in DEPENDENCY_MODIFIER) {
            return DEPENDENCY_MODIFIER[this.text];
        }
        return super.evaluateToDependencyModifierOrNull();
    }
    
    evaluateToInstructionRef(): InstructionRef {
        if (this.text in nameInstructionRefMap) {
            return nameInstructionRefMap[this.text];
        }
        return super.evaluateToInstructionRef();
    }
    
    getConstantDataTypeHelper(): DataType {
        return signedInteger64Type;
    }
}

export interface ArgNumber extends ArgNumberInterface {}

export class ArgNumber extends ArgTerm {
    
    constructor(constant: NumberConstant) {
        super();
        this.constant = constant;
    }
    
    copy(): Expression {
        return new ArgNumber(this.constant.copy() as NumberConstant);
    }
    
    getDisplayString(): string {
        return this.constant.value + "";
    }
    
    evaluateToConstantOrNull(): Constant {
        return this.constant.copy();
    }
    
    getConstantDataTypeHelper(): DataType {
        return this.constant.numberType;
    }
}

export interface ArgVersionNumber extends ArgVersionNumberInterface {}

export class ArgVersionNumber extends ArgTerm {
    
    constructor(versionNumber: VersionNumber) {
        super();
        this.versionNumber = versionNumber;
    }
    
    copy(): Expression {
        return new ArgVersionNumber(this.versionNumber.copy());
    }
    
    getDisplayString(): string {
        return this.versionNumber.getDisplayString();
    }
    
    evaluateToVersionNumber(): VersionNumber {
        return this.versionNumber.copy();
    }
}

export interface ArgString extends ArgStringInterface {}

export class ArgString extends ArgTerm {
    
    constructor(value: string) {
        super();
        this.constant = new StringConstant(value);
    }
    
    copy(): Expression {
        return new ArgString(this.constant.value);
    }
    
    getDisplayString(): string {
        return "\"" + this.constant.value + "\"";
    }
    
    evaluateToConstantOrNull(): Constant {
        return this.constant;
    }
    
    getConstantDataTypeHelper(): DataType {
        return this.constant.getDataType();
    }
}

export interface UnaryExpression extends UnaryExpressionInterface {}

export class UnaryExpression extends Expression {
    
    constructor(operator: UnaryOperator, operand: Expression) {
        super();
        this.operator = operator;
        this.operand = operand;
    }
    
    copy(): Expression {
        return new UnaryExpression(this.operator, this.operand.copy());
    }
    
    getDisplayString(): string {
        return this.operator.text + this.operand.getDisplayString();
    }
    
    processExpressionsHelper(processExpression: ExpressionProcessor, shouldRecurAfterProcess?: boolean): Expression {
        var tempResult = processExpression(this);
        if (tempResult !== null) {
            return tempResult;
        }
        this.operand = this.operand.processExpressions(processExpression, shouldRecurAfterProcess);
        return null;
    }
    
    evaluateToConstantOrNull(): Constant {
        let tempResult;
        try {
            tempResult = this.operator.createConstantOrNull(this.operand);
        } catch(error) {
            this.handleError(error);
            throw error;
        }
        if (tempResult === null) {
            return super.evaluateToConstantOrNull();
        } else {
            return tempResult;
        }
    }
    
    getConstantDataTypeHelper(): DataType {
        try {
            return this.operator.getConstantDataType(this.operand);
        } catch(error) {
            this.handleError(error);
            throw error;
        }
    }
}

export interface MacroIdentifierExpression extends MacroIdentifierExpressionInterface {}

export class MacroIdentifierExpression extends UnaryExpression {
    
    constructor(operand: Expression) {
        super(macroIdentifierOperator, operand);
        this.macroInvocationId = null;
    }
    
    copy(): Expression {
        var output = new MacroIdentifierExpression(this.operand.copy());
        output.macroInvocationId = this.macroInvocationId;
        return output;
    }
    
    getDisplayString(): string {
        if (this.macroInvocationId === null) {
            return super.getDisplayString();
        }
        return this.operator.text + "{" + this.macroInvocationId + "}" + this.operand.getDisplayString();
    }
    
    evaluateToIdentifierOrNull(): Identifier {
        if (!(this.operand instanceof ArgTerm)) {
            return null;
        }
        let tempName = this.operand.evaluateToIdentifierName();
        return new MacroIdentifier(tempName, this.macroInvocationId);
    }
    
    populateMacroInvocationId(macroInvocationId: number): void {
        if (this.macroInvocationId === null) {
            this.macroInvocationId = macroInvocationId;
        }
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
    
    copy(): Expression {
        return new BinaryExpression(
            this.operator,
            this.operand1.copy(),
            this.operand2.copy()
        );
    }
    
    getDisplayString(): string {
        return "(" + this.operand1.getDisplayString() + " " + this.operator.text + " " + this.operand2.getDisplayString() + ")";
    }
    
    processExpressionsHelper(processExpression: ExpressionProcessor, shouldRecurAfterProcess?: boolean): Expression {
        var tempResult = processExpression(this);
        if (tempResult !== null) {
            return tempResult;
        }
        this.operand1 = this.operand1.processExpressions(processExpression, shouldRecurAfterProcess);
        this.operand2 = this.operand2.processExpressions(processExpression, shouldRecurAfterProcess);
        return null;
    }
    
    evaluateToConstantOrNull(): Constant {
        let tempResult;
        try {
            tempResult = this.operator.createConstantOrNull(this.operand1, this.operand2);
        } catch(error) {
            this.handleError(error);
            throw error;
        }
        if (tempResult === null) {
            return super.evaluateToConstantOrNull();
        } else {
            return tempResult;
        }
    }
    
    evaluateToIdentifierOrNull(): Identifier {
        try {
            return this.operator.createIdentifierOrNull(this.operand1, this.operand2);
        } catch(error) {
            this.handleError(error);
            throw error;
        }
    }
    
    evaluateToInstructionArg(): InstructionArg {
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
        return super.evaluateToInstructionArg();
    }
    
    getConstantDataTypeHelper(): DataType {
        try {
            return this.operator.getConstantDataType(this.operand1, this.operand2);
        } catch(error) {
            this.handleError(error);
            throw error;
        }
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
    
    copy(): Expression {
        return new SubscriptExpression(
            this.sequenceExpression.copy(),
            this.indexExpression.copy(),
            this.dataTypeExpression.copy()
        );
    }
    
    getDisplayString(): string {
        return "(" + this.sequenceExpression.getDisplayString() + "[" + this.indexExpression.getDisplayString() + "]:" + this.dataTypeExpression.getDisplayString() + ")";
    }
    
    processExpressionsHelper(processExpression: ExpressionProcessor, shouldRecurAfterProcess?: boolean): Expression {
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
    
    evaluateToInstructionArg(): InstructionArg {
        return new RefInstructionArg(
            this.sequenceExpression.evaluateToInstructionRef(),
            this.dataTypeExpression.evaluateToDataType(),
            this.indexExpression.evaluateToInstructionArg()
        );
    }
    
    getConstantDataTypeHelper(): DataType {
        return this.dataTypeExpression.evaluateToDataType()
    }
}


