
import {LineProcessor, ExpressionProcessor, LabelDefinitionClass} from "models/items";
import {UnaryOperator, BinaryOperator, DataType, NumberType, InstructionType} from "models/delegates";

export interface Displayable {
    // Concrete subclasses must implement these methods:
    getDisplayString(): string;
}

export interface IndexDefinition {
    identifier: Identifier;
    index: number;
    
    // Concrete subclasses may override these methods:
    createInstructionArg(): Buffer;
}

export interface ArgPerm {
    access: number;
    recipient: number;
    attributeMap: {[attribute: string]: boolean};
    
    getDisplayString(): string;
}

export interface Assembler {
    rootLineList: AssemblyLine[];
    aliasDefinitionMap: IdentifierMap<AliasDefinition>;
    macroDefinitionMap: {[name: string]: MacroDefinition};
    functionDefinitionList: FunctionDefinition[];
    appDataLineList: LabeledLineList;
    globalVariableDefinitionMap: IdentifierMap<VariableDefinition>;
    nextMacroInvocationId: number;
    indexDefinitionMapList: IdentifierMap<IndexDefinition>[];
    
    processLines(processLine: LineProcessor): void;
    processExpressionsInLines(
        processExpression: ExpressionProcessor,
        shouldRecurAfterProcess?: boolean
    ): void;
    loadAndParseAssemblyFile(path: string): AssemblyLine[];
    getDisplayString(): string;
    assembleCodeFile(sourcePath: string, destinationPath: string): void;
    extractMacroDefinitions(lineList: AssemblyLine[]): AssemblyLine[];
    getNextMacroInvocationId(): number;
    expandMacroInvocations(lineList: AssemblyLine[]): {lineList: AssemblyLine[], expandCount: number};
    processIncludeDirectives(lineList: AssemblyLine[]): {lineList: AssemblyLine[], includeCount: number};
    extractAliasDefinitions(lineList: AssemblyLine[]): AssemblyLine[];
    expandAliasInvocations(): void;
    addFunctionDefinition(functionDefinition: FunctionDefinition): void;
    extractFunctionDefinitions(): void;
    extractAppDataDefinitions(): void;
    extractGlobalVariableDefinitions(): void;
    getIndexDefinitionByIdentifier(identifier: Identifier): IndexDefinition;
    determineIndexDefinitionMapList(): void;
    assembleInstructions(): void;
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
    assembleInstruction(functionDefinition: FunctionDefinition): Instruction;
}

export interface NumberConstant {
    value: Number;
    dataType: NumberType;
    
    copy(): NumberConstant;
    getBuffer(): Buffer;
    compress(): void;
    createInstructionArg(): Buffer;
}

export interface AliasDefinition extends Displayable {
    identifier: Identifier;
    expression: Expression;
}

export interface Expression {
    functionDefinition: FunctionDefinition;
    constantDataType: DataType;
    
    processExpressions(processExpression: ExpressionProcessor, shouldRecurAfterProcess?: boolean): Expression;
    evaluateToIdentifier(): Identifier;
    substituteIdentifiers(identifierExpressionMap: IdentifierMap<Expression>): Expression;
    getConstantDataType(): DataType;
    
    // Concrete subclasses may override these methods:
    evaluateToIdentifierOrNull(): Identifier;
    evaluateToNumberConstantOrNull(): NumberConstant;
    evaluateToString(): string;
    evaluateToDataType(): DataType;
    evaluateToArgPerm(): ArgPerm;
    evaluateToInstructionArg(): Buffer;
    evaluateToInstructionRef(): InstructionRef;
    populateMacroInvocationId(macroInvocationId: number): void;
    getConstantDataTypeHelper(): DataType;
    
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
    constant: NumberConstant;
}

export interface ArgVersionNumber extends ArgTerm {
    majorNumber: number;
    minorNumber: number;
    patchNumber: number;
}

export interface ArgString extends ArgTerm {
    value: string;
}

export interface UnaryExpression extends Expression {
    operator: UnaryOperator;
    operand: Expression;
}

export interface MacroIdentifierExpression extends UnaryExpression {
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

export interface FunctionDefinition extends Displayable, IndexDefinition {
    lineList: LabeledLineList;
    assembler: Assembler;
    jumpTableLineList: LabeledLineList;
    argVariableDefinitionMap: IdentifierMap<ArgVariableDefinition>;
    localVariableDefinitionMap: IdentifierMap<VariableDefinition>;
    instructionList: Instruction[];
    indexDefinitionMapList: IdentifierMap<IndexDefinition>[]
    
    processLines(processLine: LineProcessor): void;
    processJumpTableLines(processLine: LineProcessor): void;
    extractJumpTables(): void;
    extractVariableDefinitions(): void;
    extractLabelDefinitions(): void;
    getIndexDefinitionByIdentifier(identifier: Identifier): IndexDefinition;
    assembleInstructions(): void;
    
    // Concrete subclasses must implement these methods:
    getTitle(): string;
}

export interface InterfaceFunctionDefinition extends FunctionDefinition {
    interfaceIndexExpression: Expression;
    
    // Concrete subclasses may override these methods:
    getTitleSuffix(): string;
    
    // Concrete subclasses must implement these methods:
    getTitlePrefix(): string;
}

export interface PublicFunctionDefinition extends InterfaceFunctionDefinition {
    arbiterIndexExpression: Expression;
}

export interface Identifier {
    name: string;
    
    getDisplayString(): string;
    getMapKey(): string;
}

export interface MacroIdentifier extends Identifier {
    macroInvocationId: number;
}

export interface IdentifierMap<T> {
    map: {[key: string]: T};
    
    get(identifier: Identifier): T;
    set(identifier: Identifier, value: T): void;
    setIndexDefinition(indexDefinition: IndexDefinition): void;
    iterate(handle: (value: T) => void): void;
    getValueList(): T[];
}

export interface LabelDefinition extends Displayable, IndexDefinition {
    lineIndex: number;
}

export interface MacroDefinition extends Displayable {
    name: string;
    argIdentifierList: Identifier[];
    lineList: AssemblyLine[];
    
    invoke(argList: Expression[], macroInvocationId: number): AssemblyLine[];
}

export interface VariableDefinition extends Displayable, IndexDefinition {
    dataType: DataType;
    instructionRefPrefix: number;
}

export interface ArgVariableDefinition extends VariableDefinition {
    permList: ArgPerm[];
}

export interface LabeledLineList {
    lineList: AssemblyLine[];
    labelDefinitionMap: IdentifierMap<LabelDefinition>;
    
    processLines(processLine: LineProcessor): void;
    getLineElementIndexMap(): {[lineIndex: number]: number};
    extractLabelDefinitions(): void;
    getDisplayString(title: string, indentationLevel?: number): string;
    
    // Concrete subclasses may override these methods:
    getLabelDefinitionClass(): LabelDefinitionClass;
    
    // Concrete subclasses must implement these methods:
    getLineElementLength(line: AssemblyLine): number;
}

export interface Instruction extends Displayable {
    instructionType: InstructionType;
    argList: Buffer[]
}

export interface InstructionRef {
    argPrefix: number;
    
    // Concrete subclasses may override these methods:
    createInstructionArg(indexArg: Buffer, dataType: DataType): Buffer;
}

export interface PointerInstructionRef extends InstructionRef {
    pointerArg: Buffer;
}


