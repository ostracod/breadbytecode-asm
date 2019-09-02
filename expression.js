
var AssemblyError = require("./assemblyError").AssemblyError;
var Identifier = require("./identifier").Identifier;
var ArgPerm = require("./argPerm").ArgPerm;
var dataTypeUtils = require("./dataType").dataTypeUtils;

var unaryAtOperator;

function Expression() {
    // This is an abstract class.
}

// Methods which concrete subclasses of Expression must implement:
// copy, toString, processExpressionsHelper

Expression.prototype.processExpressions = function(processExpression, shouldRecurAfterProcess) {
    if (typeof shouldRecurAfterProcess === "undefined") {
        shouldRecurAfterProcess = false;
    }
    var output = this;
    while (true) {
        var tempResult = output.processExpressionsHelper(processExpression, shouldRecurAfterProcess);
        if (tempResult === null) {
            return output;
        }
        output = tempResult;
        if (!shouldRecurAfterProcess) {
            break;
        }
    }
    return output;
}

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

Expression.prototype.getArgPerm = function() {
    throw new AssemblyError("Expected arg perm.");
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

function ArgTerm() {
    // This is an abstract class.
}

ArgTerm.prototype = Object.create(Expression.prototype);
ArgTerm.prototype.constructor = ArgTerm;

ArgTerm.prototype.processExpressionsHelper = function(processExpression, shouldRecurAfterProcess) {
    var tempResult = processExpression(this);
    if (tempResult !== null) {
        return tempResult;
    }
    return null;
}

function ArgWord(text) {
    this.text = text;
}

ArgWord.prototype = Object.create(ArgTerm.prototype);
ArgWord.prototype.constructor = ArgWord;

ArgWord.prototype.copy = function() {
    return new ArgWord(this.text);
}

ArgWord.prototype.toString = function() {
    return this.text;
}

ArgWord.prototype.getIdentifierOrNull = function() {
    return new Identifier(this.text, null);
}

ArgWord.prototype.getDataType = function() {
    return dataTypeUtils.getDataTypeByName(this.text);
}

ArgWord.prototype.getArgPerm = function() {
    return new ArgPerm(this.text);
}

function ArgNumber(value) {
    this.value = value;
}

ArgNumber.prototype = Object.create(ArgTerm.prototype);
ArgNumber.prototype.constructor = ArgNumber;

ArgNumber.prototype.copy = function() {
    return new ArgNumber(this.value);
}

ArgNumber.prototype.toString = function() {
    return this.value + "";
}

function ArgString(value) {
    this.value = value;
}

ArgString.prototype = Object.create(ArgTerm.prototype);
ArgString.prototype.constructor = ArgString;

ArgString.prototype.copy = function() {
    return new ArgString(this.value);
}

ArgString.prototype.toString = function() {
    return "\"" + this.value + "\"";
}

ArgString.prototype.getStringValue = function() {
    return this.value;
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

UnaryExpression.prototype.processExpressionsHelper = function(processExpression, shouldRecurAfterProcess) {
    var tempResult = processExpression(this);
    if (tempResult !== null) {
        return tempResult;
    }
    this.operand = this.operand.processExpressions(processExpression, shouldRecurAfterProcess);
    return null;
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

BinaryExpression.prototype.processExpressionsHelper = function(processExpression, shouldRecurAfterProcess) {
    var tempResult = processExpression(this);
    if (tempResult !== null) {
        return tempResult;
    }
    this.operand1 = this.operand1.processExpressions(processExpression, shouldRecurAfterProcess);
    this.operand2 = this.operand2.processExpressions(processExpression, shouldRecurAfterProcess);
    return null;
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

SubscriptExpression.prototype.processExpressionsHelper = function(processExpression, shouldRecurAfterProcess) {
    var tempResult = processExpression(this);
    if (tempResult !== null) {
        return tempResult;
    }
    this.sequence = this.sequence.processExpressions(processExpression, shouldRecurAfterProcess);
    this.index = this.index.processExpressions(processExpression, shouldRecurAfterProcess);
    this.dataType = this.dataType.processExpressions(processExpression, shouldRecurAfterProcess);
    return null;
}

module.exports = {
    ArgWord: ArgWord,
    ArgNumber: ArgNumber,
    ArgString: ArgString,
    UnaryExpression: UnaryExpression,
    UnaryAtExpression: UnaryAtExpression,
    BinaryExpression: BinaryExpression,
    SubscriptExpression: SubscriptExpression,
};

unaryAtOperator = require("./operator").unaryAtOperator;


