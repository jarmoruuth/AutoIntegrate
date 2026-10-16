/*
      Move methods from one class into a new module class, without changing
      behaviour. Used to split AutoIntegrateEngine into smaller modules.

      Usage:
        node tools/movemethods.js <source.js> <SourceClass> <Target.js> <TargetClass> <prop> <methods.txt> [title]

      - methods.txt lists method names to move, one per line (# comments allowed).
      - The new class is created as "this.<prop> = new <TargetClass>(...)" in the
        source class constructor (added by hand), and gets global, util, flowchart
        and the source object as "engine".
      - Inside moved methods "this.X" becomes "this.engine.X" unless X is a moved
        method or one of global, util, flowchart, par, ppar. Bare "this" becomes
        "this.engine". State always stays in the source object.
      - In the source class "this.X" becomes "this.<prop>.X" for moved methods.
      - In all repo files "engine.X" and "<obj>.engine.X" become
        "engine.<prop>.X" / "<obj>.engine.<prop>.X" for moved methods.

      Run tools/check.js afterwards.
*/

"use strict";

const fs = require("fs");
const path = require("path");
const walk = require("acorn-walk");
const { parseFile, memberName, isClass, thisClass, enclosingMethod } = require("./preprocess");

const repoRoot = path.resolve(__dirname, "..");
const ownMembers = new Set(["global", "util", "flowchart", "par", "ppar"]);

function fail(msg) {
      console.error("ERROR: " + msg);
      process.exit(1);
}

// Apply edits [{start, end, text}] to src between [from, to)
function applyEdits(src, from, to, edits) {
      const list = edits.filter(e => e.start >= from && e.end <= to).sort((a, b) => a.start - b.start);
      let out = "";
      let pos = from;
      for (const e of list) {
            if (e.start < pos) {
                  fail("overlapping edits at offset " + e.start);
            }
            out += src.substring(pos, e.start) + e.text;
            pos = e.end;
      }
      return out + src.substring(pos, to);
}

function lineEnd(src, offset) {
      const i = src.indexOf("\n", offset);
      return i < 0 ? src.length : i + 1;
}

