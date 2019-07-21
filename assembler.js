
var fs = require("fs");

var assemblyFileExtension = ".bbasm";
var unaryOperatorList = [];
var binaryOperatorList = [];
var codeBlockDirectiveNameSet = ["ENTRY_FUNC", "PRIVATE_FUNC", "PUBLIC_FUNC", "JMP_TABLE", "APP_DATA", "MACRO"];

var rootLineList;
// Map from name to Expression.
var constantDefinitionMap;
// Map from name to MacroDefinition.
var macroDefinitionMap;
var entryPointFunctionDefinition;
// Map from name to FunctionDefinition.
var functionDefinitionMap;
var appDataLineList;

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
new UnaryOperator("@");

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

// An Expression is either ArgTerm, UnaryExpression,
// BinaryExpression, or SubscriptExpression.

function ArgTerm(text) {
    this.text = text;
}

ArgTerm.prototype.copy = function() {
    return new ArgTerm(this.text);
}

ArgTerm.prototype.toString = function() {
    return this.text;
}

ArgTerm.prototype.getStringValue = function() {
    if (this.text.length <= 0) {
        throw new AssemblyError("Expected string.");
    }
    if (this.text.charAt(0) != "\""
            || this.text.charAt(this.text.length - 1) != "\"") {
        throw new AssemblyError("Expected string.");
    }
    var tempText = this.text.substring(1, this.text.length - 1);
    var output = "";
    var index = 0;
    var tempIsEscaped = false;
    while (index < tempText.length) {
        var tempCharacter = tempText.charAt(index);
        if (tempIsEscaped) {
            if (tempCharacter == "n") {
                output += "\n";
            } else {
                output += tempCharacter;
            }
            tempIsEscaped = false;
        } else {
            if (tempCharacter == "\\") {
                tempIsEscaped = true;
            } else {
                output += tempCharacter;
            }
        }
        index += 1;
    }
    return output;
}

ArgTerm.prototype.substituteIdentifiers = function(nameExpressionMap) {
    if (!(this.text in nameExpressionMap)) {
        return this;
    }
    var tempExpression = nameExpressionMap[this.text];
    return tempExpression.copy();
}

function UnaryExpression(operator, operand) {
    this.operator = operator;
    this.operand = operand;
}

UnaryExpression.prototype.copy = function() {
    return new UnaryExpression(this.operator, this.operand.copy());
}

UnaryExpression.prototype.toString = function() {
    return this.operator.text + this.operand.toString();
}

UnaryExpression.prototype.substituteIdentifiers = function(nameExpressionMap) {
    this.operand = this.operand.substituteIdentifiers(nameExpressionMap);
    return this;
}

function BinaryExpression(operator, operand1, operand2) {
    this.operator = operator;
    this.operand1 = operand1;
    this.operand2 = operand2;
}

BinaryExpression.prototype.copy = function() {
    return new BinaryExpression(
        this.operator,
        this.operand1.copy(),
        this.operand2.copy()
    );
}

BinaryExpression.prototype.toString = function() {
    return "(" + this.operand1.toString() + " " + this.operator.text + " " + this.operand2.toString() + ")";
}

BinaryExpression.prototype.substituteIdentifiers = function(nameExpressionMap) {
    this.operand1 = this.operand1.substituteIdentifiers(nameExpressionMap);
    this.operand1 = this.operand2.substituteIdentifiers(nameExpressionMap);
    return this;
}

function SubscriptExpression(sequence, index, dataType) {
    this.sequence = sequence;
    this.index = index;
    this.dataType = dataType;
}

SubscriptExpression.prototype.copy = function() {
    return new SubscriptExpression(
        this.sequence.copy(),
        this.index.copy(),
        this.dataType.copy()
    );
}

SubscriptExpression.prototype.toString = function() {
    return "(" + this.sequence.toString() + "[" + this.index.toString() + "]:" + this.dataType.toString() + ")";
}

