
var fs = require("fs");

var assemblyFileExtension = ".bbasm";

function AssemblyLine(directiveName, argList) {
    this.directiveName = directiveName;
    this.argList = argList;
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

function skipArgCharacters(text, index) {
    var output = index;
    var tempIsInString = false;
    var tempIsEscaped = false;
    while (index < text.length) {
        var tempCharacter = text.substring(index, index + 1);
        index += 1;
        if (tempCharacter == "\"") {
            if (tempIsInString) {
                if (!tempIsEscaped) {
                    tempIsInString = false;
                }
            } else {
                tempIsInString = true;
            }
        }
        if (tempIsInString) {
            if (tempIsEscaped) {
                tempIsEscaped = false;
            } else if (tempCharacter == "\\") {
                tempIsEscaped = true;
            }
            output = index;
        } else {
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
    var tempArgList = [];
    while (true) {
        index = skipWhitespace(text, index);
        // Handle empty argument list.
        if (tempArgList.length == 0) {
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
        var tempTerm = text.substring(tempStartIndex, tempEndIndex);
        tempArgList.push(tempTerm);
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
    return new AssemblyLine(tempDirectiveName, tempArgList);
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
        console.log([tempLine.directiveName, tempLine.argList]);
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


