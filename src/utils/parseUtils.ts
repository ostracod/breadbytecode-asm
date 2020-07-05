
import * as fs from "fs";

import {ArgNumeric} from "models/items";
import {ParseUtils as ParseUtilsInterface} from "models/utils";
import {Operator, UnaryOperator, BinaryOperator} from "models/delegates";
import {Expression} from "models/objects";

import {AssemblyError} from "objects/assemblyError";
import {AssemblyLine} from "objects/assemblyLine";
import {SubscriptExpression, ArgWord, ArgNumber, ArgVersionNumber, ArgString} from "objects/expression";
import {NumberConstant} from "objects/constant";
import {VersionNumber} from "objects/versionNumber";

import {unaryOperatorList, binaryOperatorList} from "delegates/operator";
import {signedInteger64Type, float64Type, signedIntegerTypeList} from "delegates/dataType";

const codeBlockDirectiveNameSet = ["PRIV_FUNC", "PUB_FUNC", "GUARD_FUNC", "IFACE_FUNC", "JMP_TABLE", "APP_DATA", "MACRO"];

export interface ParseUtils extends ParseUtilsInterface {}

export class ParseUtils {
    
    skipWhitespace(text: string, index: number): number {
        while (index < text.length) {
            let tempCharacter = text.charAt(index);
            if (tempCharacter !== " " && tempCharacter !== "\t") {
                break
            }
            index += 1;
        }
        return index;
    }
    
    skipDirectiveCharacters(text: string, index: number): number {
        while (index < text.length) {
            let tempCharacter = text.charAt(index);
            if (tempCharacter === " " || tempCharacter === "\t" || tempCharacter === "#") {
                break;
            }
            index += 1;
        }
        return index;
    }
    
    isFirstArgWordCharacter(character: string): boolean {
        if (character === "_") {
            return true;
        }
        let tempCharCode = character.charCodeAt(0);
        // Uppercase letters or lowercase letters.
        return ((tempCharCode >= 65 && tempCharCode <= 90)
            || (tempCharCode >= 97 && tempCharCode <= 122));
    }
    
    isArgWordCharacter(character: string): boolean {
        if (parseUtils.isFirstArgWordCharacter(character)) {
            return true;
        }
        let tempCharCode = character.charCodeAt(0);
        // Digits.
        return (tempCharCode >= 48 && tempCharCode <= 57);
    }
    
    isFirstArgNumericCharacter(character: string): boolean {
        if (character === ".") {
            return true;
        }
        let tempCharCode = character.charCodeAt(0);
        // Hexadecimal digits.
        return ((tempCharCode >= 48 && tempCharCode <= 57)
            || (tempCharCode >= 65 && tempCharCode <= 70)
            || (tempCharCode >= 97 && tempCharCode <= 102));
    }
    
    isArgNumericCharacter(character: string): boolean {
        if (parseUtils.isFirstArgNumericCharacter(character)) {
            return true;
        }
        return (character === "x");
    }
    
    parseArgOperator(
        text: string,
        index: number,
        operatorList: Operator[]
    ): {operator: Operator, index: number} {
        for (let operator of operatorList) {
            let tempOperatorText = operator.text;
            let tempEndIndex = index + tempOperatorText.length;
            if (tempEndIndex > text.length) {
                continue;
            }
            let tempText = text.substring(index, tempEndIndex);
            if (tempText === tempOperatorText) {
                return {operator: operator, index: tempEndIndex};
            }
        }
        return {operator: null, index: index};
    }
    
    parseArgWord(text: string, index: number): {argWord: ArgWord, index: number} {
        let tempStartIndex = index;
        while (index < text.length) {
            let tempCharacter = text.charAt(index);
            if (!parseUtils.isArgWordCharacter(tempCharacter)) {
                break;
            }
            index += 1;
        }
        let tempEndIndex = index;
        let tempText = text.substring(tempStartIndex, tempEndIndex);
        return {
            argWord: new ArgWord(tempText),
            index: index
        };
    }
    
    // text contains only hexadecimal digits.
    parseHexadecimalArgNumber(text: string): ArgNumber {
        let tempByteAmount = Math.ceil(text.length / 2);
        for (let integerType of signedIntegerTypeList) {
            if (integerType.byteAmount >= tempByteAmount) {
                let tempConstant = new NumberConstant(parseInt(text, 16), integerType);
                return new ArgNumber(tempConstant);
            }
        }
        throw new AssemblyError("Hexadecimal literal has too many digits.");
    }
    
