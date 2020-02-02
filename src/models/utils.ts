
import {ExpressionProcessor, LineProcessor, NumberTypeClass, VariableDefinitionClass, ArgNumeric, MixedNumber} from "models/items";
import {Operator, DataType, NumberType} from "models/delegates";
import {Expression, AssemblyLine, Identifier, IdentifierMap, Displayable, ArgWord, ArgNumber, ArgString, VariableDefinition, ArgVariableDefinition, InstructionArg, FrameLength} from "models/objects";

export interface DataTypeUtils {
    getDataTypeByName(name: string): DataType;
    getNumberType(numberTypeClass: NumberTypeClass, byteAmount: number): NumberType;
    mergeNumberTypes(numberType1: NumberType, numberType2: NumberType): NumberType;
}

export interface ExpressionUtils {
    copyExpressions(expressionList: Expression[]): Expression[];
    processExpressions(
        expressionList: Expression[],
        processExpression: ExpressionProcessor,
        shouldRecurAfterProcess?: boolean
    ): void;
}

export interface LineUtils {
    copyLines(lineList: AssemblyLine[]): AssemblyLine[];
    processExpressionsInLines(
        lineList: AssemblyLine[],
        processExpression: ExpressionProcessor,
        shouldRecurAfterProcess?: boolean
    ): void;
    substituteIdentifiersInLines(lineList: AssemblyLine[], identifierExpressionMap: IdentifierMap<Expression>): void;
    populateMacroInvocationIdInLines(lineList: AssemblyLine[], macroInvocationId: number): void;
    getLineListDisplayString(lineList: AssemblyLine[], indentationLevel?: number): string;
    processLines(
        lineList: AssemblyLine[],
        processLine: LineProcessor,
        shouldProcessCodeBlocks?: boolean
    ): {lineList: AssemblyLine[], processCount: number};
}

export interface NiceUtils {
    getIndentation(indentationLevel: number): string;
    getDisplayableListDisplayString(
        title: string,
        displayableList: Displayable[],
        indentationLevel?: number
    ): string;
    getIdentifierMapDisplayString(
        title: string,
        identifierMap: IdentifierMap<Displayable>,
        indentationLevel?: number
    ): string;
    joinTextList(textList: string[]): string;
    getReverseMap(map: {[key: string]: any}): {[key: string]: any};
    pluralize(word: string, amount: number): string;
}

export interface ParseUtils {
    skipWhitespace(text: string, index: number): number;
    skipDirectiveCharacters(text: string, index: number): number;
    isFirstArgWordCharacter(character: string): boolean;
    isArgWordCharacter(character: string): boolean;
    isFirstArgNumericCharacter(character: string): boolean;
    isArgNumericCharacter(character: string): boolean;
    parseArgOperator(
        text: string,
        index: number,
        operatorList: Operator[]
    ): {operator: Operator, index: number};
    parseArgWord(text: string, index: number): {argWord: ArgWord, index: number};
    parseHexadecimalArgNumber(text: string): ArgNumber;
    parseArgNumeric(text: string, index: number): {argNumeric: ArgNumeric, index: number};
    parseArgString(text: string, index: number): {argString: ArgString, index: number};
    parseArgExpression(
        text: string,
        index: number,
        precedence: number
    ): {expression: Expression, index: number};
    parseLineText(text: string): AssemblyLine;
    loadAssemblyFileContent(path: string): string[];
    parseAssemblyLines(lineTextList: string[]): AssemblyLine[];
    collapseCodeBlocks(lineList: AssemblyLine[]): AssemblyLine[];
}

export interface VariableUtils {
    extractVariableDefinitionHelper(
        line: AssemblyLine,
        VariableDefinitionClass: VariableDefinitionClass
    ): VariableDefinition;
    extractGlobalVariableDefinition(line: AssemblyLine): VariableDefinition;
    extractLocalVariableDefinition(line: AssemblyLine): VariableDefinition;
    extractArgVariableDefinition(line: AssemblyLine): ArgVariableDefinition;
    populateVariableDefinitionIndexes(
        identifierMap: IdentifierMap<VariableDefinition>
    ): FrameLength;
}

export interface InstructionUtils {
    createArgBuffer(refPrefix: number, dataType: DataType, buffer: Buffer): Buffer;
    createInstructionArgWithIndex(
        refPrefix: number,
        dataType: DataType,
        index: number
    ): InstructionArg;
}

export interface MathUtils {
    convertMixedNumberToBigInt(value: MixedNumber): bigint;
    convertNumberToHexadecimal(value: number, length: number): string;
    convertBufferToHexadecimal(buffer: Buffer): string;
}

export interface DependencyUtils {
    evaluateDependencyArgs(
        argList: Expression[],
        modifiersStartIndex: number
    ): {identifier: Identifier, path: string, dependencyModifierList: number[]};
}


