
import {ExpressionProcessor, LineProcessor, NumberTypeClass, ArgNumeric} from "models/items";
import {Operator, DataType, NumberType} from "models/delegates";
import {Expression, AssemblyLine, IdentifierMap, Definition, ArgWord, ArgNumber, ArgString} from "models/objects";

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
    getIndentation(indentationLevel: number): string;
    getLineListDisplayString(lineList: AssemblyLine[], indentationLevel?: number): string;
    processLines(
        lineList: AssemblyLine[],
        processLine: LineProcessor,
        shouldProcessCodeBlocks?: boolean
    ): {lineList: AssemblyLine[], processCount: number};
}

export interface NiceUtils {
    getDefinitionListDisplayString(
        title: string,
        definitionList: Definition[],
        indentationLevel?: number
    ): string;
    joinTextList(textList: string[]): string;
    getReverseMap(map: {[key: string]: any}): {[key: string]: any};
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