    parseArgNumeric(text: string, index: number): {argNumeric: ArgNumeric, index: number} {
        let tempStartIndex = index;
        while (index < text.length) {
            let tempCharacter = text.charAt(index);
            if (!parseUtils.isArgNumericCharacter(tempCharacter)) {
                break;
            }
            index += 1;
        }
        let tempEndIndex = index;
        let tempText = text.substring(tempStartIndex, tempEndIndex);
        let tempComponentList = tempText.split(".");
        let tempArgNumeric;
        if (tempComponentList.length === 1) {
            if (tempText.length > 2 && tempText.substring(0, 2) === "0x") {
                tempArgNumeric = parseUtils.parseHexadecimalArgNumber(
                    tempText.substring(2, tempText.length)
                );
            } else {
                let tempConstant = new NumberConstant(
                    parseInt(tempComponentList[0]),
                    signedInteger64Type
                );
                tempArgNumeric = new ArgNumber(tempConstant);
            }
        } else if (tempComponentList.length === 2) {
            let tempConstant = new NumberConstant(parseFloat(tempText), float64Type);
            tempArgNumeric = new ArgNumber(tempConstant);
        } else if (tempComponentList.length === 3) {
            let tempVersionNumber = new VersionNumber(
                parseInt(tempComponentList[0]),
                parseInt(tempComponentList[1]),
                parseInt(tempComponentList[2])
            );
            tempArgNumeric = new ArgVersionNumber(tempVersionNumber);
        } else {
            throw new AssemblyError("Malformed numeric argument.");
        }
        return {argNumeric: tempArgNumeric, index: index};
    }
    
    parseArgString(text: string, index: number): {argString: ArgString, index: number} {
        let tempCharacter = text.charAt(index);
        if (tempCharacter !== "\"") {
            throw new AssemblyError("Expected quotation mark.");
        }
        index += 1;
        let tempText = "";
        let tempIsEscaped = false;
        while (true) {
            if (index >= text.length) {
                throw new AssemblyError("Expected quotation mark.");
            }
            let tempCharacter = text.charAt(index);
            index += 1;
            if (tempIsEscaped) {
                if (tempCharacter === "n") {
                    tempText += "\n";
                } else {
                    tempText += tempCharacter;
                }
                tempIsEscaped = false;
            } else {
                if (tempCharacter === "\"") {
                    break;
                } else if (tempCharacter === "\\") {
                    tempIsEscaped = true;
                } else {
                    tempText += tempCharacter;
                }
            }
        }
        return {
            argString: new ArgString(tempText),
            index: index
        };
    }
    
    parseArgExpression(
        text: string,
        index: number,
        precedence: number
    ): {expression: Expression, index: number} {
        index = parseUtils.skipWhitespace(text, index);
        if (index >= text.length) {
            throw new AssemblyError("Expected expression.");
        }
        let outputExpression;
        // Look for unary operator.
        let tempOperatorResult = parseUtils.parseArgOperator(text, index, unaryOperatorList);
        let tempUnaryOperator = tempOperatorResult.operator as UnaryOperator;
        if (tempUnaryOperator === null) {
            let tempCharacter = text.charAt(index);
            if (parseUtils.isFirstArgWordCharacter(tempCharacter)) {
                // Parse keyword or identifier.
                let tempResult1 = parseUtils.parseArgWord(text, index);
                index = tempResult1.index;
                outputExpression = tempResult1.argWord;
            } else if (parseUtils.isFirstArgNumericCharacter(tempCharacter)) {
                // Parse number literal or version number.
                let tempResult2 = parseUtils.parseArgNumeric(text, index);
                index = tempResult2.index;
                outputExpression = tempResult2.argNumeric;
            } else if (tempCharacter === "\"") {
                // Parse string literal.
                let tempResult3 = parseUtils.parseArgString(text, index);
                index = tempResult3.index;
                outputExpression = tempResult3.argString;
            } else if (tempCharacter === "(") {
                // Parse expression in parentheses.
                index += 1;
                let tempResult4 = parseUtils.parseArgExpression(text, index, 99);
                outputExpression = tempResult4.expression;
                index = tempResult4.index;
                index = parseUtils.skipWhitespace(text, index);
                if (index >= text.length) {
                    throw new AssemblyError("Expected closing parenthesis.");
                }
                let tempCharacter = text.charAt(index);
                if (tempCharacter !== ")") {
                    throw new AssemblyError("Expected closing parenthesis.");
                }
                index += 1;
            } else {
                throw new AssemblyError("Unexpected symbol.");
            }
        } else {
            index = tempOperatorResult.index;
            // Create a unary expression.
            let tempExpressionResult = parseUtils.parseArgExpression(text, index, 0);
            let tempExpression = tempExpressionResult.expression;
            outputExpression = tempUnaryOperator.createExpression(tempExpression);
            index = tempExpressionResult.index;
        }
        // Keep parsing binary and ternary expressions until
        // we meet input precedence or reach the end.
        while (true) {
            index = parseUtils.skipWhitespace(text, index);
            if (index >= text.length) {
                break;
            }
            let tempCharacter = text.charAt(index);
            if (tempCharacter === "[") {
                if (precedence <= 2) {
                    break;
                }
                // Create a subscript expression.
                index += 1;
                let tempExpressionResult = parseUtils.parseArgExpression(text, index, 99);
                let tempIndexExpression = tempExpressionResult.expression;
                index = tempExpressionResult.index;
                index = parseUtils.skipWhitespace(text, index);
                if (index >= text.length - 1) {
                    throw new AssemblyError("Expected subscript data type.");
                }
                let tempText = text.substring(index, index + 2);
                if (tempText !== "]:") {
                    throw new AssemblyError("Expected subscript data type.");
                }
                index += 2;
                tempExpressionResult = parseUtils.parseArgExpression(text, index, 1);
                let tempDataTypeExpression = tempExpressionResult.expression;
                index = tempExpressionResult.index;
                outputExpression = new SubscriptExpression(
                    outputExpression,
                    tempIndexExpression,
                    tempDataTypeExpression
                );
                continue;
            }
            // Look for binary operator.
            let tempOperatorResult = parseUtils.parseArgOperator(text, index, binaryOperatorList);
            let tempBinaryOperator = tempOperatorResult.operator as BinaryOperator;
            if (tempBinaryOperator === null) {
                break;
            }
            if (tempBinaryOperator.precedence >= precedence) {
                break;
            }
            index = tempOperatorResult.index;
            // Create a binary expression.
            let tempExpressionResult = parseUtils.parseArgExpression(text, index, tempBinaryOperator.precedence);
            let tempExpression = tempExpressionResult.expression;
            outputExpression = tempBinaryOperator.createExpression(
                outputExpression,
                tempExpression
            );
            index = tempExpressionResult.index;
        }
        return {expression: outputExpression, index: index};
    }
    
