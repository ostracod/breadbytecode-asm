
var fs = require("fs");

var assemblyFileExtension = ".bbasm";
var unaryOperatorTextList = ["-", "~"];
var binaryOperatorTextList = [
    "+", "-", "*", "/", "%",
    "&", "|", "^", ">>", "<<",
    ":"
];

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
}

function LineParseError(message) {
    this.message = message;
    this.lineNumber = null;
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
    throw new LineParseError("Missing end quotation mark.");
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
        throw new LineParseError("Missing end quotation mark.");
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
            index += 1;
            if (!isArgTermCharacter(tempCharacter)) {
                break;
            }
        }
        return index;
    }
}

function skipArgOperator(text, index, operatorTextList) {
    var tempIndex = 0;
    while (tempIndex < operatorTextList.length) {
        var tempOperatorText = operatorTextList[tempIndex];
        tempIndex += 1;
        var tempEndIndex = index + tempOperatorText.length;
        if (tempEndIndex > text.length) {
            continue;
        }
        var tempText = text.substring(index, tempEndIndex);
        if (tempText == tempOperatorText) {
            return tempEndIndex;
        }
    }
    return index;
}

function parseArgText(text) {
    if (text.length <= 0) {
        return null;
    }
    var index = 0;
    while (index < text.length) {
        index = skipWhitespace(text, index);
        if (index >= text.length) {
            break;
        }
        var tempCharacter = text.substring(index, index + 1);
        if (isArgTermCharacter(tempCharacter)) {
            var tempStartIndex = index;
            index = skipArgTermCharacters(text, index);
            var tempEndIndex = index;
            var tempTermText = text.substring(tempStartIndex, tempEndIndex);
            console.log(tempTermText);
            continue;
        }
        var tempEndIndex = skipArgOperator(text, index, unaryOperatorTextList);
        if (tempEndIndex != index) {
            var tempOperatorText = text.substring(index, tempEndIndex);
            index = tempEndIndex;
            console.log(tempOperatorText);
            continue;
        }
        var tempEndIndex = skipArgOperator(text, index, binaryOperatorTextList);
        if (tempEndIndex != index) {
            var tempOperatorText = text.substring(index, tempEndIndex);
            index = tempEndIndex;
            console.log(tempOperatorText);
            continue;
        }
        throw new LineParseError("Unexpected symbol.");
    }
    // TODO: Process order of operations and
    // produce actual output.
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
            throw new LineParseError("Expected argument.");
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
            throw new LineParseError("Expected comma.");
        }
        index += 1;
    }
    return new AssemblyLine(tempDirectiveName, tempArgTextList);
}

function assembleCodeFile(sourcePath, destinationPath) {
    var tempContent = fs.readFileSync(sourcePath, "utf8");
    var lineTextList = tempContent.split("\n");
    
    var index = 0;
    while (index < lineTextList.length) {
        var tempText = lineTextList[index];
        var tempLineNumber = index + 1;
        index += 1;
        console.log(tempText);
        var tempLine;
        try {
            tempLine = parseLineText(tempText);
        } catch(error) {
            if (error instanceof LineParseError) {
                console.log("Parse error on line " + tempLineNumber + ": " + error.message);
                return;
            } else {
                throw error;
            }
        }
        if (tempLine === null) {
            continue;
        }
        console.log([tempLine.directiveName, tempLine.argTextList]);
    }
    
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


