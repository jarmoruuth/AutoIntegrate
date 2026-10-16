/*
      List methods of a class in a line range and where they are referenced from.
      Helps decide which methods to move when splitting a module.

      Usage: node tools/methodrefs.js <file.js> <class> <firstline> <lastline>

      For each method defined in the range, prints references from outside the
      range: same class (this.X) and other files (engine.X etc.). Methods with
      no outside references are only used within the range.
*/

"use strict";

const fs = require("fs");
const path = require("path");
const walk = require("acorn-walk");
const { parseFile } = require("./preprocess");

const repoRoot = path.resolve(__dirname, "..");

function parse(file) {
      return parseFile(file).ast;
}

function main() {
      if (process.argv.length < 6) {
            console.log("Usage: node tools/methodrefs.js <file.js> <class> <firstline> <lastline>");
            process.exit(2);
      }
      const file = path.resolve(process.argv[2]);
      const className = process.argv[3];
      const first = parseInt(process.argv[4]);
      const last = parseInt(process.argv[5]);

      // Methods in range
      const methods = new Map();    // name -> { line, refs: [] }
      walk.simple(parse(file), {
            ClassDeclaration(node) {
                  if (node.id.name !== className) {
                        return;
                  }
                  for (const el of node.body.body) {
                        if (el.type === "MethodDefinition" && el.loc.start.line >= first && el.loc.start.line <= last) {
                              methods.set(el.key.name, { line: el.loc.start.line, refs: [] });
                        }
                  }
            }
      });

      // References
      const files = fs.readdirSync(repoRoot).filter(f => f.endsWith(".js")).map(f => path.join(repoRoot, f));
      for (const f of files) {
            const same = path.resolve(f) === file;
            walk.simple(parse(f), {
                  MemberExpression(node) {
                        if (node.computed || !methods.has(node.property.name)) {
                              return;
                        }
                        const line = node.loc.start.line;
                        if (same && line >= first && line <= last) {
                              return;
                        }
                        const obj = node.object;
                        const objTxt = obj.type === "ThisExpression" ? "this"
                                     : obj.type === "Identifier" ? obj.name
                                     : obj.type === "MemberExpression" && !obj.computed ? obj.property.name : "?";
                        methods.get(node.property.name).refs.push(path.basename(f) + ":" + line + " " + objTxt);
                  }
            });
      }

      for (const [name, info] of methods) {
            console.log(info.line + " " + name + (info.refs.length ? "" : "  (range only)"));
            for (const r of info.refs) {
                  console.log("        " + r);
            }
      }
}

main();
