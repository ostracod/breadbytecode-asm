
import {LineProcessor, ExpressionProcessor} from "models/items";
import {UnaryOperator, BinaryOperator, DataType} from "models/delegates";

export interface Definition {
    // Concrete subclasses must implement these methods:
    getDisplayString(): string;
}

export interface ArgPerm {
    access: number;
    recipient: number;
    attributeMap: {[attribute: string]: boolean};
    
    getDisplayString(): string;
}

export interface Assembler {
    rootLineList: AssemblyLine[];
    constantDefinitionMap: IdentifierMap<ConstantDefinition>;
    macroDefinitionMap: {[name: string]: MacroDefinition};
    functionDefinitionList: FunctionDefinition[];
    appDataLineList: AssemblyLine[];
    globalVariableDefinitionList: VariableDefinition[];
    nextMacroInvocationId: number;
    
    getNextMacroInvocationId(): number;
    processLines(processLine: LineProcessor): void;
    processExpressionsInLines(
        processExpression: ExpressionProcessor,
        shouldRecurAfterProcess?: boolean
    ): void;
    loadAndParseAssemblyFile(path: string): AssemblyLine[];
    getDisplayString(): string;
    extractAppDataDefinitions(lineList: AssemblyLine[]): void;
    extractConstantDefinitions(lineList: AssemblyLine[]): AssemblyLine[];
    processIncludeDirectives(lineList: AssemblyLine[]): {lineList: AssemblyLine[], includeCount: number};
    extractFunctionDefinitions(lineList: AssemblyLine[]): void;
    expandConstantInvocations(): void;
    extractMacroDefinitions(lineList: AssemblyLine[]): AssemblyLine[];
    expandMacroInvocations(lineList: AssemblyLine[]): {lineList: AssemblyLine[], expandCount: number};
    extractGlobalVariableDefinitions(): void;
    assembleCodeFile(sourcePath: string, destinationPath: string): void;
}

export interface AssemblyError {
    message: string;
    lineNumber: number;
}

export interface AssemblyLine {
    directiveName: string;
    argList: Expression[];
    lineNumber: number;
    codeBlock: AssemblyLine[];
    
    copy(): AssemblyLine;
    getDisplayString(indentationLevel: number): string;
    processExpressions(
        processExpression: ExpressionProcessor,
        shouldRecurAfterProcess?: boolean
    ): void;
}

export interface ConstantDefinition extends Definition {
    identifier: Identifier;
    expression: Expression;
}

export interface Expression {
    constantDataType: DataType;
    
    processExpressions(processExpression: ExpressionProcessor, shouldRecurAfterProcess?: boolean): Expression;
    evaluateToIdentifierOrNull(): Identifier;
    evaluateToIdentifier(): Identifier;
    evaluateToString(): string;
    evaluateToDataType(): DataType;
    evaluateToArgPerm(): ArgPerm;
    substituteIdentifiers(identifierExpressionMap: IdentifierMap<Expression>): Expression;
    populateMacroInvocationId(macroInvocationId: number): void;
    getConstantDataTypeHelper(): DataType;
    getConstantDataType(): DataType;
    
    // Concrete subclasses must implement these methods:
    copy(): Expression;
    getDisplayString(): string;
    processExpressionsHelper(processExpression: ExpressionProcessor, shouldRecurAfterProcess?: boolean): Expression;
}

export interface ArgTerm extends Expression {
    
}

export interface ArgWord extends ArgTerm {
    text: string;
}

export interface ArgNumber extends ArgTerm {
    value: number;
}

export interface ArgString extends ArgTerm {
    value: string;
}

export interface UnaryExpression extends Expression {
    operator: UnaryOperator;
    operand: Expression;
}

export interface UnaryAtExpression extends UnaryExpression {
    macroInvocationId: number;
}

export interface BinaryExpression extends Expression {
    operator: BinaryOperator;
    operand1: Expression;
    operand2: Expression;
}

export interface SubscriptExpression extends Expression {
    sequenceExpression: Expression;
    indexExpression: Expression;
    dataTypeExpression: Expression;
}

export interface FunctionDefinition extends Definition {
    identifier: Identifier;
    lineList: AssemblyLine[];
    jumpTableLineList: AssemblyLine[];
    argVariableDefinitionList: ArgVariableDefinition[];
    localVariableDefinitionList: VariableDefinition[];
    instructionLabelDefinitionList: LabelDefinition[];
    jumpTableLabelDefinitionList: LabelDefinition[];
    
    processLines(processLine: LineProcessor): void;
    processJumpTableLines(processLine: LineProcessor): void;
    extractJumpTables(): void;
    extractInstructionLabelDefinitions(): void;
    extractJumpTableLabelDefinitions(): void;
    extractVariableDefinitions(): void;
    
    // Concrete subclasses must implement these methods:
    getTitle(): string;
}

export interface InterfaceFunctionDefinition extends FunctionDefinition {
    dependencyIndexExpression: Expression;
    
    // Concrete subclasses must implement these methods:
    getTitlePrefix(): string;
}

export interface Identifier {
    name: string;
    macroInvocationId: number;
    
    getDisplayString(): string;
    getMapKey(): string;
}

export interface IdentifierMap<T> {
    map: {[key: string]: T};
    
    get(identifier: Identifier): T;
    set(identifier: Identifier, value: T): void;
    iterate(handle: (value: T) => void): void;
}

export interface LabelDefinition extends Definition {
    identifier: Identifier;
    index: number;
}

export interface MacroDefinition extends Definition {
    name: string;
    argIdentifierList: Identifier[];
    lineList: AssemblyLine[];
    
    invoke(argList: Expression[], macroInvocationId: number): AssemblyLine[];
}

export interface VariableDefinition extends Definition {
    identifier: Identifier;
    dataType: DataType;
}

export interface ArgVariableDefinition extends VariableDefinition {
    permList: ArgPerm[];
}


