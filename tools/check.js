/*
      Static checks for AutoIntegrate PJSR sources.

      - Syntax check: PJSR preprocessor directives (#include, #ifdef, ...) are
        handled and the result is parsed as plain JavaScript.
      - Member check: calls and property reads like this.foo(), this.engine.foo(),
        engine.foo or this.engine.enhancements.foo are checked against methods
        and properties defined in the target class. Catches missed renames when
        code is moved between modules.

      Usage: node tools/check.js [file.js ...]   (default: all *.js in repo root)
      Exit code is 1 if any problem is found.
*/

"use strict";

const fs = require("fs");
const path = require("path");
const walk = require("acorn-walk");
const { parseFile, memberName, isClass, thisClass, enclosingMethod } = require("./preprocess");

const repoRoot = path.resolve(__dirname, "..");

// Names that always refer to an instance of a known class, as a plain
// variable (engine.X) or as a property of any object (this.engine.X).
const knownObjects = {
      global: ["AutoIntegrateGlobal"],
      util: ["AutoIntegrateUtil"],
      flowchart: ["AutoIntegrateFlowchart"],
      engine: ["AutoIntegrateEngine"],
};

// Methods available on every object.
const objectMethods = new Set(Object.getOwnPropertyNames(Object.prototype));

function newClassInfo(name, file) {
      return { name: name, file: file, superName: null, members: new Set(), owned: new Map() };
}

function main() {
      let files = process.argv.slice(2);
      if (files.length === 0) {
            files = fs.readdirSync(repoRoot).filter(f => f.endsWith(".js")).map(f => path.join(repoRoot, f));
      }
      files = files.map(f => path.resolve(f));

      const problems = [];
      const asts = [];

      // Parse
      for (const file of files) {
            try {
                  asts.push({ file: file, ast: parseFile(file).ast });
            } catch (e) {
                  problems.push(path.relative(repoRoot, file) + ":" + (e.loc ? e.loc.line : "?") + ": syntax error: " + e.message);
            }
      }

      // Collect classes, members and owned objects (this.name = new Class)
      const classes = new Map();
      const getClass = (name, file) => {
            if (!classes.has(name)) {
                  classes.set(name, newClassInfo(name, file));
            }
            return classes.get(name);
      };

      for (const { file, ast } of asts) {
            walk.ancestor(ast, {
                  ClassDeclaration(node) {
                        const info = getClass(node.id.name, file);
                        info.superName = node.superClass && node.superClass.type === "Identifier" ? node.superClass.name : null;
                        for (const el of node.body.body) {
                              if ((el.type === "MethodDefinition" || el.type === "PropertyDefinition") && el.key) {
                                    info.members.add(el.key.name || String(el.key.value));
                              }
                        }
                  },
                  AssignmentExpression(node, ancestors) {
                        if (node.left.type !== "MemberExpression" || node.left.object.type !== "ThisExpression") {
                              return;
                        }
                        const name = memberName(node.left);
                        const cls = thisClass(ancestors);
                        if (name === null || !cls) {
                              return;
                        }
                        const info = getClass(cls.id.name, file);
                        info.members.add(name);
                        if (node.right.type === "NewExpression" && node.right.callee.type === "Identifier") {
                              if (!info.owned.has(name)) {
                                    info.owned.set(name, new Set());
                              }
                              info.owned.get(name).add(node.right.callee.name);
                        }
                  }
            });
      }

      // Returns true if member is found, false if not, null if unknown (non-local base class)
      function classHasMember(className, member) {
            let info = classes.get(className);
            while (info) {
                  if (info.members.has(member)) {
                        return true;
                  }
                  if (!info.superName || info.superName === "Object") {
                        return objectMethods.has(member);
                  }
                  if (!classes.has(info.superName)) {
                        return null;
                  }
                  info = classes.get(info.superName);
            }
            return null;
      }

      // Resolve an object expression to class names, or null if unknown
      function makeResolver() {
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
            const resolve = (obj, ancestors) => {
                  let result = null;
                  if (obj.type === "ThisExpression") {
                        const cls = thisClass(ancestors);
                        result = cls ? [cls.id.name] : null;
                  } else if (obj.type === "Identifier") {
                        if (knownObjects[obj.name]) {
                              result = knownObjects[obj.name];
                        } else {
                              const method = enclosingMethod(ancestors);
                              const cls = method && ancestors.slice().reverse().find(isClass);
                              if (cls && selfNames(method).has(obj.name)) {
                                    result = [cls.id.name];
                              }
                        }
                  } else if (obj.type === "MemberExpression" && !obj.computed) {
                        const name = obj.property.name;
                        if (knownObjects[name]) {
                              result = knownObjects[name];
                        } else {
                              const owners = resolve(obj.object, ancestors);
                              const set = new Set();
                              for (const o of owners || []) {
                                    const info = classes.get(o);
                                    for (const c of (info && info.owned.get(name)) || []) {
                                          set.add(c);
                                    }
                              }
                              result = set.size > 0 ? [...set] : null;
                        }
                  }
                  if (result) {
                        result = result.filter(c => classes.has(c));
                  }
                  return result && result.length > 0 ? result : null;
            };
            return resolve;
      }

      // Members assigned from outside the class (obj.member = ...)
      for (const { ast } of asts) {
            const resolve = makeResolver();
            walk.ancestor(ast, {
                  AssignmentExpression(node, ancestors) {
                        if (node.left.type !== "MemberExpression" || node.left.object.type === "ThisExpression") {
                              return;
                        }
                        const name = memberName(node.left);
                        const targets = name !== null && resolve(node.left.object, ancestors.concat([node.left]));
                        for (const c of targets || []) {
                              classes.get(c).members.add(name);
                        }
                  }
            });
      }

      // Check member references
      for (const { file, ast } of asts) {
            const resolve = makeResolver();
            walk.ancestor(ast, {
                  MemberExpression(node, ancestors) {
                        const member = memberName(node);
                        if (member === null) {
                              return;
                        }
                        const parent = ancestors[ancestors.length - 2];
                        if (parent.type === "AssignmentExpression" && parent.left === node) {
                              return;
                        }
                        const targets = resolve(node.object, ancestors);
                        if (!targets) {
                              return;
                        }
                        let found = false;
                        let unknown = false;
                        for (const t of targets) {
                              const r = classHasMember(t, member);
                              if (r === true) {
                                    found = true;
                              } else if (r === null) {
                                    unknown = true;
                              }
                        }
                        if (!found && !unknown) {
                              const obj = node.object;
                              const what = obj.type === "ThisExpression" ? "this"
                                         : obj.type === "Identifier" ? obj.name : memberName(obj);
                              problems.push(path.relative(repoRoot, file) + ":" + node.loc.start.line + ": " +
                                            what + "." + member + " not found in " + targets.join(", "));
                        }
                  }
            });
      }

      for (const p of problems) {
            console.log(p);
      }
      console.log(files.length + " files checked, " + problems.length + " problems");
      process.exit(problems.length > 0 ? 1 : 0);
}

main();
