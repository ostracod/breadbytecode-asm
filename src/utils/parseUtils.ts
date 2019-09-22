
import {ParseUtils as ParseUtilsInterface} from "models/utils";
import {Operator, UnaryOperator, BinaryOperator} from "models/delegates";
import {Expression} from "models/objects";

export interface ParseUtils extends ParseUtilsInterface {}

export class ParseUtils {
    
}

export var parseUtils = new ParseUtils();

var fs = require("fs");

import {AssemblyError} from "objects/assemblyError";
import {AssemblyLine} from "objects/assemblyLine";
import {SubscriptExpression, ArgWord, ArgNumber, ArgString} from "objects/expression";
import {unaryOperatorList, binaryOperatorList} from "delegates/operator";

var codeBlockDirectiveNameSet = ["PRIVATE_FUNC", "PUBLIC_FUNC", "GUARD_FUNC", "JMP_TABLE", "APP_DATA", "MACRO"];

ParseUtils.prototype.skipWhitespace = function(text: string, index: number): number {
    while (index < text.length) {
        var tempCharacter = text.charAt(index);
        if (tempCharacter != " " && tempCharacter != "\t") {
            break
        }
        index += 1;
    }
    return index;
}

ParseUtils.prototype.skipDirectiveCharacters = function(text: string, index: number): number {
    while (index < text.length) {
        var tempCharacter = text.charAt(index);
        if (tempCharacter == " " || tempCharacter == "\t" || tempCharacter == "#") {
            break;
        }
        index += 1;
    }
    return index;
}

ParseUtils.prototype.isFirstArgWordCharacter = function(character: string): boolean {
    if (character == "_") {
        return true;
    }
    var tempCharCode = character.charCodeAt(0);
    // Uppercase letters or lowercase letters.
    return ((tempCharCode >= 65 && tempCharCode <= 90)
        || (tempCharCode >= 97 && tempCharCode <= 122));
}

ParseUtils.prototype.isArgWordCharacter = function(character: string): boolean {
    if (character == "_") {
        return true;
    }
    var tempCharCode = character.charCodeAt(0);
    // Uppercase letters, lowercase letters, or digits.
    return ((tempCharCode >= 65 && tempCharCode <= 90)
        || (tempCharCode >= 97 && tempCharCode <= 122)
        || (tempCharCode >= 48 && tempCharCode <= 57));
}

ParseUtils.prototype.isFirstArgNumberCharacter = function(character: string): boolean {
    var tempCharCode = character.charCodeAt(0);
    // Digits.
    return (tempCharCode >= 48 && tempCharCode <= 57);
}

ParseUtils.prototype.parseArgOperator = function(
    text: string,
    index: number,
    operatorList: Operator[]
): {operator: Operator, index: number} {
    var tempIndex = 0;
    while (tempIndex < operatorList.length) {
        var tempOperator = operatorList[tempIndex];
        var tempOperatorText = tempOperator.text;
        tempIndex += 1;
        var tempEndIndex = index + tempOperatorText.length;
        if (tempEndIndex > text.length) {
            continue;
        }
        var tempText = text.substring(index, tempEndIndex);
        if (tempText == tempOperatorText) {
            return {operator: tempOperator, index: tempEndIndex};
        }
    }
    return {operator: null, index: index};
}

ParseUtils.prototype.parseArgWord = function(text: string, index: number): {argWord: ArgWord, index: number} {
    var tempStartIndex = index;
    while (index < text.length) {
        var tempCharacter = text.charAt(index);
        if (!parseUtils.isArgWordCharacter(tempCharacter)) {
            break;
        }
        index += 1;
    }
    var tempEndIndex = index;
    var tempText = text.substring(tempStartIndex, tempEndIndex);
    return {
        argWord: new ArgWord(tempText),
        index: index
    };
}

ParseUtils.prototype.parseArgNumber = function(text: string, index: number): {argNumber: ArgNumber, index: number} {
    // TODO: Support hexadecimal numbers, floats, and version numbers.
    var tempStartIndex = index;
    while (index < text.length) {
        var tempCharCode = text.charCodeAt(index);
        // Digits.
        if (!(tempCharCode >= 48 && tempCharCode <= 57)) {
            break;
        }
        index += 1;
    }
    var tempEndIndex = index;
    var tempText = text.substring(tempStartIndex, tempEndIndex);
    var tempValue = parseInt(tempText);
    return {
        argNumber: new ArgNumber(tempValue),
        index: index
    };
}

