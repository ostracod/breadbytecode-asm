
var fs = require("fs");

var lineTextList;
var assemblyLineList;
// Map from name to Expression.
var constantDefinitionMap;

var assemblyFileExtension = ".bbasm";
var unaryOperatorList = [];
var binaryOperatorList = [];
var codeBlockDirectiveNameSet = ["ENTRY_FUNC", "PRIVATE_FUNC", "PUBLIC_FUNC", "JMP_TABLE", "APP_DATA", "MACRO"];

function UnaryOperator(text) {
    this.text = text;
    unaryOperatorList.push(this);
}

function BinaryOperator(text, precedence) {
    this.text = text;
    this.precedence = precedence;
    binaryOperatorList.push(this);
}

new UnaryOperator("-");
new UnaryOperator("~");

new BinaryOperator(":", 1);
new BinaryOperator("*", 3);
new BinaryOperator("/", 3);
new BinaryOperator("%", 3);
new BinaryOperator("+", 4);
new BinaryOperator("-", 4);
new BinaryOperator(">>", 5);
new BinaryOperator("<<", 5);
new BinaryOperator("&", 6);
new BinaryOperator("^", 7);
new BinaryOperator("|", 8);

// An Expression is either ArgTerm, UnaryExpression, or BinaryExpression.

function ArgTerm(text) {
    this.text = text;
}

ArgTerm.prototype.toString = function() {
    return this.text;
}

function UnaryExpression(operator, operand) {
    this.operator = operator;
    this.operand = operand;
}

UnaryExpression.prototype.toString = function() {
    return this.operator.text + this.operand.toString();
}

function BinaryExpression(operator, operand1, operand2) {
    this.operator = operator;
    this.operand1 = operand1;
    this.operand2 = operand2;
}

BinaryExpression.prototype.toString = function() {
    return "(" + this.operand1.toString() + " " + this.operator.text + " " + this.operand2.toString() + ")";
}

function SubscriptExpression(sequence, index, dataType) {
    this.sequence = sequence;
    this.index = index;
    this.dataType = dataType;
}

SubscriptExpression.prototype.toString = function() {
    return "(" + this.sequence.toString() + "[" + this.index.toString() + "]:" + this.dataType.toString() + ")";
}

function AssemblyLine(directiveName, argTextList) {
    this.directiveName = directiveName;
    this.argTextList = argTextList;
    this.argList = [];
    var index = 0;
    while (index < this.argTextList.length) {
        var tempArg = parseArgText(this.argTextList[index]);
        this.argList.push(tempArg);
        index += 1;
    }
    this.lineNumber = null;
    // List of AssemblyLine or null.
    this.codeBlock = null;
}

AssemblyLine.prototype.toString = function(indentationLevel) {
    if (typeof indentationLevel === "undefined") {
        indentationLevel = 0;
    }
    var tempIndentation = "";
    var tempCount = 0;
    while (tempCount < indentationLevel) {
        tempIndentation = tempIndentation + "    ";
        tempCount += 1;
    }
    var tempTextList = [];
    var index = 0;
    while (index < this.argList.length) {
        var tempArg = this.argList[index];
        tempTextList.push(tempArg.toString());
        index += 1;
    }
    var tempLineText = tempIndentation + this.directiveName + " " + tempTextList.join(", ");
    if (this.codeBlock === null) {
        return tempLineText;
    } else {
        var tempLineTextList = [tempLineText];
        var index = 0;
        while (index < this.codeBlock.length) {
            var tempLine = this.codeBlock[index];
            tempLineTextList.push(tempLine.toString(indentationLevel + 1));
            index += 1;
        }
        tempLineTextList.push("END");
        return tempLineTextList.join("\n");
    }
}

function AssemblyError(message, lineNumber) {
    this.message = message;
    if (typeof lineNumber === "undefined") {
        this.lineNumber = null;
    } else {
        this.lineNumber = lineNumber;
    }
}

function skipWhitespace(text, index) {
    while (index < text.length) {
        var tempCharacter = text.substring(index, index + 1);
        if (tempCharacter != " " && tempCharacter != "\t") {
            break
        }
        index += 1;
    }
    return index;
}

function skipDirectiveCharacters(text, index) {
    while (index < text.length) {
        var tempCharacter = text.substring(index, index + 1);
        if (tempCharacter == " " || tempCharacter == "\t" || tempCharacter == "#") {
            break;
        }
        index += 1;
    }
    return index;
}

