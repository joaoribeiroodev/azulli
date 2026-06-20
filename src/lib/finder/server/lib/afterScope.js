'use strict';

let activeScope = null;

function beginAfterScope() {
  const scope = { tasks: [] };
  activeScope = scope;
  return scope;
}

function endAfterScope() {
  activeScope = null;
}

function scheduleAfter(task) {
  if (activeScope) {
    activeScope.tasks.push(task);
    return;
  }
  setImmediate(task);
}

module.exports = { beginAfterScope, endAfterScope, scheduleAfter };
