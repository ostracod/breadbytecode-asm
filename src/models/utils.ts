
import {ExpressionProcessor, LineProcessor} from "models/items";
import {Operator, DataType} from "models/delegates";
import {Expression, AssemblyLine, IdentifierMap, Definition, ArgWord, ArgNumber, ArgString} from "models/objects";

export interface DataTypeUtils {
    getDataTypeByName(name: string): DataType;
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
    );
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
    getDefinitionListDisplayString(title: string, definitionList: Definition[]): string;
    joinTextList(textList: string[]): string;
}

export interface ParseUtils {
    skipWhitespace(text: string, index: number): number;
    skipDirectiveCharacters(text: string, index: number): number;
    isFirstArgWordCharacter(character: string): boolean;
    isArgWordCharacter(character: string): boolean;
    isFirstArgNumberCharacter(character: string): boolean;
    parseArgOperator(
        text: string,
        index: number,
        operatorList: Operator[]
    ): {operator: Operator, index: number};
    parseArgWord(text: string, index: number): {argWord: ArgWord, index: number};
    parseArgNumber(text: string, index: number): {argNumber: ArgNumber, index: number};
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


