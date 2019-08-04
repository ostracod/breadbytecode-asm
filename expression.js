
var AssemblyError = require("./assemblyError").AssemblyError;
var Identifier = require("./identifier").Identifier;
var ArgDirectionPerm = require("./argDirectionPerm").ArgDirectionPerm;
var dataTypeUtils = require("./dataType").dataTypeUtils;

var unaryAtOperator;

function Expression() {
    // This is an abstract class.
}

// Methods which concrete subclasses of Expression must implement:
// copy, toString, processExpressions

Expression.prototype.getIdentifierOrNull = function() {
    return null;
}

Expression.prototype.getIdentifier = function() {
    var output = this.getIdentifierOrNull();
    if (output === null) {
        throw new AssemblyError("Expected identifier.");
    }
    return output;
}

Expression.prototype.getStringValue = function() {
    throw new AssemblyError("Expected string.");
}

Expression.prototype.getDataType = function() {
    throw new AssemblyError("Expected data type.");
}

Expression.prototype.getArgDirectionPerm = function() {
    throw new AssemblyError("Expected arg direction perm.");
}

Expression.prototype.substituteIdentifiers = function(identifierExpressionMap) {
    var tempIdentifier = this.getIdentifierOrNull();
    if (tempIdentifier === null) {
        return null;
    }
    var tempExpression = identifierExpressionMap.get(tempIdentifier);
    if (tempExpression === null) {
        return null;
    }
    return tempExpression.copy();
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

ArgTerm.prototype.getIdentifierOrNull = function() {
    return new Identifier(this.text, null);
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

ArgTerm.prototype.getDataType = function() {
    return dataTypeUtils.getDataTypeByName(this.text);
}

ArgTerm.prototype.getArgDirectionPerm = function() {
    return new ArgDirectionPerm(this.text);
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

UnaryAtExpression.prototype.getIdentifierOrNull = function() {
    if (!(this.operand instanceof ArgTerm)) {
        return null;
    }
    return new Identifier(this.operand.text, this.macroInvocationId);
}

UnaryAtExpression.prototype.populateMacroInvocationId = function(macroInvocationId) {
    if (this.macroInvocationId === null) {
        this.macroInvocationId = macroInvocationId;
    }
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


