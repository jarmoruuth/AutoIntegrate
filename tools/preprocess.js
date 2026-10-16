/*
      Minimal PJSR preprocessor and parser for static checks.

      Keeps the active #ifdef/#ifndef/#else branch, replaces directive lines and
      inactive lines with spaces and inline macros like #__FILE__ with a string
      literal. Character offsets are preserved, so AST positions can be used to
      edit the original source.
*/

"use strict";

const fs = require("fs");
const acorn = require("acorn");

function blank(line) {
      return line.replace(/\S/g, " ");
}

function preprocess(src, defines) {
      defines = new Set(defines);
      const stack = [];       // { active, taken }
      let active = true;
      return src.split("\n").map(line => {
            const m = line.match(/^\s*#\s*(\w+)\s*(\w*)/);
            if (!m) {
                  if (!active) {
                        return blank(line);
                  }
                  return line.replace(/#__\w+__/g, s => '""' + " ".repeat(s.length - 2));
            }
            const directive = m[1];
            const name = m[2];
            if (directive === "ifdef" || directive === "ifndef") {
                  const cond = directive === "ifdef" ? defines.has(name) : !defines.has(name);
                  stack.push({ active: active, taken: cond });
                  active = active && cond;
            } else if (directive === "else") {
                  const top = stack[stack.length - 1];
                  active = top.active && !top.taken;
            } else if (directive === "endif") {
                  active = stack.pop().active;
            } else if (directive === "define" && active) {
                  defines.add(name);
            } else if (directive === "undef" && active) {
                  defines.delete(name);
            }
            return blank(line);
      }).join("\n");
}

// Returns { src, ast }, src is the original source.
function parseFile(file, defines = []) {
      const src = fs.readFileSync(file, "utf8");
      const ast = acorn.parse(preprocess(src, defines), { ecmaVersion: "latest", sourceType: "script", locations: true });
      return { src, ast };
}

function memberName(node) {
      if (node.computed) {
            return node.property.type === "Literal" ? String(node.property.value) : null;
      }
      return node.property.name;
}

function isClass(n) {
      return n.type === "ClassDeclaration" || n.type === "ClassExpression";
}

// Class node that "this" refers to at the last node in ancestors, or null if
// unknown (inside a non-arrow function that is not a method).
function thisClass(ancestors) {
      for (let i = ancestors.length - 2; i >= 0; i--) {
            const a = ancestors[i];
            if (a.type === "FunctionExpression" || a.type === "FunctionDeclaration") {
                  const parent = ancestors[i - 1];
                  if (parent && parent.type === "MethodDefinition") {
                        return ancestors.slice(0, i).reverse().find(isClass);
                  }
                  return null;
            }
            if (a.type === "PropertyDefinition" || a.type === "StaticBlock") {
                  return ancestors.slice(0, i).reverse().find(isClass);
            }
      }
      return null;
}

function enclosingMethod(ancestors) {
      for (let i = ancestors.length - 2; i >= 0; i--) {
            if (ancestors[i].type === "MethodDefinition") {
                  return ancestors[i];
            }
      }
      return null;
}

module.exports = { preprocess, parseFile, memberName, isClass, thisClass, enclosingMethod };
