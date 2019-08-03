
var AssemblyError = require("./assemblyError").AssemblyError;

// Map from name to DataType.
var dataTypeMap = {};

function DataType() {
    dataTypeMap[this.getName()] = this;
}

// Concrete subclasses of DataType must implement getName.

function PointerType() {
    DataType.call(this);
}

PointerType.prototype = Object.create(DataType.prototype);
PointerType.prototype.constructor = PointerType;

PointerType.prototype.getName = function() {
    return "p";
}

function NumberType(byteAmount) {
    this.byteAmount = byteAmount;
    DataType.call(this);
}

NumberType.prototype = Object.create(DataType.prototype);
NumberType.prototype.constructor = NumberType;

// Concrete subclasses of NumberType must implement getNamePrefix.

NumberType.prototype.getName = function() {
    return this.getNamePrefix() + (this.byteAmount * 8);
}

function IntegerType(byteAmount) {
    NumberType.call(this, byteAmount);
}

IntegerType.prototype = Object.create(NumberType.prototype);
IntegerType.prototype.constructor = IntegerType;

function UnsignedIntegerType(byteAmount) {
    IntegerType.call(this, byteAmount);
}

UnsignedIntegerType.prototype = Object.create(IntegerType.prototype);
UnsignedIntegerType.prototype.constructor = UnsignedIntegerType;

UnsignedIntegerType.prototype.getNamePrefix = function() {
    return "u";
}

function SignedIntegerType(byteAmount) {
    IntegerType.call(this, byteAmount);
}

SignedIntegerType.prototype = Object.create(IntegerType.prototype);
SignedIntegerType.prototype.constructor = SignedIntegerType;

SignedIntegerType.prototype.getNamePrefix = function() {
    return "s";
}

function FloatType(byteAmount) {
    NumberType.call(this, byteAmount);
}

FloatType.prototype = Object.create(NumberType.prototype);
FloatType.prototype.constructor = FloatType;

FloatType.prototype.getNamePrefix = function() {
    return "f";
}

var pointerType = new PointerType();
var unsignedInteger8Type = new UnsignedIntegerType(1);
var unsignedInteger16Type = new UnsignedIntegerType(2);
var unsignedInteger32Type = new UnsignedIntegerType(4);
var unsignedInteger64Type = new UnsignedIntegerType(8);
var signedInteger8Type = new SignedIntegerType(1);
var signedInteger16Type = new SignedIntegerType(2);
var signedInteger32Type = new SignedIntegerType(4);
var signedInteger64Type = new SignedIntegerType(8);
var float32Type = new FloatType(4);
var float64Type = new FloatType(8);

function DataTypeUtils() {
    
}

var dataTypeUtils = new DataTypeUtils();

DataTypeUtils.prototype.getDataTypeByName = function(name) {
    if (!(name in dataTypeMap)) {
        throw new AssemblyError("Unrecognized data type.");
    }
    return dataTypeMap[name];
}

module.exports = {
    pointerType: pointerType,
    unsignedInteger8Type: unsignedInteger8Type,
    unsignedInteger16Type: unsignedInteger16Type,
    unsignedInteger32Type: unsignedInteger32Type,
    unsignedInteger64Type: unsignedInteger64Type,
    signedInteger8Type: signedInteger8Type,
    signedInteger16Type: signedInteger16Type,
    signedInteger32Type: signedInteger32Type,
    signedInteger64Type: signedInteger64Type,
    float32Type: float32Type,
    float64Type: float64Type,
    dataTypeUtils: dataTypeUtils
}


