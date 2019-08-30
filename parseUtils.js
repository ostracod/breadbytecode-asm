
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
var ArgTerm = tempResource.ArgTerm;

var tempResource = require("./operator");
var unaryOperatorList = tempResource.unaryOperatorList;
var binaryOperatorList = tempResource.binaryOperatorList;

var codeBlockDirectiveNameSet = ["ENTRY_FUNC", "PRIVATE_FUNC", "PUBLIC_FUNC", "GUARD_FUNC", "JMP_TABLE", "APP_DATA", "MACRO"];

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

ParseUtils.prototype.skipArgStringTermCharacters = function(text, index) {
    if (index >= text.length) {
        return index;
    }
    var tempFirstCharacter = text.charAt(index);
    if (tempFirstCharacter != "\"") {
        return index;
    }
    index += 1;
    var tempIsEscaped = false;
    while (index < text.length) {
        var tempCharacter = text.charAt(index);
        index += 1;
        if (tempIsEscaped) {
            tempIsEscaped = false;
        } else {
            if (tempCharacter == "\"") {
                return index;
            }
            if (tempCharacter == "\\") {
                tempIsEscaped = true;
            }
        }
    }
    throw new AssemblyError("Missing end quotation mark.");
}

ParseUtils.prototype.skipArgCharacters = function(text, index) {
    var output = index;
    var tempIsInString = false;
    var tempIsEscaped = false;
    while (index < text.length) {
        var tempCharacter = text.charAt(index);
        if (tempCharacter == "\"") {
            index = parseUtils.skipArgStringTermCharacters(text, index);
            output = index;
        } else {
            index += 1;
            if (tempCharacter == "," || tempCharacter == "#") {
                break;
            }
            if (tempCharacter != " " && tempCharacter != "\t") {
                output = index;
            }
        }
    }
    if (tempIsInString) {
        throw new AssemblyError("Missing end quotation mark.");
    }
    return output;
}

ParseUtils.prototype.isArgTermCharacter = function(character) {
    if (character == "." || character == "_" || character == "\"") {
        return true;
    }
    var tempNumber = character.charCodeAt(0);
    // Numbers, uppercase letters, or lowercase letters.
    return ((tempNumber >= 48 && tempNumber <= 57)
        || (tempNumber >= 65 && tempNumber <= 90)
        || (tempNumber >= 97 && tempNumber <= 122));
}

ParseUtils.prototype.skipArgTermCharacters = function(text, index) {
    if (index >= text.length) {
        return index;
    }
    var tempFirstCharacter = text.charAt(index);
    if (tempFirstCharacter == "\"") {
        return parseUtils.skipArgStringTermCharacters(text, index);
    } else {
        while (index < text.length) {
            var tempCharacter = text.charAt(index);
            if (!parseUtils.isArgTermCharacter(tempCharacter)) {
                break;
            }
            index += 1;
        }
        return index;
    }
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
        if (parseUtils.isArgTermCharacter(tempCharacter)) {
            // Parse a single term.
            var tempStartIndex = index;
            index = parseUtils.skipArgTermCharacters(text, index);
            var tempEndIndex = index;
            var tempTermText = text.substring(tempStartIndex, tempEndIndex);
            outputExpression = new ArgTerm(tempTermText);
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

ParseUtils.prototype.parseArgText = function(text) {
    if (text.length <= 0) {
        return null;
    }
    var tempResult = parseUtils.parseArgExpression(text, 0, 99);
    var output = tempResult.expression;
    var index = tempResult.index;
    index = parseUtils.skipWhitespace(text, index);
    if (index < text.length) {
        throw new AssemblyError("Unexpected symbol.");
    }
    return output;
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
    var tempArgTextList = [];
    while (true) {
        index = parseUtils.skipWhitespace(text, index);
        // Handle empty argument list.
        if (tempArgTextList.length == 0) {
            if (index >= text.length) {
                break;
            }
            var tempCharacter = text.charAt(index);
            if (tempCharacter == "#") {
                break;
            }
        }
        // Extract the argument.
        var tempStartIndex = index;
        index = parseUtils.skipArgCharacters(text, index);
        var tempEndIndex = index;
        if (tempStartIndex == tempEndIndex) {
            throw new AssemblyError("Expected argument.");
        }
        var tempArgText = text.substring(tempStartIndex, tempEndIndex);
        tempArgTextList.push(tempArgText);
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
    return new AssemblyLine(tempDirectiveName, tempArgTextList);
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