    parseLineText(text: string): AssemblyLine {
        
        let index = 0;
        
        // Parse the directive name.
        index = parseUtils.skipWhitespace(text, index);
        let tempStartIndex = index;
        index = parseUtils.skipDirectiveCharacters(text, index);
        let tempEndIndex = index;
        if (tempStartIndex === tempEndIndex) {
            return null;
        }
        let tempDirectiveName = text.substring(tempStartIndex, tempEndIndex);
        
        // Parse the argument list.
        let tempArgList = [];
        while (true) {
            index = parseUtils.skipWhitespace(text, index);
            // Handle empty argument list.
            if (tempArgList.length === 0) {
                if (index >= text.length) {
                    break;
                }
                let tempCharacter = text.charAt(index);
                if (tempCharacter === "#") {
                    break;
                }
            }
            // Extract the argument.
            let tempResult = parseUtils.parseArgExpression(text, index, 99);
            index = tempResult.index;
            tempArgList.push(tempResult.expression);
            index = parseUtils.skipWhitespace(text, index);
            if (index >= text.length) {
                break;
            }
            // Seek the next argument if it exists.
            let tempCharacter = text.charAt(index);
            if (tempCharacter === "#") {
                break;
            }
            if (tempCharacter !== ",") {
                throw new AssemblyError("Expected comma.");
            }
            index += 1;
        }
        return new AssemblyLine(tempDirectiveName, tempArgList);
    }
    
    loadAssemblyFileContent(path: string): string[] {
        if (!fs.existsSync(path)) {
            throw new AssemblyError(`Missing source file "${path}".`);
        }
        let tempContent = fs.readFileSync(path, "utf8");
        return tempContent.split("\n");
    }
    
    parseAssemblyLines(lineTextList: string[]): AssemblyLine[] {
        let output = [];
        for (let index = 0; index < lineTextList.length; index++) {
            let tempText = lineTextList[index];
            let tempLineNumber = index + 1;
            let tempLine;
            try {
                tempLine = parseUtils.parseLineText(tempText);
            } catch(error) {
                if (error instanceof AssemblyError) {
                    error.lineNumber = tempLineNumber;
                }
                throw error;
            }
            if (tempLine === null) {
                continue;
            }
            tempLine.lineNumber = tempLineNumber;
            output.push(tempLine);
        }
        return output;
    }
    
    collapseCodeBlocks(lineList: AssemblyLine[]): AssemblyLine[] {
        let output = [];
        // List of assembly lines which begin code blocks.
        let branchList = [];
        for (let line of lineList) {
            let tempDirectiveName = line.directiveName;
            if (tempDirectiveName === "END") {
                if (line.argList.length !== 0) {
                    throw new AssemblyError("Expected 0 arguments.", line.lineNumber);
                }
                if (branchList.length <= 0) {
                    throw new AssemblyError("Unexpected END statement.", line.lineNumber);
                }
                branchList.pop();
            } else {
                if (branchList.length > 0) {
                    let tempCurrentBranch = branchList[branchList.length - 1];
                    tempCurrentBranch.codeBlock.push(line);
                } else {
                    output.push(line);
                }
                if (codeBlockDirectiveNameSet.indexOf(tempDirectiveName) >= 0) {
                    line.codeBlock = [];
                    branchList.push(line);
                }
            }
        }
        if (branchList.length > 0) {
            throw new AssemblyError("Missing END statement.");
        }
        return output;
    }
}

export const parseUtils = new ParseUtils();