function skipArgStringTermCharacters(text, index) {
    if (index >= text.length) {
        return index;
    }
    var tempFirstCharacter = text.substring(index, index + 1);
    if (tempFirstCharacter != "\"") {
        return index;
    }
    index += 1;
    var tempIsEscaped = false;
    while (index < text.length) {
        var tempCharacter = text.substring(index, index + 1);
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

function skipArgCharacters(text, index) {
    var output = index;
    var tempIsInString = false;
    var tempIsEscaped = false;
    while (index < text.length) {
        var tempCharacter = text.substring(index, index + 1);
        if (tempCharacter == "\"") {
            index = skipArgStringTermCharacters(text, index);
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

function isArgTermCharacter(character) {
    if (character == "." || character == "_" || character == "\"") {
        return true;
    }
    var tempNumber = character.charCodeAt(0);
    // Numbers, uppercase letters, or lowercase letters.
    return ((tempNumber >= 48 && tempNumber <= 57)
        || (tempNumber >= 65 && tempNumber <= 90)
        || (tempNumber >= 97 && tempNumber <= 122));
}

function skipArgTermCharacters(text, index) {
    if (index >= text.length) {
        return index;
    }
    var tempFirstCharacter = text.substring(index, index + 1);
    if (tempFirstCharacter == "\"") {
        return skipArgStringTermCharacters(text, index);
    } else {
        while (index < text.length) {
            var tempCharacter = text.substring(index, index + 1);
            if (!isArgTermCharacter(tempCharacter)) {
                break;
            }
            index += 1;
        }
        return index;
    }
}

// Returns [Operator, index].
function parseArgOperator(text, index, operatorList) {
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
            return [tempOperator, tempEndIndex];
        }
    }
    return [null, index];
}

// Returns [Expression, index].
function parseArgExpression(text, index, precedence) {
    index = skipWhitespace(text, index);
    if (index >= text.length) {
        throw new AssemblyError("Expected expression.");
    }
    var outputExpression;
    // Look for unary operator.
    var tempResult = parseArgOperator(text, index, unaryOperatorList);
    var tempOperator = tempResult[0];
    if (tempOperator === null) {
        var tempCharacter = text.substring(index, index + 1);
        if (isArgTermCharacter(tempCharacter)) {
            // Parse a single term.
            var tempStartIndex = index;
            index = skipArgTermCharacters(text, index);
            var tempEndIndex = index;
            var tempTermText = text.substring(tempStartIndex, tempEndIndex);
            outputExpression = new ArgTerm(tempTermText);
        } else if (tempCharacter == "(") {
            // Parse expression in parentheses.
            index += 1;
            var tempResult = parseArgExpression(text, index, 99);
            outputExpression = tempResult[0];
            index = tempResult[1];
            index = skipWhitespace(text, index);
            if (index >= text.length) {
                throw new AssemblyError("Expected closing parenthesis.");
            }
            var tempCharacter = text.substring(index, index + 1);
            if (tempCharacter != ")") {
                throw new AssemblyError("Expected closing parenthesis.");
            }
            index += 1;
        } else {
            throw new AssemblyError("Unexpected symbol.");
        }
    } else {
        index = tempResult[1];
        // Create a unary expression.
        var tempResult = parseArgExpression(text, index, 0);
        var tempExpression = tempResult[0];
        outputExpression = new UnaryExpression(tempOperator, tempExpression);
        index = tempResult[1];
    }
    // Keep parsing binary and ternary expressions until
    // we meet input precedence or reach the end.
    while (true) {
        index = skipWhitespace(text, index);
        if (index >= text.length) {
            break;
        }
        var tempCharacter = text.substring(index, index + 1);
        if (tempCharacter == "[") {
            if (precedence <= 2) {
                break;
            }
            // Create a subscript expression.
            index += 1;
            var tempResult = parseArgExpression(text, index, 99);
            var tempIndexExpression = tempResult[0];
            index = tempResult[1];
            index = skipWhitespace(text, index);
            if (index >= text.length - 1) {
                throw new AssemblyError("Expected subscript data type.");
            }
            var tempText = text.substring(index, index + 2);
            if (tempText != "]:") {
                throw new AssemblyError("Expected subscript data type.");
            }
            index += 2;
            var tempResult = parseArgExpression(text, index, 1);
            var tempDataTypeExpression = tempResult[0];
            index = tempResult[1];
            outputExpression = new SubscriptExpression(
                outputExpression,
                tempIndexExpression,
                tempDataTypeExpression
            );
            continue;
        }
        // Look for binary operator.
        var tempResult = parseArgOperator(text, index, binaryOperatorList);
        var tempOperator = tempResult[0];
        if (tempOperator === null) {
            break;
        }
        if (tempOperator.precedence >= precedence) {
            break;
        }
        index = tempResult[1];
        // Create a binary expression.
        var tempResult = parseArgExpression(text, index, tempOperator.precedence);
        var tempExpression = tempResult[0];
        outputExpression = new BinaryExpression(
            tempOperator,
            outputExpression,
            tempExpression
        );
        index = tempResult[1];
    }
    return [outputExpression, index];
}

function parseArgText(text) {
    if (text.length <= 0) {
        return null;
    }
    var tempResult = parseArgExpression(text, 0, 99);
    var output = tempResult[0];
    var index = tempResult[1];
    index = skipWhitespace(text, index);
    if (index < text.length) {
        throw new AssemblyError("Unexpected symbol.");
    }
    return output;
}

function parseLineText(text) {
    
    var index = 0;
    
    // Parse the directive name.
    index = skipWhitespace(text, index);
    var tempStartIndex = index;
    index = skipDirectiveCharacters(text, index);
    var tempEndIndex = index;
    if (tempStartIndex == tempEndIndex) {
        return null;
    }
    var tempDirectiveName = text.substring(tempStartIndex, tempEndIndex);
    
    // Parse the argument list.
    var tempArgTextList = [];
    while (true) {
        index = skipWhitespace(text, index);
        // Handle empty argument list.
        if (tempArgTextList.length == 0) {
            if (index >= text.length) {
                break;
            }
            var tempCharacter = text.substring(index, index + 1);
            if (tempCharacter == "#") {
                break;
            }
        }
        // Extract the argument.
        var tempStartIndex = index;
        index = skipArgCharacters(text, index);
        var tempEndIndex = index;
        if (tempStartIndex == tempEndIndex) {
            throw new AssemblyError("Expected argument.");
        }
        var tempArgText = text.substring(tempStartIndex, tempEndIndex);
        tempArgTextList.push(tempArgText);
        index = skipWhitespace(text, index);
        if (index >= text.length) {
            break;
        }
        // Seek the next argument if it exists.
        var tempCharacter = text.substring(index, index + 1);
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

function loadAssemblyFileContent(sourcePath) {
    var tempContent = fs.readFileSync(sourcePath, "utf8");
    lineTextList = tempContent.split("\n");
}

function parseAssemblyLines() {
    assemblyLineList = [];
    var index = 0;
    while (index < lineTextList.length) {
        var tempText = lineTextList[index];
        var tempLineNumber = index + 1;
        index += 1;
        var tempLine;
        try {
            tempLine = parseLineText(tempText);
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
        assemblyLineList.push(tempLine);
    }
}

function collapseCodeBlocks() {
    var nextAssemblyLineList = [];
    // List of assembly lines which begin code blocks.
    var branchList = [];
    var index = 0;
    while (index < assemblyLineList.length) {
        var tempLine = assemblyLineList[index];
        var tempDirectiveName = tempLine.directiveName;
        if (tempDirectiveName == "END") {
            if (tempLine.argList.length > 0) {
                throw new AssemblyError("Expected 0 arguments", tempLine.lineNumber);
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
                nextAssemblyLineList.push(tempLine);
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
    assemblyLineList = nextAssemblyLineList;
}

function extractDefinitions() {
    constantDefinitionMap = {};
    var nextAssemblyLineList = [];
    var index = 0;
    while (index < assemblyLineList.length) {
        var tempLine = assemblyLineList[index];
        var tempDirectiveName = tempLine.directiveName;
        if (tempDirectiveName == "DEF") {
            if (tempLine.argList.length != 2) {
                throw new AssemblyError("Expected 2 arguments.", tempLine.lineNumber);
            }
            var tempName = tempLine.argList[0];
            var tempExpression = tempLine.argList[1];
            constantDefinitionMap[tempName] = tempExpression;
        } else {
            nextAssemblyLineList.push(tempLine);
        }
        index += 1;
    }
    assemblyLineList = nextAssemblyLineList;
}

function assembleCodeFile(sourcePath, destinationPath) {
    
    try {
        loadAssemblyFileContent(sourcePath);
        parseAssemblyLines();
        collapseCodeBlocks();
        extractDefinitions();
    } catch(error) {
        if (error instanceof AssemblyError) {
            if (error.lineNumber === null) {
                console.log("Error: " + error.message);
            } else {
                console.log("Error on line " + error.lineNumber + ": " + error.message);
            }
            return;
        } else {
            throw error;
        }
    }
    
    console.log(constantDefinitionMap);
    
    fs.writeFileSync(destinationPath, "TODO: Put actual bytecode here.");
    console.log("Finished assembling.");
    console.log("Destination path: " + destinationPath);
}

if (process.argv.length != 3) {
    console.log("Please provide a single path to a .bbasm file.");
    process.exit(1);
}

var sourcePath = process.argv[2];
if (!sourcePath.toLowerCase().endsWith(assemblyFileExtension)) {
    console.log("Input file must have " + assemblyFileExtension + " extension.");
    process.exit(1);
}
var destinationPath = sourcePath.substring(0, sourcePath.length - assemblyFileExtension.length);
assembleCodeFile(sourcePath, destinationPath);