SubscriptExpression.prototype.substituteIdentifiers = function(nameExpressionMap) {
    this.sequence = this.sequence.substituteIdentifiers(nameExpressionMap);
    this.index = this.index.substituteIdentifiers(nameExpressionMap);
    this.dataType = this.dataType.substituteIdentifiers(nameExpressionMap);
    return this;
}

function copyExpressions(expressionList) {
    var output = [];
    var index = 0;
    while (index < expressionList.length) {
        var tempExpression = expressionList[index];
        output.push(tempExpression.copy());
        index += 1;
    }
    return output;
}

function substituteIdentifiersInExpressions(expressionList, nameExpressionMap) {
    var index = 0;
    while (index < expressionList.length) {
        var tempExpression = expressionList[index];
        tempExpression = tempExpression.substituteIdentifiers(nameExpressionMap);
        expressionList[index] = tempExpression;
        index += 1;
    }
}

function AssemblyLine(directiveName, argTextList) {
    this.directiveName = directiveName;
    this.argTextList = argTextList;
    this.argList = [];
    if (typeof argTextList !== "undefined") {
        var index = 0;
        while (index < this.argTextList.length) {
            var tempArg = parseArgText(this.argTextList[index]);
            this.argList.push(tempArg);
            index += 1;
        }
    }
    this.lineNumber = null;
    // List of AssemblyLine or null.
    this.codeBlock = null;
}

