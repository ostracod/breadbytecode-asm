
var unaryAtOperator;

function Expression() {
    // This is an abstract class.
}

// Methods which concrete subclasses of Expression must implement:
// copy, toString, processExpressions

Expression.prototype.getIdentifier = function() {
    throw new AssemblyError("Expected identifier.");
}

Expression.prototype.getStringValue = function() {
    throw new AssemblyError("Expected string.");
}

Expression.prototype.substituteIdentifiers = function(nameExpressionMap) {
    return null;
}

Expression.prototype.populateMacroInvocationId = function(macroInvocationId) {
    // Do nothing.
}

function ArgTerm(text) {
    this.text = text;
}

ArgTerm.prototype = Object.create(Expression.prototype);
ArgTerm.prototype.constructor = ArgTerm;

ArgTerm.prototype.copy = function() {
    return new ArgTerm(this.text);
}

ArgTerm.prototype.toString = function() {
    return this.text;
}

ArgTerm.prototype.processExpressions = function(processExpression) {
    var tempResult = processExpression(this);
    if (tempResult !== null) {
        return tempResult;
    }
    return this;
}

ArgTerm.prototype.getIdentifier = function() {
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
        return null;
    }
    var tempExpression = nameExpressionMap[this.text];
    return tempExpression.copy();
}

function UnaryExpression(operator, operand) {
    this.operator = operator;
    this.operand = operand;
}

UnaryExpression.prototype = Object.create(Expression.prototype);
UnaryExpression.prototype.constructor = UnaryExpression;

UnaryExpression.prototype.copy = function() {
    return new UnaryExpression(this.operator, this.operand.copy());
}

UnaryExpression.prototype.toString = function() {
    return this.operator.text + this.operand.toString();
}

UnaryExpression.prototype.processExpressions = function(processExpression) {
    var tempResult = processExpression(this);
    if (tempResult !== null) {
        return tempResult;
    }
    this.operand = this.operand.processExpressions(processExpression);
    return this;
}

function UnaryAtExpression(operand) {
    UnaryExpression.call(this, unaryAtOperator, operand);
    this.macroInvocationId = null;
}

UnaryAtExpression.prototype = Object.create(UnaryExpression.prototype);
UnaryAtExpression.prototype.constructor = UnaryAtExpression;

UnaryAtExpression.prototype.copy = function() {
    var output = new UnaryAtExpression(this.operand.copy());
    output.macroInvocationId = this.macroInvocationId;
    return output;
}

UnaryAtExpression.prototype.toString = function() {
    if (this.macroInvocationId === null) {
        return UnaryExpression.prototype.toString.call(this);
    }
    return this.operator.text + "{" + this.macroInvocationId + "}" + this.operand.toString();
}

UnaryAtExpression.prototype.populateMacroInvocationId = function(macroInvocationId) {
    this.macroInvocationId = macroInvocationId;
}

function BinaryExpression(operator, operand1, operand2) {
    this.operator = operator;
    this.operand1 = operand1;
    this.operand2 = operand2;
}

BinaryExpression.prototype = Object.create(Expression.prototype);
BinaryExpression.prototype.constructor = BinaryExpression;

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

BinaryExpression.prototype.processExpressions = function(processExpression) {
    var tempResult = processExpression(this);
    if (tempResult !== null) {
        return tempResult;
    }
    this.operand1 = this.operand1.processExpressions(processExpression);
    this.operand2 = this.operand2.processExpressions(processExpression);
    return this;
}

BinaryExpression.prototype.getStringValue = function() {
    // TODO: Accommodate string concatenation.
    throw new AssemblyError("Not yet implemented.");
}

function SubscriptExpression(sequence, index, dataType) {
    this.sequence = sequence;
    this.index = index;
    this.dataType = dataType;
}

SubscriptExpression.prototype = Object.create(Expression.prototype);
SubscriptExpression.prototype.constructor = SubscriptExpression;

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

SubscriptExpression.prototype.processExpressions = function(processExpression) {
    var tempResult = processExpression(this);
    if (tempResult !== null) {
        return tempResult;
    }
    this.sequence = this.sequence.processExpressions(processExpression);
    this.index = this.index.processExpressions(processExpression);
    this.dataType = this.dataType.processExpressions(processExpression);
    return this;
}

module.exports = {
    ArgTerm: ArgTerm,
    UnaryExpression: UnaryExpression,
    UnaryAtExpression: UnaryAtExpression,
    BinaryExpression: BinaryExpression,
    SubscriptExpression: SubscriptExpression,
};

unaryAtOperator = require("./operator").unaryAtOperator;


