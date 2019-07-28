
function AssemblyError(message, lineNumber) {
    this.message = message;
    if (typeof lineNumber === "undefined") {
        this.lineNumber = null;
    } else {
        this.lineNumber = lineNumber;
    }
}

module.exports = {
    AssemblyError: AssemblyError
};