AssemblyLine.prototype.copy = function() {
    var output = new AssemblyLine(this.directiveName);
    output.argList = copyExpressions(this.argList);
    output.lineNumber = this.lineNumber;
    if (this.codeBlock === null) {
        output.codeBlock = null;
    } else {
        output.codeBlock = copyLines(this.codeBlock);
    }
    return output;
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

AssemblyLine.prototype.substituteIdentifiers = function(nameExpressionMap) {
    substituteIdentifiersInExpressions(this.argList, nameExpressionMap);
    if (this.codeBlock !== null) {
        substituteIdentifiersInLines(this.codeBlock, nameExpressionMap);
    }
}

function copyLines(lineList) {
    var output = [];
    var index = 0;
    while (index < lineList.length) {
        var tempLine = lineList[index];
        output.push(tempLine.copy());
        index += 1;
    }
    return output;
}

function substituteIdentifiersInLines(lineList, nameExpressionMap) {
    var index = 0;
    while (index < lineList.length) {
        var tempLine = lineList[index];
        tempLine.substituteIdentifiers(nameExpressionMap);
        index += 1;
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

function MacroDefinition(name, argNameList, lineList) {
    this.name = name;
    this.argNameList = argNameList;
    this.lineList = lineList;
    macroDefinitionMap[this.name] = this;
}

MacroDefinition.prototype.invoke = function(argList) {
    if (argList.length != this.argNameList.length) {
        throw new AssemblyError("Wrong number of macro arguments.");
    }
    // Map from argument name to expression.
    var nameExpressionMap = {};
    var index = 0;
    while (index < this.argNameList.length) {
        var tempName = this.argNameList[index];
        var tempExpression = argList[index];
        nameExpressionMap[tempName] = tempExpression;
        index += 1;
    }
    var output = copyLines(this.lineList);
    substituteIdentifiersInLines(output, nameExpressionMap);
    return output;
}

function FunctionDefinition(name, dependencyIndexExpression, lineList) {
    if (name === null) {
        if (entryPointFunctionDefinition !== null) {
            throw new AssemblyError("Application must contain exactly one entry point.");
        }
        entryPointFunctionDefinition = this;
    } else {
        this.name = name;
        functionDefinitionMap[this.name] = this;
    }
    if (dependencyIndexExpression === null) {
        this.isPublic = false;
    } else {
        this.isPublic = true;
        this.dependencyIndexExpression = dependencyIndexExpression;
    }
    this.lineList = lineList;
    this.jumpTableLineList = [];
    this.extractJumpTables();
}

FunctionDefinition.prototype.extractJumpTables = function() {
    var self = this;
    var tempResult = processLines(self.lineList, function(line) {
        var tempDirectiveName = line.directiveName;
        if (line.directiveName == "JMP_TABLE") {
            if (line.argList.length != 0) {
                throw new AssemblyError("Expected 0 arguments.");
            }
            var index = 0;
            while (index < line.codeBlock.length) {
                var tempLine = line.codeBlock[index];
                self.jumpTableLineList.push(tempLine);
                index += 1;
            }
            return [];
        }
        return null;
    });
    self.lineList = tempResult.lineList;
}

function skipWhitespace(text, index) {
    while (index < text.length) {
        var tempCharacter = text.charAt(index);
        if (tempCharacter != " " && tempCharacter != "\t") {
            break
        }
        index += 1;
    }
    return index;
}

function skipDirectiveCharacters(text, index) {
    while (index < text.length) {
        var tempCharacter = text.charAt(index);
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

function skipArgCharacters(text, index) {
    var output = index;
    var tempIsInString = false;
    var tempIsEscaped = false;
    while (index < text.length) {
        var tempCharacter = text.charAt(index);
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
    var tempFirstCharacter = text.charAt(index);
    if (tempFirstCharacter == "\"") {
        return skipArgStringTermCharacters(text, index);
    } else {
        while (index < text.length) {
            var tempCharacter = text.charAt(index);
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
        var tempCharacter = text.charAt(index);
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
            var tempCharacter = text.charAt(index);
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
        var tempCharacter = text.charAt(index);
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
            var tempCharacter = text.charAt(index);
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

function loadAssemblyFileContent(path) {
    if (!fs.existsSync(path)) {
        throw new AssemblyError("Missing source file \"" + path + "\".");
    }
    var tempContent = fs.readFileSync(path, "utf8");
    return tempContent.split("\n");
}

function parseAssemblyLines(lineTextList) {
    var output = [];
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
        output.push(tempLine);
    }
    return output;
}

function collapseCodeBlocks(lineList) {
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

function getArgAsIdentifier(argList, index) {
    var tempArg = argList[index];
    if (!(tempArg instanceof ArgTerm)) {
        throw new AssemblyError("Expected identifier.");
    }
    return tempArg.text;
}

function getArgAsString(argList, index) {
    var tempArg = argList[index];
    // TODO: Accommodate string concatenation.
    if (!(tempArg instanceof ArgTerm)) {
        throw new AssemblyError("Expected string.");
    }
    return tempArg.getStringValue();
}

// processLine accepts a single line, and returns
// either a list of lines or null.
// If the return value is null, no modification
// takes place.
// Output format of processLines:
// {
//   lineList: LineList[],
//   processCount: number
// }
function processLines(lineList, processLine, shouldProcessCodeBlocks) {
    if (typeof shouldProcessCodeBlocks === "undefined") {
        shouldProcessCodeBlocks = false;
    }
    var outputLineList = [];
    var processCount = 0;
    var index = 0;
    while (index < lineList.length) {
        var tempLine = lineList[index];
        try {
            var tempResult = processLine(tempLine);
        } catch(error) {
            if (error instanceof AssemblyError && error.lineNumber === null) {
                error.lineNumber = tempLine.lineNumber;
            }
            throw error;
        }
        if (tempResult === null) {
            outputLineList.push(tempLine);
        } else {
            var tempIndex = 0;
            while (tempIndex < tempResult.length) {
                var tempLine2 = tempResult[tempIndex];
                outputLineList.push(tempLine2);
                tempIndex += 1;
            }
            processCount += 1;
        }
        index += 1;
    }
    if (shouldProcessCodeBlocks) {
        var index = 0;
        while (index < outputLineList.length) {
            var tempLine = outputLineList[index];
            index += 1;
            if (tempLine.codeBlock === null) {
                continue;
            }
            var tempResult = processLines(
                tempLine.codeBlock,
                processLine,
                shouldProcessCodeBlocks
            );
            tempLine.codeBlock = tempResult.lineList;
            processCount += tempResult.processCount;
        }
    }
    return {
        lineList: outputLineList,
        processCount: processCount
    };
}

function extractMacroDefinitions(lineList) {
    var tempResult = processLines(lineList, function(line) {
        var tempArgList = line.argList;
        if (line.directiveName == "MACRO") {
            if (tempArgList.length < 1) {
                throw new AssemblyError("Expected at least 1 argument.");
            }
            var tempName = getArgAsIdentifier(tempArgList, 0);
            var tempArgNameList = [];
            var index = 1;
            while (index < tempArgList.length) {
                var tempArgName = getArgAsIdentifier(tempArgList, index);
                tempArgNameList.push(tempArgName);
                index += 1;
            }
            new MacroDefinition(tempName, tempArgNameList, line.codeBlock);
            return [];
        }
        return null;
    });
    return tempResult.lineList;
}

function expandMacroInvocations(lineList) {
    var tempResult = processLines(lineList, function(line) {
        var tempDirectiveName = line.directiveName;
        if (tempDirectiveName in macroDefinitionMap) {
            var tempDefinition = macroDefinitionMap[tempDirectiveName];
            return tempDefinition.invoke(line.argList);
        }
        return null;
    }, true);
    return {
        lineList: tempResult.lineList,
        expandCount: tempResult.processCount
    };
}

function extractConstantDefinitions(lineList) {
    var tempResult = processLines(lineList, function(line) {
        var tempArgList = line.argList;
        if (line.directiveName == "DEF") {
            if (tempArgList.length != 2) {
                throw new AssemblyError("Expected 2 arguments.");
            }
            var tempName = getArgAsIdentifier(tempArgList, 0);
            var tempExpression = tempArgList[1];
            constantDefinitionMap[tempName] = tempExpression;
            return [];
        }
        return null;
    });
    return tempResult.lineList;
}

function processIncludeDirectives(lineList) {
    var tempResult = processLines(lineList, function(line) {
        var tempArgList = line.argList;
        if (line.directiveName == "INCLUDE") {
            if (tempArgList.length != 1) {
                throw new AssemblyError("Expected 1 argument.");
            }
            var tempPath = getArgAsString(tempArgList, 0);
            return loadAndParseAssemblyFile(tempPath);
        }
        return null;
    });
    return {
        lineList: tempResult.lineList,
        includeCount: tempResult.processCount
    };
}

function extractFunctionDefinitions(lineList) {
    var tempResult = processLines(lineList, function(line) {
        var tempDirectiveName = line.directiveName;
        var tempArgList = line.argList;
        if (tempDirectiveName == "ENTRY_FUNC") {
            if (tempArgList.length != 0) {
                throw new AssemblyError("Expected 0 arguments.");
            }
            new FunctionDefinition(null, null, line.codeBlock);
            return [];
        }
        if (tempDirectiveName == "PRIVATE_FUNC") {
            if (tempArgList.length != 1) {
                throw new AssemblyError("Expected 1 argument.");
            }
            var tempName = getArgAsIdentifier(tempArgList, 0);
            new FunctionDefinition(tempName, null, line.codeBlock);
            return [];
        }
        if (tempDirectiveName == "PUBLIC_FUNC") {
            if (tempArgList.length != 2) {
                throw new AssemblyError("Expected 2 arguments.");
            }
            var tempName = getArgAsIdentifier(tempArgList, 0);
            new FunctionDefinition(tempName, tempArgList[1], line.codeBlock);
            return [];
        }
        return null;
    });
    return tempResult.lineList;
}

function extractAppDataDefinitions(lineList) {
    var tempResult = processLines(lineList, function(line) {
        if (line.directiveName == "APP_DATA") {
            if (line.argList.length != 0) {
                throw new AssemblyError("Expected 0 arguments.");
            }
            var index = 0;
            while (index < line.codeBlock.length) {
                var tempLine = line.codeBlock[index];
                appDataLineList.push(tempLine);
                index += 1;
            }
            return [];
        }
        return null
    });
    return tempResult.lineList;
}

function loadAndParseAssemblyFile(path) {
    var tempLineTextList = loadAssemblyFileContent(path);
    var tempLineList = parseAssemblyLines(tempLineTextList);
    tempLineList = collapseCodeBlocks(tempLineList);
    tempLineList = extractMacroDefinitions(tempLineList);
    // We do all of this in a loop because included files may define
    // macros, and macros may define INCLUDE directives.
    while (true) {
        var tempResult = expandMacroInvocations(tempLineList);
        tempLineList = tempResult.lineList;
        var tempExpandCount = tempResult.expandCount;
        tempLineList = extractConstantDefinitions(tempLineList);
        var tempResult = processIncludeDirectives(tempLineList);
        tempLineList = tempResult.lineList;
        var tempIncludeCount = tempResult.includeCount;
        if (tempExpandCount <= 0 && tempIncludeCount <= 0) {
            break;
        }
    }
    return tempLineList;
}

function printLineList(lineList, indentationLevel) {
    if (typeof indentationLevel === "undefined") {
        indentationLevel = 0;
    }
    var index = 0;
    while (index < lineList.length) {
        var tempLine = lineList[index];
        console.log(tempLine.toString(indentationLevel));
        index += 1;
    }
}

function printAssembledState() {
    console.log("\n= = = ROOT LINE LIST = = =\n");
    printLineList(rootLineList);
    console.log("\n= = = CONSTANT DEFINITIONS = = =\n");
    var name;
    for (name in constantDefinitionMap) {
        var tempExpression = constantDefinitionMap[name];
        console.log(name + " = " + tempExpression.toString());
    }
    console.log("\n= = = MACRO DEFINITIONS = = =\n");
    var name;
    for (name in macroDefinitionMap) {
        var tempDefinition = macroDefinitionMap[name];
        console.log(name + " " + tempDefinition.argNameList.join(", ") + ":");
        printLineList(tempDefinition.lineList, 1);
        console.log("");
    }
    console.log("= = = FUNCTION DEFINITIONS = = =\n");
    console.log("Entry point function:");
    printLineList(entryPointFunctionDefinition.lineList, 1);
    console.log("");
    var name;
    for (name in functionDefinitionMap) {
        var tempDefinition = functionDefinitionMap[name];
        var tempText;
        if (tempDefinition.isPublic) {
            tempText = "Public function";
        } else {
            tempText = "Private function";
        }
        console.log(tempText + " " + name + ":");
        printLineList(tempDefinition.lineList, 1);
        if (tempDefinition.jumpTableLineList.length > 0) {
            console.log("Jump table:");
            printLineList(tempDefinition.jumpTableLineList, 1);
        }
        console.log("");
    }
    console.log("= = = APP DATA LINE LIST = = =\n");
    printLineList(appDataLineList);
    console.log("");
}

function assembleCodeFile(sourcePath, destinationPath) {
    
    constantDefinitionMap = {};
    macroDefinitionMap = {};
    entryPointFunctionDefinition = null;
    functionDefinitionMap = {};
    appDataLineList = [];
    
    try {
        rootLineList = loadAndParseAssemblyFile(sourcePath);
        rootLineList = extractFunctionDefinitions(rootLineList);
        rootLineList = extractAppDataDefinitions(rootLineList);
        if (entryPointFunctionDefinition === null) {
            throw new AssemblyError("Application must contain exactly one entry point.");
        }
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
    
    // TEST CODE.
    printAssembledState();
    
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