function main() {
      const args = process.argv.slice(2);
      if (args.length < 6) {
            console.log("Usage: node tools/movemethods.js <source.js> <SourceClass> <Target.js> <TargetClass> <prop> <methods.txt> [title]");
            process.exit(2);
      }
      const [sourceFileArg, sourceClass, targetFileArg, targetClass, prop, methodsFile] = args;
      const title = args[6] || targetClass;
      const sourceFile = path.resolve(sourceFileArg);
      const targetFile = path.resolve(targetFileArg);
      if (fs.existsSync(targetFile)) {
            fail(targetFile + " already exists");
      }
      const moved = new Set(fs.readFileSync(methodsFile, "utf8").split(/\r?\n/)
                                    .map(l => l.replace(/#.*/, "").trim()).filter(l => l));

      const files = fs.readdirSync(repoRoot).filter(f => f.endsWith(".js")).map(f => path.resolve(repoRoot, f));
      const parsed = new Map(files.map(f => [f, parseFile(f)]));
      const { src, ast } = parsed.get(sourceFile);

      // Find source class and chunks of moved methods
      let classNode = null;
      walk.simple(ast, {
            ClassDeclaration(node) {
                  if (node.id.name === sourceClass) {
                        classNode = node;
                  }
            }
      });
      if (!classNode) {
            fail("class " + sourceClass + " not found");
      }
      const chunks = [];      // { name, start, end, node }
      const body = classNode.body.body;
      for (let i = 0; i < body.length; i++) {
            const el = body[i];
            if (el.type !== "MethodDefinition" || !moved.has(el.key.name)) {
                  continue;
            }
            // Chunk includes leading comments and blank lines after the previous element
            const start = i > 0 ? lineEnd(src, body[i - 1].end) : lineEnd(src, classNode.body.start);
            const end = lineEnd(src, el.end);
            const text = src.substring(start, end);
            if (/^\s*#/m.test(text)) {
                  fail("preprocessor directive in method " + el.key.name);
            }
            chunks.push({ name: el.key.name, start: start, end: end, node: el });
      }
      for (const name of moved) {
            if (!chunks.find(c => c.name === name)) {
                  fail("method " + name + " not found in " + sourceClass);
            }
      }
      const inChunk = (node) => chunks.some(c => node.start >= c.node.start && node.end <= c.node.end);

      const edits = new Map(files.map(f => [f, []]));
      const warnings = [];
      const loc = (f, node) => path.basename(f) + ":" + node.loc.start.line;

      // Edits in source class
      const selfNamesCache = new Map();
      const selfNames = (method) => {
            if (!selfNamesCache.has(method)) {
                  const names = new Set();
                  walk.simple(method, {
                        VariableDeclarator(d) {
                              if (d.init && d.init.type === "ThisExpression" && d.id.type === "Identifier") {
                                    names.add(d.id.name);
                              }
                        }
                  });
                  selfNamesCache.set(method, names);
            }
            return selfNamesCache.get(method);
      };
      const isSourceThis = (ancestors) => {
            const cls = thisClass(ancestors);
            return cls === classNode;
      };

      walk.ancestor(ast, {
            ThisExpression(node, ancestors) {
                  if (!inChunk(node) || !isSourceThis(ancestors)) {
                        return;
                  }
                  const parent = ancestors[ancestors.length - 2];
                  if (parent.type === "MemberExpression" && parent.object === node) {
                        return;     // handled in MemberExpression
                  }
                  if (parent.type === "VariableDeclarator" && parent.init === node) {
                        return;     // self alias, handled in MemberExpression
                  }
                  edits.get(sourceFile).push({ start: node.start, end: node.end, text: "this.engine" });
                  warnings.push(loc(sourceFile, node) + ": bare this changed to this.engine");
            },
            MemberExpression(node, ancestors) {
                  const member = memberName(node);
                  if (member === null) {
                        return;
                  }
                  const obj = node.object;
                  let isThis = false;
                  if (obj.type === "ThisExpression") {
                        isThis = isSourceThis(ancestors);
                  } else if (obj.type === "Identifier") {
                        const method = enclosingMethod(ancestors);
                        isThis = method && ancestors.find(isClass) === classNode && selfNames(method).has(obj.name);
                  }
                  if (!isThis) {
                        return;
                  }
                  const objText = src.substring(obj.start, obj.end);
                  if (inChunk(node)) {
                        if (!moved.has(member) && !ownMembers.has(member)) {
                              edits.get(sourceFile).push({ start: obj.start, end: obj.end, text: objText + ".engine" });
                        }
                  } else if (moved.has(member)) {
                        edits.get(sourceFile).push({ start: obj.start, end: obj.end, text: objText + "." + prop });
                        const parent = ancestors[ancestors.length - 2];
                        if (parent.type === "MemberExpression" && ["bind", "call", "apply"].includes(memberName(parent))) {
                              warnings.push(loc(sourceFile, node) + ": " + member + "." + memberName(parent) + " needs manual check");
                        }
                  }
            }
      });

      // Edits for engine.X references in all files
      for (const f of files) {
            walk.ancestor(parsed.get(f).ast, {
                  MemberExpression(node, ancestors) {
                        const member = memberName(node);
                        if (member === null || !moved.has(member)) {
                              return;
                        }
                        const obj = node.object;
                        const isEngine = (obj.type === "Identifier" && obj.name === "engine") ||
                                         (obj.type === "MemberExpression" && !obj.computed && obj.property.name === "engine");
                        if (!isEngine) {
                              return;
                        }
                        const fsrc = parsed.get(f).src;
                        edits.get(f).push({ start: obj.start, end: obj.end, text: fsrc.substring(obj.start, obj.end) + "." + prop });
                        const parent = ancestors[ancestors.length - 2];
                        if (parent.type === "MemberExpression" && ["bind", "call", "apply"].includes(memberName(parent))) {
                              warnings.push(loc(f, node) + ": " + member + "." + memberName(parent) + " needs manual check");
                        }
                  }
            });
      }

      // Build new source file without the moved chunks
      const srcEdits = edits.get(sourceFile);
      let newSrc = "";
      let pos = 0;
      let movedText = "";
      for (const c of chunks) {
            newSrc += applyEdits(src, pos, c.start, srcEdits);
            movedText += applyEdits(src, c.start, c.end, srcEdits);
            pos = c.end;
      }
      newSrc += applyEdits(src, pos, src.length, srcEdits);

      const guard = path.basename(targetFile, ".js").toUpperCase() + "_JS";
      const year = new Date().getFullYear();
      const target =
`/*
      ${title}

      Copyright (c) 2018-${year} Jarmo Ruuth.

*/

#ifndef ${guard}
#define ${guard}

class ${targetClass} extends Object
{

constructor(global, util, flowchart, engine) {
      super();
      this.global = global;
      this.util = util;
      this.flowchart = flowchart;
      this.engine = engine;
      this.par = global.par;
      this.ppar = global.ppar;
}
${movedText.replace(/\s+$/, "")}

} // class ${targetClass}

#endif  /* ${guard} */
`;

      const eol = src.includes("\r\n") ? "\r\n" : "\n";

      fs.writeFileSync(sourceFile, newSrc);
      fs.writeFileSync(targetFile, target.replace(/\r?\n/g, eol));
      for (const f of files) {
            if (f !== sourceFile && edits.get(f).length > 0) {
                  const fsrc = parsed.get(f).src;
                  fs.writeFileSync(f, applyEdits(fsrc, 0, fsrc.length, edits.get(f)));
            }
      }

      for (const w of warnings) {
            console.log("WARNING: " + w);
      }
      let summary = chunks.length + " methods moved to " + path.basename(targetFile);
      for (const f of files) {
            if (edits.get(f).length > 0) {
                  summary += "\n  " + path.basename(f) + ": " + edits.get(f).length + " references updated";
            }
      }
      console.log(summary);
}

main();
