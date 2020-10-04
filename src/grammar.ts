// @ts-nocheck
// Generated automatically by nearley, version 2.19.7
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }


const moo = require("moo")

const lexer = moo.compile({
  WhiteSpace: { match: /[ \t\n\r]+/, lineBreaks: true },
  Dot: ".",
  Colon: ":",
  SemiColon: ";",
  Comma: ",",
  LeftParens: "(",
  RightParens: ")",
  LeftCurlyBrackets: "{",
  RightCurlyBrackets: "}",
  LeftBrackets: "[",
  RightBrackets: "]",
  Plus: "+",
  Minus: "-",
  Multiplier: "*",
  Divider: "/",
  Power: "^",
  QuestionMark: "?",
  LessThan: "<",
  GreaterThan: ">",
  Ampersand: "&",
  EqualsTo: "=",
  Pound: "#",
  Function: "Function",
  Debug: "Debug",
  If: "if",
  StringLiteral: {
    match: /"(?:[^\n\\"]|\\["\\ntbfr])*"/,
    value: s => JSON.parse(s)
  },
  NumberLiteral: {
    match: /[0-9]+(?:\.[0-9]+)?/,
  },
  VariableType: {
    match: /Int|Double|String|Boolean|Occult|Ark/
  },
  Identifier: {
    match: /[a-zA-Z_][a-zA-Z_0-9]*/,
    type: moo.keywords({
      For: "for",
      As: "as",
      All: "All",
      Use: "use",
      From: "from",
      True: "true",
      False: "false",
      Provide: "provide",
      Embody: "embody",
    })
  }
})

function arithmetic(type, data) {
  return { operation: "arithmetic", type, left: data[0], right: data[4] }
}

function primitive(type, data) {
  return { operation: "primitive", type, ...data }
}

function position(data) {
  return { line: data[0].line, col: data[0].col }
}

