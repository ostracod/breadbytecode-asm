
var tempResource = require("./expression");
var UnaryExpression = tempResource.UnaryExpression;
var UnaryAtExpression = tempResource.UnaryAtExpression;
var BinaryExpression = tempResource.BinaryExpression;

var unaryOperatorList = [];
var binaryOperatorList = [];

function UnaryOperator(text) {
    this.text = text;
    unaryOperatorList.push(this);
}

UnaryOperator.prototype.createExpression = function(operand) {
    return new UnaryExpression(this, operand);
}

function UnaryAtOperator() {
    UnaryOperator.call(this, "@");
}

UnaryAtOperator.prototype = Object.create(UnaryOperator.prototype);
UnaryAtOperator.prototype.constructor = UnaryAtOperator;

UnaryAtOperator.prototype.createExpression = function(operand) {
    return new UnaryAtExpression(operand);
}

function BinaryOperator(text, precedence) {
    this.text = text;
    this.precedence = precedence;
    binaryOperatorList.push(this);
}

BinaryOperator.prototype.createExpression = function(operand1, operand2) {
    return new BinaryExpression(this, operand1, operand2);
}

new UnaryOperator("-");
new UnaryOperator("~");
var unaryAtOperator = new UnaryAtOperator();

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

module.exports = {
    unaryOperatorList: unaryOperatorList,
    binaryOperatorList: binaryOperatorList,
    unaryAtOperator: unaryAtOperator
};


