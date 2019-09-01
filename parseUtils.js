
function ParseUtils() {
    
}

var parseUtils = new ParseUtils();

module.exports = {
    parseUtils: parseUtils
};

var fs = require("fs");

var AssemblyError = require("./assemblyError").AssemblyError;
var AssemblyLine = require("./assemblyLine").AssemblyLine;

var tempResource = require("./expression");
var SubscriptExpression = tempResource.SubscriptExpression;
var ArgWord = tempResource.ArgWord;
var ArgNumber = tempResource.ArgNumber;
var ArgString = tempResource.ArgString;

var tempResource = require("./operator");
var unaryOperatorList = tempResource.unaryOperatorList;
var binaryOperatorList = tempResource.binaryOperatorList;

var codeBlockDirectiveNameSet = ["PRIVATE_FUNC", "PUBLIC_FUNC", "GUARD_FUNC", "JMP_TABLE", "APP_DATA", "MACRO"];

ParseUtils.prototype.skipWhitespace = function(text, index) {
    while (index < text.length) {
        var tempCharacter = text.charAt(index);
        if (tempCharacter != " " && tempCharacter != "\t") {
            break
        }
        index += 1;
    }
    return index;
}

ParseUtils.prototype.skipDirectiveCharacters = function(text, index) {
    while (index < text.length) {
        var tempCharacter = text.charAt(index);
        if (tempCharacter == " " || tempCharacter == "\t" || tempCharacter == "#") {
            break;
        }
        index += 1;
    }
    return index;
}

ParseUtils.prototype.isFirstArgWordCharacter = function(character) {
    if (character == "_") {
        return true;
    }
    var tempCharCode = character.charCodeAt(0);
    // Uppercase letters or lowercase letters.
    return ((tempCharCode >= 65 && tempCharCode <= 90)
        || (tempCharCode >= 97 && tempCharCode <= 122));
}

ParseUtils.prototype.isArgWordCharacter = function(character) {
    if (character == "_") {
        return true;
    }
    var tempCharCode = character.charCodeAt(0);
    // Uppercase letters, lowercase letters, or digits.
    return ((tempCharCode >= 65 && tempCharCode <= 90)
        || (tempCharCode >= 97 && tempCharCode <= 122)
        || (tempCharCode >= 48 && tempCharCode <= 57));
}

ParseUtils.prototype.isFirstArgNumberCharacter = function(character) {
    var tempCharCode = character.charCodeAt(0);
    // Digits.
    return (tempCharCode >= 48 && tempCharCode <= 57);
}

// Returns {operator: Operator, index: number}.
ParseUtils.prototype.parseArgOperator = function(text, index, operatorList) {
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

// Returns {argWord: ArgWord, index: number}.
ParseUtils.prototype.parseArgWord = function(text, index) {
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

// Returns {argNumber: ArgNumber, index: number}.
ParseUtils.prototype.parseArgNumber = function(text, index) {
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

// Returns {argString: ArgString, index: number}.
ParseUtils.prototype.parseArgString = function(text, index) {
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

// Returns {expression: Expression, index: number}.
ParseUtils.prototype.parseArgExpression = function(text, index, precedence) {
    index = parseUtils.skipWhitespace(text, index);
    if (index >= text.length) {
        throw new AssemblyError("Expected expression.");
    }
    var outputExpression;
    // Look for unary operator.
    var tempResult = parseUtils.parseArgOperator(text, index, unaryOperatorList);
    var tempOperator = tempResult.operator;
    if (tempOperator === null) {
        var tempCharacter = text.charAt(index);
        if (parseUtils.isFirstArgWordCharacter(tempCharacter)) {
            // Parse keyword or identifier.
            var tempResult = parseUtils.parseArgWord(text, index);
            index = tempResult.index;
            outputExpression = tempResult.argWord;
        } else if (parseUtils.isFirstArgNumberCharacter(tempCharacter)) {
            // Parse number literal.
            var tempResult = parseUtils.parseArgNumber(text, index);
            index = tempResult.index;
            outputExpression = tempResult.argNumber;
        } else if (tempCharacter == "\"") {
            // Parse string literal.
            var tempResult = parseUtils.parseArgString(text, index);
            index = tempResult.index;
            outputExpression = tempResult.argString;
        } else if (tempCharacter == "(") {
            // Parse expression in parentheses.
            index += 1;
            var tempResult = parseUtils.parseArgExpression(text, index, 99);
            outputExpression = tempResult.expression;
            index = tempResult.index;
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
        index = tempResult.index;
        // Create a unary expression.
        var tempResult = parseUtils.parseArgExpression(text, index, 0);
        var tempExpression = tempResult.expression;
        outputExpression = tempOperator.createExpression(tempExpression);
        index = tempResult.index;
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
            var tempResult = parseUtils.parseArgExpression(text, index, 99);
            var tempIndexExpression = tempResult.expression;
            index = tempResult.index;
            index = parseUtils.skipWhitespace(text, index);
            if (index >= text.length - 1) {
                throw new AssemblyError("Expected subscript data type.");
            }
            var tempText = text.substring(index, index + 2);
            if (tempText != "]:") {
                throw new AssemblyError("Expected subscript data type.");
            }
            index += 2;
            var tempResult = parseUtils.parseArgExpression(text, index, 1);
            var tempDataTypeExpression = tempResult.expression;
            index = tempResult.index;
            outputExpression = new SubscriptExpression(
                outputExpression,
                tempIndexExpression,
                tempDataTypeExpression
            );
            continue;
        }
        // Look for binary operator.
        var tempResult = parseUtils.parseArgOperator(text, index, binaryOperatorList);
        var tempOperator = tempResult.operator;
        if (tempOperator === null) {
            break;
        }
        if (tempOperator.precedence >= precedence) {
            break;
        }
        index = tempResult.index;
        // Create a binary expression.
        var tempResult = parseUtils.parseArgExpression(text, index, tempOperator.precedence);
        var tempExpression = tempResult.expression;
        outputExpression = tempOperator.createExpression(
            outputExpression,
            tempExpression
        );
        index = tempResult.index;
    }
    return {expression: outputExpression, index: index};
}

ParseUtils.prototype.parseLineText = function(text) {
    
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
        var tempResult = parseUtils.parseArgExpression(text, index);
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

ParseUtils.prototype.loadAssemblyFileContent = function(path) {
    if (!fs.existsSync(path)) {
        throw new AssemblyError("Missing source file \"" + path + "\".");
    }
    var tempContent = fs.readFileSync(path, "utf8");
    return tempContent.split("\n");
}

ParseUtils.prototype.parseAssemblyLines = function(lineTextList) {
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

ParseUtils.prototype.collapseCodeBlocks = function(lineList) {
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