var grammar = {
    Lexer: lexer,
    ParserRules: [
    {"name": "Program$ebnf$1", "symbols": []},
    {"name": "Program$ebnf$1$subexpression$1", "symbols": ["UseStatement", "_"], "postprocess": id},
    {"name": "Program$ebnf$1", "symbols": ["Program$ebnf$1", "Program$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Program$ebnf$2", "symbols": []},
    {"name": "Program$ebnf$2$subexpression$1", "symbols": ["Main", "_"], "postprocess": id},
    {"name": "Program$ebnf$2", "symbols": ["Program$ebnf$2", "Program$ebnf$2$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Program$ebnf$3$subexpression$1", "symbols": ["ProvideStatement", "_"], "postprocess": id},
    {"name": "Program$ebnf$3", "symbols": ["Program$ebnf$3$subexpression$1"], "postprocess": id},
    {"name": "Program$ebnf$3", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Program", "symbols": ["_", "Program$ebnf$1", "Program$ebnf$2", "Program$ebnf$3"], "postprocess": d => ({ uses: d[1], program: d[2], provides: d[3] })},
    {"name": "Main", "symbols": ["VariableDeclaration"], "postprocess": id},
    {"name": "Main", "symbols": ["MainExpression"], "postprocess": id},
    {"name": "Main", "symbols": ["ForStatement"], "postprocess": id},
    {"name": "Main", "symbols": ["QuantityModifier"], "postprocess": id},
    {"name": "Main", "symbols": ["AssignStatement"], "postprocess": id},
    {"name": "Main", "symbols": ["IfStatement"], "postprocess": id},
    {"name": "Main", "symbols": ["Comment"], "postprocess": id},
    {"name": "Comment$ebnf$1", "symbols": []},
    {"name": "Comment$ebnf$1", "symbols": ["Comment$ebnf$1", /[^#]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Comment", "symbols": [{"literal":"#"}, "Comment$ebnf$1", {"literal":"#"}], "postprocess":  d => ({ 
          operation: "comment", 
          value: d[1]?.map(d => d.value).join(""),
          position: position(d)
        }) },
    {"name": "UseStatement$subexpression$1", "symbols": ["Array"], "postprocess": id},
    {"name": "UseStatement$subexpression$1", "symbols": [{"literal":"All"}], "postprocess": id},
    {"name": "UseStatement", "symbols": [{"literal":"use"}, "__", "UseStatement$subexpression$1", "__", {"literal":"from"}, "__", "String"], "postprocess":  d => ({ 
          operation: "use_statement", 
          use: d[2].values !== undefined ? d[2].values.map(u => u.value) : "All", 
          source: d[6].value,
          position: position(d)
        }) },
    {"name": "ProvideStatement", "symbols": [{"literal":"provide"}, "__", "MainExpression"], "postprocess": d => d[2]},
    {"name": "EmbodyStatement$ebnf$1$subexpression$1", "symbols": ["ArgumentList", "_"], "postprocess": id},
    {"name": "EmbodyStatement$ebnf$1", "symbols": ["EmbodyStatement$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "EmbodyStatement$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "EmbodyStatement", "symbols": [{"literal":"embody"}, "__", "Expression", "_", {"literal":"{"}, "EmbodyStatement$ebnf$1", {"literal":"}"}], "postprocess":  d => ({ 
          operation: "embody_statement", 
          name: d[2], 
          arguments: d[5]?.flat(Number.POSITIVE_INFINITY) || []
        }) },
    {"name": "IfStatement", "symbols": [{"literal":"if"}, "__", "MainExpression", "_", "FunctionCodeBlock"], "postprocess":  d => ({ 
          operation: "if_statement", 
          condition: d[2], 
          body: d[4].body,
          provides: d[4].provides,
          position: position(d)
        }) },
    {"name": "ForStatement", "symbols": [{"literal":"for"}, "__", "MainExpression", "__", {"literal":"as"}, "__", "identifier", "_", "CodeBlock"], "postprocess":  d => ({ 
          operation: "for_statement", 
          statement: d[2], 
          placeholder: d[6].value, 
          body: d[8],
          position: position(d) 
        }) },
    {"name": "QuantityModifier", "symbols": ["VariableReference", {"literal":"+"}, {"literal":"+"}], "postprocess": d => ({ operation: "quantity_modifier", type: "increment", statement: d[0] })},
    {"name": "QuantityModifier", "symbols": ["VariableReference", {"literal":"-"}, {"literal":"-"}], "postprocess": d => ({ operation: "quantity_modifier", type: "decrement", statement: d[0] })},
    {"name": "AssignStatement", "symbols": ["VariableReference", "_", {"literal":":"}, {"literal":"+"}, "_", "MainExpression"], "postprocess": d => ({ operation: "assign_statement", type: "increment", statement: d[0], value: d[5] })},
    {"name": "AssignStatement", "symbols": ["VariableReference", "_", {"literal":":"}, {"literal":"-"}, "_", "MainExpression"], "postprocess": d => ({ operation: "assign_statement", type: "decrement", statement: d[0], value: d[5] })},
    {"name": "AssignStatement", "symbols": ["VariableReference", "_", {"literal":":"}, {"literal":"*"}, "_", "MainExpression"], "postprocess": d => ({ operation: "assign_statement", type: "multiply", statement: d[0], value: d[5] })},
    {"name": "AssignStatement", "symbols": ["VariableReference", "_", {"literal":":"}, {"literal":"/"}, "_", "MainExpression"], "postprocess": d => ({ operation: "assign_statement", type: "divide", statement: d[0], value: d[5] })},
    {"name": "VariableDeclaration", "symbols": ["variable_type", {"literal":":"}, "identifier", "__", "MainExpression"], "postprocess":  d => ({ 
          operation: "variable_definition", 
          sort: d[0],
          name: d[2].value, 
          value: d[4],
        }) },
    {"name": "IndexGetter", "symbols": ["MainExpression", {"literal":"<"}, "MainExpression", {"literal":">"}], "postprocess": d => ({ operation: "index_statement", source: d[0], index: d[2] })},
    {"name": "Expression", "symbols": ["Primitive"], "postprocess": id},
    {"name": "Expression", "symbols": ["FunctionCall"], "postprocess": id},
    {"name": "Expression", "symbols": ["VariableReference"], "postprocess": id},
    {"name": "Expression", "symbols": ["IndexGetter"], "postprocess": id},
    {"name": "Expression", "symbols": ["EmbodyStatement"], "postprocess": id},
    {"name": "VariableReference", "symbols": ["identifier"], "postprocess":  d => ({ 
          operation: "reference", 
          value: d[0].value,
          position: { line: d[0].line, col: d[0].col }
        }) },
    {"name": "FunctionCall$ebnf$1$subexpression$1", "symbols": ["ArgumentList", "_"], "postprocess": id},
    {"name": "FunctionCall$ebnf$1", "symbols": ["FunctionCall$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "FunctionCall$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "FunctionCall", "symbols": ["Expression", "_", {"literal":"("}, "FunctionCall$ebnf$1", {"literal":")"}], "postprocess":  d => ({ 
          operation: "function_call", 
          name: d[0], 
          arguments: d[3]?.flat(Number.POSITIVE_INFINITY) || []
        }) },
    {"name": "FunctionCall", "symbols": [{"literal":"&"}, "Expression"], "postprocess":  d => ({ 
          operation: "function_call", 
          name: d[1], 
          arguments: [],
        }) },
    {"name": "MainExpression", "symbols": ["MainExpression", "_", {"literal":"+"}, "_", "MultDiv"], "postprocess": d => arithmetic("addition", d)},
    {"name": "MainExpression", "symbols": ["MainExpression", "_", {"literal":"-"}, "_", "MultDiv"], "postprocess": d => arithmetic("subtraction", d)},
    {"name": "MainExpression", "symbols": ["MultDiv"], "postprocess": id},
    {"name": "MultDiv", "symbols": ["MultDiv", "_", {"literal":"*"}, "_", "Exp"], "postprocess": d => arithmetic("multiplication", d)},
    {"name": "MultDiv", "symbols": ["MultDiv", "_", {"literal":"/"}, "_", "Exp"], "postprocess": d => arithmetic("division", d)},
    {"name": "MultDiv", "symbols": ["Exp"], "postprocess": id},
    {"name": "Exp", "symbols": ["Expression", "_", {"literal":"^"}, "_", "Exp"], "postprocess": d => arithmetic("exponent", d)},
    {"name": "Exp", "symbols": ["Expression"], "postprocess": id},
    {"name": "ArgumentList", "symbols": ["MainExpression", "_", {"literal":","}, "_", "ArgumentList"], "postprocess": d => [d[0], d[4]]},
    {"name": "ArgumentList", "symbols": ["MainExpression"], "postprocess": d => [d[0]]},
    {"name": "KeyedArgumentList", "symbols": ["String", "_", {"literal":":"}, "_", "MainExpression", "_", {"literal":","}, "_", "KeyedArgumentList"], "postprocess": d => [{ key: d[0], value: d[4] }, d[8]]},
    {"name": "KeyedArgumentList", "symbols": ["String", "_", {"literal":":"}, "_", "MainExpression"], "postprocess": d => [{ key: d[0], value: d[4] }]},
    {"name": "ParameterList$ebnf$1", "symbols": [{"literal":"?"}], "postprocess": id},
    {"name": "ParameterList$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "ParameterList", "symbols": ["variable_type", "__", "identifier", "ParameterList$ebnf$1", "_", {"literal":","}, "_", "ParameterList"], "postprocess":  d => [
          { sort: d[0], value: d[2].value, isOptional: d[3] !== null }, 
          d[7]
        ] },
    {"name": "ParameterList$ebnf$2", "symbols": [{"literal":"?"}], "postprocess": id},
    {"name": "ParameterList$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "ParameterList", "symbols": ["variable_type", "__", "identifier", "ParameterList$ebnf$2"], "postprocess":  d => [
          { sort: d[0], value: d[2].value, isOptional: d[3] !== null }
        ] },
    {"name": "Primitive", "symbols": ["Number"], "postprocess": id},
    {"name": "Primitive", "symbols": ["String"], "postprocess": id},
    {"name": "Primitive", "symbols": ["Record"], "postprocess": id},
    {"name": "Primitive", "symbols": ["Array"], "postprocess": id},
    {"name": "Primitive", "symbols": ["Function"], "postprocess": id},
    {"name": "Primitive", "symbols": ["Boolean"], "postprocess": id},
    {"name": "Primitive", "symbols": ["Ark"], "postprocess": id},
    {"name": "CodeBlock$ebnf$1", "symbols": []},
    {"name": "CodeBlock$ebnf$1$subexpression$1", "symbols": ["Main", "_"], "postprocess": id},
    {"name": "CodeBlock$ebnf$1", "symbols": ["CodeBlock$ebnf$1", "CodeBlock$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "CodeBlock", "symbols": [{"literal":"{"}, "_", "CodeBlock$ebnf$1", {"literal":"}"}], "postprocess": d => d[2] || []},
    {"name": "FunctionCodeBlock$ebnf$1", "symbols": []},
    {"name": "FunctionCodeBlock$ebnf$1$subexpression$1", "symbols": ["Main", "_"], "postprocess": id},
    {"name": "FunctionCodeBlock$ebnf$1", "symbols": ["FunctionCodeBlock$ebnf$1", "FunctionCodeBlock$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "FunctionCodeBlock$ebnf$2$subexpression$1", "symbols": ["ProvideStatement", "_"], "postprocess": id},
    {"name": "FunctionCodeBlock$ebnf$2", "symbols": ["FunctionCodeBlock$ebnf$2$subexpression$1"], "postprocess": id},
    {"name": "FunctionCodeBlock$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "FunctionCodeBlock", "symbols": [{"literal":"{"}, "_", "FunctionCodeBlock$ebnf$1", "FunctionCodeBlock$ebnf$2", {"literal":"}"}], "postprocess": d => ({ body: d[2] || [], provides: d[3] })},
    {"name": "Ark", "symbols": [{"literal":"Ark"}, {"literal":"{"}, "Program", {"literal":"}"}], "postprocess": d => primitive("Ark", { ...d[2] })},
    {"name": "Array$ebnf$1$subexpression$1", "symbols": ["ArgumentList", "_"], "postprocess": id},
    {"name": "Array$ebnf$1", "symbols": ["Array$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "Array$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Array", "symbols": [{"literal":"["}, "Array$ebnf$1", {"literal":"]"}], "postprocess":  d => primitive("Array", { 
          values: d[1]?.flat(Number.POSITIVE_INFINITY) || [],
          position: { line: d[0].line, col: d[0].col }
        }) },
    {"name": "Record$ebnf$1$subexpression$1", "symbols": ["KeyedArgumentList", "_"], "postprocess": id},
    {"name": "Record$ebnf$1", "symbols": ["Record$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "Record$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Record", "symbols": [{"literal":"{"}, "_", "Record$ebnf$1", {"literal":"}"}], "postprocess":  d => primitive("Record", { 
          values: d[2]?.flat(Number.POSITIVE_INFINITY) || [],
          position: { line: d[0].line, col: d[0].col }
        }) },
    {"name": "Function$ebnf$1$subexpression$1", "symbols": ["ParameterList", "_"], "postprocess": id},
    {"name": "Function$ebnf$1", "symbols": ["Function$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "Function$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Function", "symbols": [{"literal":"("}, "Function$ebnf$1", {"literal":")"}, "_", "FunctionCodeBlock"], "postprocess":  d => primitive("Function", { 
          parameters: d[1]?.flat(Number.POSITIVE_INFINITY) || [],
          body: d[4].body,
          provides: d[4].provides,
          position: { line: d[0].line, col: d[0].col }
        }) },
    {"name": "Boolean", "symbols": [{"literal":"true"}], "postprocess": d => primitive("Boolean", { value: "true" })},
    {"name": "Boolean", "symbols": [{"literal":"false"}], "postprocess": d => primitive("Boolean", { value: "false" })},
    {"name": "Number", "symbols": [(lexer.has("NumberLiteral") ? {type: "NumberLiteral"} : NumberLiteral)], "postprocess":  d => primitive(d[0].value.includes(".") ? "Double" : "Int", { 
          value: d[0].value,
          position: { line: d[0].line, col: d[0].col } 
        })  },
    {"name": "String", "symbols": [(lexer.has("StringLiteral") ? {type: "StringLiteral"} : StringLiteral)], "postprocess":  d => primitive("String", { 
        value: d[0].value,
        position: { line: d[0].line, col: d[0].col }
        }) },
    {"name": "variable_type", "symbols": [(lexer.has("VariableType") ? {type: "VariableType"} : VariableType)], "postprocess": d => ({ type: d[0].value, position: position(d) })},
    {"name": "variable_type", "symbols": [{"literal":"Function"}, {"literal":"."}, "variable_type"], "postprocess": d => ({ type: "Function", of: d[2], position: position(d) })},
    {"name": "variable_type", "symbols": [{"literal":"Record"}, {"literal":"."}, "variable_type"], "postprocess": d => ({ type: "Record", of: d[2], position: position(d) })},
    {"name": "variable_type", "symbols": [{"literal":"Array"}, {"literal":"."}, "variable_type"], "postprocess": d => ({ type: "Array", of: d[2], position: position(d) })},
    {"name": "identifier", "symbols": [(lexer.has("Identifier") ? {type: "Identifier"} : Identifier)], "postprocess": id},
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", /[\s]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": (d) =>  null},
    {"name": "__$ebnf$1", "symbols": [/[\s]/]},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", /[\s]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "__", "symbols": ["__$ebnf$1"], "postprocess": (d) =>  null}
]
  , ParserStart: "Program"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