ParseUtils.prototype.parseArgString = function(text: string, index: number): {argString: ArgString, index: number} {
    var tempCharacter = text.charAt(index);
    if (tempCharacter != "\"") {
        throw new AssemblyError("Expected quotation mark.");
    }
    index += 1;
    var tempText = "";
    var tempIsEscaped = false;
    while (true) {
        if (index >= text.length) {
            throw new AssemblyError("Expected quotation mark.");
        }
        var tempCharacter = text.charAt(index);
        index += 1;
        if (tempIsEscaped) {
            if (tempCharacter == "n") {
                tempText += "\n";
            } else {
                tempText += tempCharacter;
            }
            tempIsEscaped = false;
        } else {
            if (tempCharacter == "\"") {
                break;
            } else if (tempCharacter == "\\") {
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

ParseUtils.prototype.parseArgExpression = function(
    text: string,
    index: number,
    precedence: number
): {expression: Expression, index: number} {
    index = parseUtils.skipWhitespace(text, index);
    if (index >= text.length) {
        throw new AssemblyError("Expected expression.");
    }
    var outputExpression;
    // Look for unary operator.
    var tempOperatorResult = parseUtils.parseArgOperator(text, index, unaryOperatorList);
    var tempUnaryOperator = tempOperatorResult.operator as UnaryOperator;
    if (tempUnaryOperator === null) {
        var tempCharacter = text.charAt(index);
        if (parseUtils.isFirstArgWordCharacter(tempCharacter)) {
            // Parse keyword or identifier.
            var tempResult1 = parseUtils.parseArgWord(text, index);
            index = tempResult1.index;
            outputExpression = tempResult1.argWord;
        } else if (parseUtils.isFirstArgNumberCharacter(tempCharacter)) {
            // Parse number literal.
            var tempResult2 = parseUtils.parseArgNumber(text, index);
            index = tempResult2.index;
            outputExpression = tempResult2.argNumber;
        } else if (tempCharacter == "\"") {
            // Parse string literal.
            var tempResult3 = parseUtils.parseArgString(text, index);
            index = tempResult3.index;
            outputExpression = tempResult3.argString;
        } else if (tempCharacter == "(") {
            // Parse expression in parentheses.
            index += 1;
            var tempResult4 = parseUtils.parseArgExpression(text, index, 99);
            outputExpression = tempResult4.expression;
            index = tempResult4.index;
            index = parseUtils.skipWhitespace(text, index);
            if (index >= text.length) {
                throw new AssemblyError("Expected closing parenthesis.");
            }
            var tempCharacter = text.charAt(index);
            if (tempCharacter != ")") {
                throw new AssemblyError("Expected closing parenthesis.");
            }
            index += 1;
        } else {
            throw new AssemblyError("Unexpected symbol.");
        }
    } else {
        index = tempOperatorResult.index;
        // Create a unary expression.
        var tempExpressionResult = parseUtils.parseArgExpression(text, index, 0);
        var tempExpression = tempExpressionResult.expression;
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
        var tempCharacter = text.charAt(index);
        if (tempCharacter == "[") {
            if (precedence <= 2) {
                break;
            }
            // Create a subscript expression.
            index += 1;
            var tempExpressionResult = parseUtils.parseArgExpression(text, index, 99);
            var tempIndexExpression = tempExpressionResult.expression;
            index = tempExpressionResult.index;
            index = parseUtils.skipWhitespace(text, index);
            if (index >= text.length - 1) {
                throw new AssemblyError("Expected subscript data type.");
            }
            var tempText = text.substring(index, index + 2);
            if (tempText != "]:") {
                throw new AssemblyError("Expected subscript data type.");
            }
            index += 2;
            var tempExpressionResult = parseUtils.parseArgExpression(text, index, 1);
            var tempDataTypeExpression = tempExpressionResult.expression;
            index = tempExpressionResult.index;
            outputExpression = new SubscriptExpression(
                outputExpression,
                tempIndexExpression,
                tempDataTypeExpression
            );
            continue;
        }
        // Look for binary operator.
        var tempOperatorResult = parseUtils.parseArgOperator(text, index, binaryOperatorList);
        var tempBinaryOperator = tempOperatorResult.operator as BinaryOperator;
        if (tempBinaryOperator === null) {
            break;
        }
        if (tempBinaryOperator.precedence >= precedence) {
            break;
        }
        index = tempOperatorResult.index;
        // Create a binary expression.
        var tempExpressionResult = parseUtils.parseArgExpression(text, index, tempBinaryOperator.precedence);
        var tempExpression = tempExpressionResult.expression;
        outputExpression = tempBinaryOperator.createExpression(
            outputExpression,
            tempExpression
        );
        index = tempExpressionResult.index;
    }
    return {expression: outputExpression, index: index};
}

ParseUtils.prototype.parseLineText = function(text: string): AssemblyLine {
    
    var index = 0;
    
    // Parse the directive name.
    index = parseUtils.skipWhitespace(text, index);
    var tempStartIndex = index;
    index = parseUtils.skipDirectiveCharacters(text, index);
    var tempEndIndex = index;
    if (tempStartIndex == tempEndIndex) {
        return null;
    }
    var tempDirectiveName = text.substring(tempStartIndex, tempEndIndex);
    
    // Parse the argument list.
    var tempArgList = [];
    while (true) {
        index = parseUtils.skipWhitespace(text, index);
        // Handle empty argument list.
        if (tempArgList.length == 0) {
            if (index >= text.length) {
                break;
            }
            var tempCharacter = text.charAt(index);
            if (tempCharacter == "#") {
                break;
            }
        }
        // Extract the argument.
        var tempResult = parseUtils.parseArgExpression(text, index, 99);
        index = tempResult.index;
        tempArgList.push(tempResult.expression);
        index = parseUtils.skipWhitespace(text, index);
        if (index >= text.length) {
            break;
        }
        // Seek the next argument if it exists.
        var tempCharacter = text.charAt(index);
        if (tempCharacter == "#") {
            break;
        }
        if (tempCharacter != ",") {
            throw new AssemblyError("Expected comma.");
        }
        index += 1;
    }
    return new AssemblyLine(tempDirectiveName, tempArgList);
}

ParseUtils.prototype.loadAssemblyFileContent = function(path: string): string[] {
    if (!fs.existsSync(path)) {
        throw new AssemblyError("Missing source file \"" + path + "\".");
    }
    var tempContent = fs.readFileSync(path, "utf8");
    return tempContent.split("\n");
}

ParseUtils.prototype.parseAssemblyLines = function(lineTextList: string[]): AssemblyLine[] {
    var output = [];
    var index = 0;
    while (index < lineTextList.length) {
        var tempText = lineTextList[index];
        var tempLineNumber = index + 1;
        index += 1;
        var tempLine;
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

ParseUtils.prototype.collapseCodeBlocks = function(lineList: AssemblyLine[]): AssemblyLine[] {
    var output = [];
    // List of assembly lines which begin code blocks.
    var branchList = [];
    var index = 0;
    while (index < lineList.length) {
        var tempLine = lineList[index];
        var tempDirectiveName = tempLine.directiveName;
        if (tempDirectiveName == "END") {
            if (tempLine.argList.length != 0) {
                throw new AssemblyError("Expected 0 arguments.", tempLine.lineNumber);
            }
            if (branchList.length <= 0) {
                throw new AssemblyError("Unexpected END statement.", tempLine.lineNumber);
            }
            branchList.pop();
        } else {
            if (branchList.length > 0) {
                var tempCurrentBranch = branchList[branchList.length - 1];
                tempCurrentBranch.codeBlock.push(tempLine);
            } else {
                output.push(tempLine);
            }
            if (codeBlockDirectiveNameSet.indexOf(tempDirectiveName) >= 0) {
                tempLine.codeBlock = [];
                branchList.push(tempLine);
            }
        }
        index += 1;
    }
    if (branchList.length > 0) {
        throw new AssemblyError("Missing END statement.");
    }
    return output;
}


