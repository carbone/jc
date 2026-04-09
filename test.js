// Micro test harness — zero dependencies
var T = {
  passed: 0,
  failed: 0,
  errors: [],
  currentGroup: '',

  assert: function(condition, msg) {
    if (!condition) throw new Error(msg || 'Assertion failed');
  },

  assertEqual: function(actual, expected, msg) {
    if (actual !== expected) {
      throw new Error((msg || 'assertEqual') + ': expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
    }
  },

  assertClose: function(actual, expected, tolerance, msg) {
    if (Math.abs(actual - expected) > tolerance) {
      throw new Error((msg || 'assertClose') + ': expected ~' + expected + ' (±' + tolerance + '), got ' + actual);
    }
  },

  assertDeepEqual: function(actual, expected, msg) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error((msg || 'assertDeepEqual') + ': expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
    }
  },

  group: function(name) {
    T.currentGroup = name;
    var el = document.getElementById('results');
    if (el) {
      var h = document.createElement('h3');
      h.textContent = name;
      el.appendChild(h);
    }
  },

  run: function(name, fn) {
    var fullName = T.currentGroup ? T.currentGroup + ' > ' + name : name;
    try {
      fn();
      T.passed++;
      T._log(fullName, true);
    } catch (e) {
      T.failed++;
      T.errors.push({ name: fullName, error: e.message });
      T._log(fullName, false, e.message);
    }
  },

  _log: function(name, passed, errMsg) {
    var el = document.getElementById('results');
    if (el) {
      var div = document.createElement('div');
      div.className = passed ? 'pass' : 'fail';
      div.textContent = (passed ? '\u2705 ' : '\u274C ') + name;
      if (errMsg) {
        var span = document.createElement('span');
        span.className = 'error-detail';
        span.textContent = ' — ' + errMsg;
        div.appendChild(span);
      }
      el.appendChild(div);
    }
    console[passed ? 'log' : 'error']((passed ? 'PASS' : 'FAIL') + ': ' + name + (errMsg ? ' — ' + errMsg : ''));
  },

  report: function() {
    var total = T.passed + T.failed;
    var summary = T.passed + '/' + total + ' passed' + (T.failed ? ', ' + T.failed + ' FAILED' : '');
    console.log('\n' + summary);
    var el = document.getElementById('summary');
    if (el) {
      el.textContent = summary;
      el.className = T.failed ? 'fail' : 'pass';
    }
  }
};

// ============================================================
// Phase 0: Canary tests
// ============================================================
T.group('Phase 0: Scaffold');

T.run('harness works', function() {
  T.assert(true, 'basic assertion');
});

T.run('turf.js loaded', function() {
  T.assert(typeof turf !== 'undefined', 'turf global exists');
  T.assert(typeof turf.buffer === 'function', 'turf.buffer is a function');
});

T.run('SetbackApp namespace exists', function() {
  T.assert(typeof SetbackApp !== 'undefined', 'SetbackApp exists');
  T.assert(typeof SetbackApp.geo === 'object', 'geo module exists');
  T.assert(typeof SetbackApp.api === 'object', 'api module exists');
  T.assert(typeof SetbackApp.layers === 'object', 'layers module exists');
});

// ============================================================
// Run report
// ============================================================
T.report();
