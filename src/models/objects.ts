
import {LineProcessor, ExpressionProcessor, LabelDefinitionClass, MixedNumber} from "models/items";
import {UnaryOperator, BinaryOperator, DataType, NumberType, InstructionType} from "models/delegates";

export interface Displayable {
    // Concrete subclasses must implement these methods:
    getDisplayString(): string;
}

export interface IndexConverter {
    // Concrete subclasses must implement these methods:
    createConstantOrNull(index: number): Constant;
    createInstructionArgOrNull(index: number): InstructionArg;
}

export interface IndexRefConverter {
    instructionRefPrefix: number;
    dataType: DataType;
}

export interface IndexDefinition {
    identifier: Identifier;
    index: number;
    indexConverter: IndexConverter;
    
    createConstantOrNull(): Constant;
    createInstructionArgOrNull(): InstructionArg;
}

export interface ArgPerm {
    access: number;
    recipient: number;
    attributeMap: {[attribute: string]: boolean};
    
    getDisplayString(): string;
}

export interface Scope {
    // Concrete subclasses must implement these methods:
    getIndexDefinitionByIdentifier(identifier: Identifier): IndexDefinition;
}

export interface Assembler extends Scope {
    rootLineList: AssemblyLine[];
    aliasDefinitionMap: IdentifierMap<AliasDefinition>;
    macroDefinitionMap: {[name: string]: MacroDefinition};
    functionDefinitionMap: IdentifierMap<FunctionDefinition>;
    appDataLineList: LabeledLineList;
    globalVariableDefinitionMap: IdentifierMap<VariableDefinition>;
    nextMacroInvocationId: number;
    nextFunctionDefinitionIndex: number;
    indexDefinitionMapList: IdentifierMap<IndexDefinition>[];
    globalFrameLength: FrameLength;
    appFileRegion: Region;
    
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
    determineIndexDefinitionMapList(): void;
    assembleInstructions(): void;
    generateAppFileRegion(): void;
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
    assembleInstruction(): Instruction;
}

export interface Constant {
    // Concrete subclasses may override these methods:
    compress(): void;
    
    // Concrete subclasses must implement these methods:
    getDataType(): DataType;
    setDataType(dataType: DataType): void;
    copy(): Constant;
    createBuffer(): Buffer;
}

export interface NumberConstant extends Constant {
    value: MixedNumber;
    numberType: NumberType;
}

export interface AliasDefinition extends Displayable {
    identifier: Identifier;
    expression: Expression;
}

export interface Expression {
    scope: Scope;
    constantDataType: DataType;
    
    processExpressions(processExpression: ExpressionProcessor, shouldRecurAfterProcess?: boolean): Expression;
    evaluateToIdentifier(): Identifier;
    evaluateToIndexDefinitionOrNull(): IndexDefinition;
    evaluateToConstant(): Constant;
    substituteIdentifiers(identifierExpressionMap: IdentifierMap<Expression>): Expression;
    getConstantDataType(): DataType;
    
    // Concrete subclasses may override these methods:
    evaluateToIdentifierOrNull(): Identifier;
    evaluateToConstantOrNull(): Constant;
    evaluateToString(): string;
    evaluateToDataType(): DataType;
    evaluateToArgPerm(): ArgPerm;
    evaluateToInstructionArg(): InstructionArg;
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

export interface FunctionDefinition extends Displayable, IndexDefinition, Scope {
    lineList: LabeledLineList;
    regionType: number;
    assembler: Assembler;
    jumpTableLineList: LabeledLineList;
    argVariableDefinitionMap: IdentifierMap<ArgVariableDefinition>;
    localVariableDefinitionMap: IdentifierMap<VariableDefinition>;
    instructionList: Instruction[];
    indexDefinitionMapList: IdentifierMap<IndexDefinition>[]
    localFrameLength: FrameLength;
    argFrameLength: FrameLength;
    
    processLines(processLine: LineProcessor): void;
    processJumpTableLines(processLine: LineProcessor): void;
    extractJumpTables(): void;
    extractVariableDefinitions(): void;
    extractLabelDefinitions(): void;
    assembleInstructions(): void;
    createRegion(): Region;
    
    // Concrete subclasses may override these methods:
    createRegionHelper(): Region[];
    
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
    getIsBuiltIn(): boolean;
}

export interface MacroIdentifier extends Identifier {
    macroInvocationId: number;
}

export interface IdentifierMap<T> {
    map: {[key: string]: T};
    keyList: string[];
    
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
}

export interface ArgVariableDefinition extends VariableDefinition {
    permList: ArgPerm[];
}

export interface LabeledLineList {
    lineList: AssemblyLine[];
    labelDefinitionMap: IdentifierMap<LabelDefinition>;
    
    processLines(processLine: LineProcessor): void;
    getLineElementIndexMap(): {[lineIndex: number]: number};
    getDisplayString(title: string, indentationLevel?: number): string;
    
    // Concrete subclasses may override these methods:
    extractLabelDefinitions(): void;
    
    // Concrete subclasses must implement these methods:
    getLabelDefinitionClass(): LabelDefinitionClass;
    getLineElementLength(line: AssemblyLine): number;
}

export interface InstructionLineList extends LabeledLineList {
    assembleInstructions(): Instruction[];
}

export interface DataLineList extends LabeledLineList {
    createBuffer(): Buffer;
    
    // Concrete subclasses must implement these methods:
    convertExpressionToConstant(expression: Expression): Constant;
}

export interface Instruction extends Displayable {
    instructionType: InstructionType;
    argList: InstructionArg[];
    
    createBuffer(): Buffer;
}

export interface InstructionRef {
    argPrefix: number;
    
    // Concrete subclasses may override these methods:
    createBuffer(dataType: DataType, indexArg: InstructionArg): Buffer;
}

export interface PointerInstructionRef extends InstructionRef {
    pointerArg: InstructionArg;
}

export interface InstructionArg {
    getDisplayString(): string;
    
    // Concrete subclasses must implement these methods:
    getDataType(): DataType;
    setDataType(dataType: DataType): void;
    createBuffer(): Buffer;
}

export interface ConstantInstructionArg extends InstructionArg {
    constant: Constant;
}

export interface RefInstructionArg extends InstructionArg {
    instructionRef: InstructionRef;
    dataType: DataType;
    indexArg: InstructionArg;
}

export interface Region {
    regionType: number;
    
    createBuffer(): Buffer;
    getDisplayString(indentationLevel?: number): string;
    
    // Concrete subclasses must implement these methods:
    getContentBuffer(): Buffer;
    getDisplayStringHelper(indentationLevel: number): string[];
}

export interface AtomicRegion extends Region {
    contentBuffer: Buffer;
}

export interface CompositeRegion extends Region {
    regionList: Region[];
}

export interface FrameLength {
    alphaLength: number;
    betaLength: number;
    
    createBuffer(): Buffer;
}


